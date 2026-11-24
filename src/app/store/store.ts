/**
 * Dashboard store. One reactive state for the shell (boards, sheets, toasts, history) plus one
 * `{cfg, data}` section per placement. Ported from the prototype component (design/claude-design/Main.dc.html).
 * Components get it through `useDash()` (provide/inject); widgets read their own section through `useWidget()`.
 *
 * IDs: registry entries are keyed by kind (`links`); everything a placement owns — layout entries, settings, records,
 * the saved section `w:<配置ID>` — is keyed by placement ID (`links`, `links#2`). See `registry/instances.ts`.
 * Saving: see the header of `persist.ts` (versions, locked sections, writing only changed sections).
 */
import { computed, reactive, watch, type ComputedRef, type WatchStopHandle } from 'vue';
import { REGISTRY, fieldDefault, type FieldValue, type Size, type WidgetDef } from '../registry/registry';
import { defOf, isInstanceId, kindOf, nameOf, nextInstanceId, sortInstances } from '../registry/instances';
import { computeLayout, isFullScreen, sizeOf, type Layout, type Pin } from '../layout/layout';
import { ACCENTS, defaultGlobal, defaultUi, renumber } from './defaults';
import {
  EXPORT_FORMAT, EXPORT_VERSION, GLOBAL_KEY, GLOBAL_VERSION, SECTION_VERSION, WIDGET_KEY_PREFIX, parseGlobalSection,
  parseWidgetSection, readGlobal, readWidget, sanitizeCfg, sanitizeGlobal, widgetKey,
  type LockReason, type SectionStore, type WidgetSection,
} from './persist';
import { checkField, envelopeHeader } from './validate';
import type { RecordStore } from './records';
import type { DialogSpec, GlobalSection, GlobalSettings, Panel, Toast, ToastAct, ToastKind, UiState, WidgetCfg, WidgetDataDef } from './types';

export type { WidgetDataDef } from './types';

export type Env = {
  width: number;
  height: number;
  fontScale: number;
  sat: number;
  sab: number;
  prefersDark: boolean;
  finePointer: boolean;
};

export type DashOptions = Readonly<{
  store: SectionStore;
  /** Record definitions keyed by kind (`WIDGET_DATA`). */
  dataDefs: Readonly<Record<string, WidgetDataDef<unknown>>>;
  now?: () => number;
  /** Timer hooks (tests). */
  setTimeout?: (fn: () => void, ms: number) => unknown;
  /**
   * Kinds that have an implementation (`Object.keys(WIDGETS)`). Other kinds are listed and can be opened, but show
   * 「準備中」 and are not placed (review #9). Omitted: every kind counts as implemented (store-only tests).
   */
  implemented?: Iterable<string>;
  /** 非同期の記録の保存先 for large records (`createRecords(idbBackend())`, review #7). Omitted: none (null). */
  records?: RecordStore;
}>;

/**
 * Everything a reading (import) replaces, taken before it is applied: the global section, every placement's settings
 * and record, the saved bytes of every section (locked ones included) and the shared undo history (review #3).
 */
export type SectionSnapshot = Readonly<{
  g: string;
  cfg: string;
  data: string;
  bytes: ReadonlyMap<string, string>;
  saved: Readonly<Record<string, string>>;
  pending: ReadonlyMap<string, string>;
  locked: ReadonlyMap<string, { reason: LockReason; raw: unknown }>;
  hist: readonly string[];
  page: number;
}>;

/** 「人前では隠す」 of one placement: its own setting, else the kind's default `priv` (仕様書 3章; not `vd`). */
export function veilSetting(cfg: Readonly<Record<string, unknown>> | undefined, def: Pick<WidgetDef, 'priv'> | undefined): boolean {
  const c = cfg?.veil;
  return typeof c === 'boolean' ? c : !!def?.priv;
}

/** Prefix of every key the dashboard saves (`lgd.v1:global`, `lgd.v1:w:<配置ID>`). */
const KEY_PREFIX = 'lgd.v1:';

/** Result of reading a file or the clipboard (実装ガイド 5章). Nothing changes unless `ok`. */
export type ImportResult = { ok: true } | { ok: false; reason: string };

/**
 * Result of saving the export file: `saved` = the user picked a place and the file was written
 * (`showSaveFilePicker`); `started` = a download was started (completion cannot be confirmed); `cancel`; `fail`.
 */
export type SaveResult = 'saved' | 'started' | 'cancel' | 'fail';
export type FileSaver = (json: string, filename: string) => SaveResult | Promise<SaveResult>;

/** User-facing reasons for a rejected import. */
export const IMPORT_REASONS: Readonly<Record<'format' | LockReason, string>> = {
  format: '読み込めるデータではありません',
  future: '新しい版で書き出したデータのため読み込めません',
  broken: 'データの一部が壊れているため読み込めません',
  migrate: '古い形式の記録を移せないため読み込めません',
};

const HIST_KEYS = ['off', 'place', 'groups', 'order', 'sizes', 'gs', 'pins', 'lockSz', 'pgW'] as const;
/** Kinds whose records are part of undo history (項目: habit, links). */
const HIST_DATA_KINDS: readonly string[] = ['habit', 'links'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

type ImportPlan = { ok: true; g: GlobalSection; sections: Record<string, WidgetSection> } | { ok: false; reason: string };

export class Dashboard {
  readonly g: GlobalSection;
  readonly ui: UiState;
  readonly cfg: Record<string, WidgetCfg>;
  readonly data: Record<string, unknown>;
  readonly env: Env;
  readonly layout: ComputedRef<Layout>;
  readonly dark: ComputedRef<boolean>;
  /** All placement IDs in registry order, then by number (DOM order of the widgets). */
  readonly ids: ComputedRef<string[]>;
  readonly now: () => number;
  /** 非同期の記録の保存先 (大きな記録、`records.ts`). Null until the app passes one (used from P2). */
  readonly records: RecordStore | null;
  private readonly store: SectionStore;
  private readonly defs: Readonly<Record<string, WidgetDataDef<unknown>>>;
  private readonly later: (fn: () => void, ms: number) => unknown;
  private toastSeq = 0;
  private hist: string[] = [];
  private histSig = '';
  private histLast = 0;
  private undoing = false;
  /** Per key: the serialization last read (load baseline) or written. A section is written only when it differs. */
  private saved: Record<string, string> = {};
  /** Writes that failed (quota…); retried on the next write. */
  private pending = new Map<string, string>();
  private saveFailing = false;
  /** Keys never written this session (newer or broken sections); value = the parsed saved JSON, if any. */
  private locked = new Map<string, { reason: LockReason; raw: unknown }>();
  private toastHold = false;
  private readonly ready: ReadonlySet<string> | null;
  /** Called when the active screen changes; the shell scrolls the pager. */
  onGo: ((page: number, smooth: boolean) => void) | null = null;
  /** Saves the export file (set by `main.ts`; see `SaveResult`). */
  onExport: FileSaver | null = null;

  constructor(opts: DashOptions) {
    this.now = opts.now ?? (() => Date.now());
    this.store = opts.store;
    this.defs = opts.dataDefs;
    this.later = opts.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
    this.ready = opts.implemented ? new Set(opts.implemented) : null;
    this.records = opts.records ?? null;
    const t = this.now();
    const gr = readGlobal(this.store, t);
    const global = gr.state === 'ok' ? gr.value : defaultGlobal(t);
    if (gr.state === 'locked') this.locked.set(GLOBAL_KEY, { reason: gr.reason, raw: gr.raw });
    const cfg: Record<string, WidgetCfg> = {};
    const data: Record<string, unknown> = {};
    for (const id of global.order) {
      const def = this.dataDefOf(id);
      const r = readWidget(this.store, id, def, t);
      if (r.state === 'locked') this.locked.set(widgetKey(id), { reason: r.reason, raw: r.raw });
      cfg[id] = r.state === 'ok' ? r.value.cfg : {};
      if (def) data[id] = r.state === 'ok' ? r.value.data : def.initial(t);
    }
    this.g = reactive(global);
    this.cfg = reactive(cfg);
    this.data = reactive(data);
    this.ui = reactive({ ...defaultUi(t), tour: global.tourDone ? -1 : 0 });
    this.env = reactive<Env>({ width: 1440, height: 900, fontScale: 1, sat: 0, sab: 0, prefersDark: false, finePointer: true });
    this.ids = computed(() => sortInstances(this.g.order));
    this.layout = computed(() => computeLayout(
      { width: this.env.width, height: this.env.height, fontScale: this.env.fontScale, sat: this.env.sat, sab: this.env.sab },
      { dens: this.g.gs.dens, groups: this.g.groups, place: this.g.place, order: this.g.order, off: this.g.off, pins: this.g.pins, sizes: this.g.sizes, pgW: this.g.pgW },
    ));
    this.dark = computed(() => this.g.gs.theme === 'dark' || (this.g.gs.theme === null && this.env.prefersDark));
    this.histSig = this.histSignature();
    // Baseline: what was loaded counts as saved, so only sections changed from now on are written.
    this.saved[GLOBAL_KEY] = this.serializeGlobal();
    for (const id of this.g.order) this.saved[widgetKey(id)] = this.serializeWidget(id);
    if (this.locked.size) this.toast('この版では読めない保存データがあります。上書きせずに残しています', 'warn');
  }

  /** Starts persistence/history watchers (one per section). Call once from the root component. */
  start(): () => void {
    const per = new Map<string, WatchStopHandle>();
    const watchSection = (id: string): void => {
      if (per.has(id)) return;
      // immediate: a placement added later (no baseline yet) gets its section written right away.
      // Only placements in the order are written (one dropped by undoing a reading keeps the bytes restored for it).
      per.set(id, watch(() => this.serializeWidget(id), v => { if (this.g.order.includes(id)) this.write(widgetKey(id), v); this.track(); }, { immediate: true }));
    };
    const stops = [
      watch(() => this.serializeGlobal(), v => { this.write(GLOBAL_KEY, v); this.track(); }),
      watch(() => [...this.g.order], ids => { ids.forEach(watchSection); }, { immediate: true }),
    ];
    return () => { stops.forEach(s => { s(); }); per.forEach(s => { s(); }); per.clear(); };
  }

  // ---------- settings ----------
  /** Record definition of a placement (by its kind: `links#2` → links). */
  dataDefOf(id: string): WidgetDataDef<unknown> | undefined {
    return this.defs[kindOf(id)];
  }
  cfgOf(id: string, key: string): FieldValue | undefined {
    const c = this.cfg[id];
    const v = c?.[key];
    if (v !== undefined) return v;
    return REGISTRY[kindOf(id)] ? fieldDefault(kindOf(id), key) : undefined;
  }
  /**
   * Sets one setting of a placement after the same check used for restoring and importing (`checkField`).
   * Returns false (and changes nothing) for an invalid value or an unknown placement/setting.
   */
  setCfg(id: string, key: string, v: FieldValue): boolean {
    if (!isInstanceId(id)) return false;
    const ok = checkField(kindOf(id), key, v);
    if (ok === undefined) return false;
    this.cfg[id] = { ...(this.cfg[id] ?? {}), [key]: ok };
    return true;
  }
  setG<K extends keyof GlobalSettings>(key: K, v: GlobalSettings[K]): void {
    this.g.gs[key] = v;
  }
  dataOf<T>(id: string): T {
    return this.data[id] as T;
  }
  setData<T>(id: string, v: T): void {
    this.data[id] = v;
  }
  accent(): readonly [string, string, string] {
    return ACCENTS[this.g.gs.acc] ?? ACCENTS[0] ?? ['#2f6f9f', '#82b8de', 'ブルー'];
  }
  /** CSS custom properties derived from global settings (実装ガイド 3章「利用者設定から決まる値」). */
  rootVars(): Record<string, string> {
    const v = this.g.gs.glass / 100;
    const a = this.accent();
    const blur = (6 + 26 * v).toFixed(1);
    return {
      '--a1': 'light-dark(' + a[0] + ', ' + a[1] + ')',
      '--glass': 'light-dark(rgba(255,255,255,' + (0.78 - 0.48 * v).toFixed(3) + '), rgba(255,255,255,' + (0.09 - 0.06 * v).toFixed(3) + '))',
      '--blur': blur + 'px',
      '--bf': v > 0 ? 'blur(' + blur + 'px) saturate(180%)' : 'none',
      '--rad': String(this.g.gs.rad) + 'px',
      '--sat': String(this.env.sat) + 'px',
      '--sab': String(this.env.sab) + 'px',
    };
  }

  // ---------- widgets ----------
  isOn(id: string): boolean {
    return !this.g.off[id];
  }
  pgOn(id: string): boolean {
    return isFullScreen(this.g, id);
  }
  sizeOf(id: string): Size {
    return sizeOf(this.g, id);
  }
  /** 「人前では隠す」 setting of a placement (see `veilSetting`). */
  veilOf(id: string): boolean {
    return veilSetting(this.cfg[id], defOf(id));
  }
  /**
   * Hidden now (仕様書 3章「人前では隠す」): 「中身を隠す」 is on, the placement hides in public and was not shown with
   * 「表示する」. Takes precedence everywhere: board, front view, temporary use, full screen, state overlay, 1×1 notices.
   */
  veiled(id: string): boolean {
    return this.g.gs.veil && !this.ui.peek[id] && this.veilOf(id);
  }
  /** The kind has an implementation (see `DashOptions.implemented`); other kinds show 「準備中」 (review #9). */
  isReady(kind: string): boolean {
    return this.ready ? this.ready.has(kind) : kind in REGISTRY;
  }
  /** `.w` class modifiers (prototype `k[id]`). */
  frameClass(id: string): string {
    const u = this.ui;
    const tmp = u.temp === id && u.big === id;
    const hidden = (this.g.off[id] || this.pgOn(id)) && !tmp;
    const big = u.big === id && (tmp || !this.g.off[id]);
    const veil = this.veiled(id);
    return [hidden ? 'off' : '', big ? 'big' : '', tmp ? 'tmp' : '', veil ? 'veil' : ''].filter(Boolean).join(' ');
  }
  boardName(gi: number): string {
    return this.g.groups[gi]?.n ?? '';
  }
  /** Screen label: 「ボード 1」, 「ボード 1の2」/「ボード 1-2」 for boards spanning screens, or the kind name of a full-screen view. */
  screenLabel(i: number, sep: 'の' | '-'): string {
    const L = this.layout.value;
    const full = L.full[i];
    if (full) return nameOf(full);
    const gi = Math.max(0, L.phys[i] ?? 0);
    const f = L.first[gi] ?? 0;
    const many = L.phys.filter(x => x === gi).length > 1;
    const n = this.boardName(gi);
    return many ? n + sep + String(i - f + 1) : n;
  }

  // ---------- screens ----------
  get pageCount(): number {
    return this.layout.value.total;
  }
  get page(): number {
    return Math.min(this.ui.page, this.pageCount - 1);
  }
  go(i: number, smooth = true): void {
    const p = Math.max(0, Math.min(this.pageCount - 1, i));
    this.ui.page = p;
    this.onGo?.(p, smooth);
  }
  next(): void { this.go(this.page + 1); }
  prev(): void { this.go(this.page - 1); }
  homeIndex(): number {
    const gi = this.g.groups.findIndex(g => g.id === this.g.gs.home);
    return gi > 0 ? this.layout.value.first[gi] ?? 0 : 0;
  }
  goHome(): void { this.go(this.homeIndex()); }

  // ---------- panels / layers (仕様書 7章) ----------
  openPanel(p: Panel, extra: Partial<UiState> = {}): void {
    Object.assign(this.ui, { panel: p, ...extra });
  }
  /** × : back to where the sheet was opened from (board or edit mode). */
  closePanel(): void {
    Object.assign(this.ui, { panel: 'none', sel: null, ret: null });
  }
  /** 戻る: close only the top layer. */
  back(): void {
    const u = this.ui;
    // Menus close first; a dialog closes as キャンセル (仕様書 7章「重なりと戻り先」).
    if (u.mn) { Object.assign(u, { mn: null, mnQ: '', mnAt: null }); return; }
    if (u.dlg) { this.dialogCancel(); return; }
    if (u.dlg) { u.dlg = null; return; }
    if (u.tour >= 0) { u.tour = -1; this.g.tourDone = true; return; }
    if (u.mn) { u.mn = null; return; }
    if (u.big) {
      const ret = u.temp && u.ret ? u.ret : u.panel;
      Object.assign(u, { big: null, temp: null, ret: null, panel: ret });
      return;
    }
    if (u.panel === 'help') { u.panel = 'global'; return; }
    if (u.panel === 'devices') { u.panel = u.devFrom === 'global' ? 'global' : 'none'; return; }
    if (u.panel === 'add') { u.panel = u.addFrom === 'index' ? 'index' : 'none'; return; }
    if (u.panel !== 'none') { u.panel = 'none'; u.sel = null; return; }
    if (u.edit) { u.edit = false; u.sel = null; }
  }
  toggleEdit(): void {
    const on = !this.ui.edit;
    Object.assign(this.ui, { edit: on, sel: null, panel: 'none', mn: null });
  }
  /** Open a widget: move to it if placed, else use it without placing (一時利用). */
  openWidget(id: string): void {
    const pos = this.layout.value.pos[id];
    if (!this.g.off[id] && pos) { Object.assign(this.ui, { panel: 'none', flash: id }); this.go(pos.page); }
    else Object.assign(this.ui, { big: id, temp: id, panel: 'none', ret: null, sel: null });
  }

  // ---------- toasts (仕様書 5章) ----------
  toast(text: string, kind: ToastKind = 'info', act: ToastAct | null = null): number {
    const id = ++this.toastSeq;
    this.ui.toasts = [...this.ui.toasts, { id, text, kind, act }].slice(-3);
    const fade = (): void => {
      if (this.toastHold) { this.later(fade, 800); return; }
      this.ui.toasts = this.ui.toasts.map(x => (x.id === id ? { ...x, out: true } : x));
      this.later(() => { this.dropToast(id); }, 220);
    };
    const secs = Number(this.cfgOf('toast', 'dur')) || 3;
    this.later(fade, act ? 10000 : secs * 1000);
    return id;
  }
  /** Progress toast replaced by a completion toast in place. */
  busy(text: string, ms: number, doneText: string): void {
    const id = ++this.toastSeq;
    this.ui.toasts = [...this.ui.toasts, { id, text, kind: 'info' as const, act: null, spin: true } satisfies Toast].slice(-3);
    this.later(() => { this.dropToast(id); this.toast(doneText, 'ok'); }, ms);
  }
  dropToast(id: number): void {
    this.ui.toasts = this.ui.toasts.filter(x => x.id !== id);
  }
  holdToasts(on: boolean): void { this.toastHold = on; }

  // ---------- dialog ----------
  confirm(spec: DialogSpec): void { this.ui.dlg = spec; }
  dialogOk(): void {
    const d = this.ui.dlg;
    this.ui.dlg = null;
    d?.onOk?.();
  }
  dialogCancel(): void {
    const d = this.ui.dlg;
    this.ui.dlg = null;
    if (d?.two) this.toast('キャンセルしました', 'info');
  }

  // ---------- undo (仕様書 7章「元に戻すの履歴」) ----------
  get canUndo(): boolean { return this.hist.length > 0; }
  /** Snapshot-based undo with a toast action; used by destructive layout changes. */
  undoable(text: string): void {
    this.toast(text, 'info', { label: '元に戻す', fn: () => { this.undo(); } });
  }
  undo(): void {
    const prev = this.hist.pop();
    if (prev === undefined) { this.toast('戻せる変更はありません', 'info'); return; }
    this.histLast = 0;
    if (prev === this.histSig) return;
    this.undoing = true;
    this.restoreSignature(prev);
    this.toast('元に戻しました', 'info');
  }
  private histSignature(): string {
    const o: Record<string, unknown> = {};
    for (const k of HIST_KEYS) o[k] = this.g[k];
    o.cfg = this.cfg;
    for (const id of this.g.order) if (HIST_DATA_KINDS.includes(kindOf(id))) o['d:' + id] = this.data[id];
    return JSON.stringify(o);
  }
  private restoreSignature(sig: string): void {
    const o = JSON.parse(sig) as Record<string, unknown>;
    const g = sanitizeGlobal({ ...this.g, ...o }, this.now());
    for (const k of HIST_KEYS) (this.g as Record<string, unknown>)[k] = g[k];
    const cfg = (o.cfg ?? {}) as Record<string, unknown>;
    for (const id of this.g.order) this.cfg[id] = sanitizeCfg(id, cfg[id]);
    for (const id of this.g.order) {
      const def = this.dataDefOf(id);
      const raw = o['d:' + id];
      if (def && raw !== undefined) this.data[id] = def.sanitize(raw, this.now()) ?? def.initial(this.now());
    }
  }
  private track(): void {
    const sig = this.histSignature();
    if (sig === this.histSig) return;
    if (this.undoing) { this.undoing = false; this.histSig = sig; return; }
    const t = this.now();
    if (!(this.histLast && t - this.histLast < 700)) {
      this.hist.push(this.histSig);
      if (this.hist.length > 40) this.hist.shift();
    }
    this.histLast = t;
    this.histSig = sig;
  }

  // ---------- placement ----------
  /** Remove from board (未配置). */
  unplace(id: string): void {
    this.g.off = { ...this.g.off, [id]: true };
    const pins = { ...this.g.pins };
    delete pins[id];
    this.g.pins = pins;
    this.undoable(nameOf(id) + ' をボードから外しました');
  }
  place(id: string, groupId: string): void {
    const off = { ...this.g.off };
    delete off[id];
    this.g.off = off;
    this.g.place = { ...this.g.place, [id]: groupId };
  }
  setSize(id: string, s: Size): void { this.g.sizes = { ...this.g.sizes, [id]: s }; }
  setPin(id: string, p: Pin | null): void {
    const pins = { ...this.g.pins };
    if (p) pins[id] = p; else delete pins[id];
    this.g.pins = pins;
  }
  /**
   * Creates another placement of `kind` (`links#2`) on board `gid` (default: the first board) and returns its ID.
   * Refused (null) for unknown kinds and for kinds with `multi: false`, whose only placement is the kind ID itself.
   * The UI for this (「ここにも置く」) and shared records (`share`) are P3; records are independent by default.
   */
  addInstance(kind: string, gid?: string): string | null {
    const def = REGISTRY[kind];
    if (!def?.multi) return null;
    const taken = [...this.g.order];
    try { for (const k of this.store.keys()) if (k.startsWith(WIDGET_KEY_PREFIX)) taken.push(k.slice(WIDGET_KEY_PREFIX.length)); } catch { /* ignore */ }
    const id = nextInstanceId(kind, taken);
    const board = gid !== undefined && this.g.groups.some(g => g.id === gid) ? gid : this.g.groups[0]?.id ?? 'g0';
    const dd = this.dataDefOf(id);
    this.cfg[id] = {};
    if (dd) this.data[id] = dd.initial(this.now());
    this.g.order = [...this.g.order, id];
    this.g.place = { ...this.g.place, [id]: board };
    return id;
  }
  addBoard(): string {
    const id = 'g' + String(this.now().toString(36));
    this.g.groups = renumber([...this.g.groups, { id, n: '' }]);
    return id;
  }

  // ---------- persistence ----------
  private serializeGlobal(): string {
    return JSON.stringify({ v: GLOBAL_VERSION, ...this.g });
  }
  private serializeWidget(id: string): string {
    const def = this.dataDefOf(id);
    const d = this.data[id];
    const saved = def?.toSaved ? def.toSaved(d, k => this.cfgOf(id, k)) : d;
    return JSON.stringify(def ? { v: SECTION_VERSION, dv: def.version, cfg: this.cfg[id] ?? {}, data: saved } : { v: SECTION_VERSION, cfg: this.cfg[id] ?? {} });
  }
  /** Keys kept read-only this session (newer or broken sections). */
  lockedKeys(): string[] {
    return [...this.locked.keys()];
  }
  private write(key: string, value: string): void {
    if (this.locked.has(key)) return;
    if (this.saved[key] === value) this.pending.delete(key);
    else this.pending.set(key, value);
    if (this.pending.size) this.flush();
  }
  /** Writes every pending section; a failed one stays pending and is retried on the next write. */
  private flush(): void {
    let failed = false;
    for (const [key, value] of [...this.pending]) {
      try {
        this.store.set(key, value);
        this.saved[key] = value;
        this.pending.delete(key);
      } catch {
        failed = true;
      }
    }
    if (failed && !this.saveFailing) {
      this.toast('容量がいっぱいで保存できません', 'warn', { label: 'ファイルに保存', fn: () => { void this.exportFile(); } });
    }
    this.saveFailing = failed;
  }
  /** Whole export (実装ガイド 5章). Credentials/keys are never included. Locked sections are exported as saved. */
  exportJson(): string {
    const widgets: Record<string, unknown> = {};
    for (const id of this.g.order) {
      const lk = this.locked.get(widgetKey(id));
      if (lk) { if (lk.raw !== undefined) widgets[id] = lk.raw; continue; }
      widgets[id] = JSON.parse(this.serializeWidget(id)) as unknown;
    }
    const lg = this.locked.get(GLOBAL_KEY);
    const global = lg?.raw !== undefined ? lg.raw : JSON.parse(this.serializeGlobal()) as unknown;
    return JSON.stringify({ format: EXPORT_FORMAT, v: EXPORT_VERSION, global, widgets });
  }
  /**
   * Checks the whole file first (envelope `format`/`v`, the global section's `v`, every widget section's `v`/`dv` and
   * records); nothing is applied unless everything is usable. Within supported versions unknown items are dropped and
   * missing ones fall back to defaults; sections of kinds this build does not know are skipped.
   */
  private planImport(text: string): ImportPlan {
    const fail = (r: keyof typeof IMPORT_REASONS): ImportPlan => ({ ok: false, reason: IMPORT_REASONS[r] });
    let o: unknown;
    try { o = JSON.parse(text); } catch { return fail('format'); }
    const env = envelopeHeader.safeParse(o);
    if (!env.success) {
      const newer = isObj(o) && o.format === EXPORT_FORMAT && typeof o.v === 'number' && o.v > EXPORT_VERSION;
      return fail(newer ? 'future' : 'format');
    }
    if (env.data.v > EXPORT_VERSION) return fail('future');
    const t = this.now();
    const g = parseGlobalSection(env.data.global, t);
    if (!g.ok) return fail(g.reason);
    const sections: Record<string, WidgetSection> = {};
    for (const [id, raw] of Object.entries(env.data.widgets)) {
      if (!isInstanceId(id)) continue;
      const p = parseWidgetSection(id, raw, this.dataDefOf(id), t);
      if (!p.ok) return fail(p.reason);
      sections[id] = p.value;
    }
    return { ok: true, g: g.value, sections };
  }
  /** Validates the whole file, then applies it (see `planImport`). Returns why it was refused. */
  importJson(text: string): ImportResult {
    const plan = this.planImport(text);
    if (!plan.ok) return plan;
    const t = this.now();
    const g = plan.g;
    // Records of placements missing from the imported order are kept (unplaced) instead of being dropped.
    const extra = Object.keys(plan.sections).filter(id => !g.order.includes(id));
    if (extra.length) {
      g.order = [...g.order, ...extra];
      g.off = { ...g.off, ...Object.fromEntries(extra.map(id => [id, true])) };
      g.place = { ...g.place, ...Object.fromEntries(extra.map(id => [id, g.groups[0]?.id ?? 'g0'])) };
    }
    Object.assign(this.g, g);
    for (const id of g.order) {
      const sec = plan.sections[id];
      this.cfg[id] = sec?.cfg ?? {};
      const def = this.dataDefOf(id);
      if (def) this.data[id] = sec ? sec.data : def.initial(t);
    }
    // The file replaces what was saved: sections that were locked become writable and are written.
    // Written now: a watcher fires only when the in-memory value changes, which it may not (defaults in both).
    if (this.locked.delete(GLOBAL_KEY)) { delete this.saved[GLOBAL_KEY]; this.write(GLOBAL_KEY, this.serializeGlobal()); }
    for (const id of g.order) {
      const key = widgetKey(id);
      if (this.locked.delete(key)) { delete this.saved[key]; this.write(key, this.serializeWidget(id)); }
    }
    // The shared history is about the replaced state; a reading is undone with its own snapshot (`restoreSnapshot`).
    this.resetHistory([]);
    return { ok: true };
  }
  /** See `SectionSnapshot`. Take it right before `importJson`; `restoreSnapshot` undoes the reading. */
  snapshot(): SectionSnapshot {
    const bytes = new Map<string, string>();
    try {
      for (const k of this.store.keys()) {
        if (!k.startsWith(KEY_PREFIX)) continue;
        const v = this.store.get(k);
        if (v !== null) bytes.set(k, v);
      }
    } catch { /* storage unavailable: only the in-memory state is restored */ }
    return {
      g: JSON.stringify(this.g), cfg: JSON.stringify(this.cfg), data: JSON.stringify(this.data),
      bytes, saved: { ...this.saved }, pending: new Map(this.pending), locked: new Map(this.locked),
      hist: [...this.hist], page: this.ui.page,
    };
  }
  /**
   * Puts back what `snapshot` took: the state in memory, the saved bytes of every section as they were (sections the
   * reading created are removed; locked sections get their original bytes), and the shared history before the reading.
   * The restored state is the saved state, so nothing is written afterwards unless it differs.
   */
  restoreSnapshot(s: SectionSnapshot): void {
    const replace = (target: Record<string, unknown>, json: string): void => {
      const src = JSON.parse(json) as Record<string, unknown>;
      for (const k of Object.keys(target)) if (!(k in src)) delete target[k];
      Object.assign(target, src);
    };
    Object.assign(this.g, JSON.parse(s.g) as GlobalSection);
    replace(this.cfg, s.cfg);
    replace(this.data, s.data);
    try {
      for (const k of this.store.keys()) if (k.startsWith(KEY_PREFIX) && !s.bytes.has(k)) this.store.remove(k);
      for (const [k, v] of s.bytes) if (this.store.get(k) !== v) this.store.set(k, v);
      this.saveFailing = false;
    } catch {
      this.toast('容量がいっぱいで保存できません', 'warn', { label: 'ファイルに保存', fn: () => { void this.exportFile(); } });
    }
    this.saved = { ...s.saved };
    this.pending = new Map(s.pending);
    this.locked = new Map(s.locked);
    this.resetHistory(s.hist);
    this.go(s.page, false);
  }
  private resetHistory(hist: readonly string[]): void {
    this.hist = [...hist];
    this.histLast = 0;
    this.undoing = false;
    this.histSig = this.histSignature();
  }
  /** `dashboard-年月日.json` (実装ガイド 5章). */
  exportName(): string {
    const d = new Date(this.now());
    const p2 = (n: number): string => String(n).padStart(2, '0');
    return 'dashboard-' + String(d.getFullYear()) + p2(d.getMonth() + 1) + p2(d.getDate()) + '.json';
  }
  /**
   * ファイルに保存. 「保存しました」 and the last-export date only after the file was written (`saved`);
   * a plain download only reports that saving started (`started`), because its completion cannot be observed.
   * Cancel or failure leaves the last-export date unchanged.
   */
  async exportFile(): Promise<SaveResult> {
    let r: SaveResult = 'fail';
    const save = this.onExport;
    if (save) {
      try { r = await save(this.exportJson(), this.exportName()); } catch { r = 'fail'; }
    }
    if (r === 'saved' || r === 'started') {
      this.g.lastExp = this.now();
      this.toast(r === 'saved' ? '設定と記録をファイルに保存しました' : 'ファイルの保存を始めました', 'ok');
    } else if (r === 'fail') {
      this.toast('ファイルに保存できませんでした', 'warn');
    }
    return r;
  }
  /** 初期状態に戻す / ミニマル構成. */
  resetLayout(): void {
    const d = defaultGlobal(this.now());
    // Extra placements (`links#2`) stay, unplaced, so their records are kept (実装ガイド 7.5「外したウィジェットの区画は残し」).
    const extra = this.g.order.filter(id => !(id in REGISTRY));
    const first = d.groups[0]?.id ?? 'g0';
    Object.assign(this.g, {
      groups: d.groups,
      place: { ...d.place, ...Object.fromEntries(extra.map(id => [id, first])) },
      order: [...d.order, ...extra],
      sizes: {},
      off: { ...d.off, ...Object.fromEntries(extra.map(id => [id, true])) },
      pins: {}, lockSz: {}, pgW: {},
    });
    this.ui.page = 0;
  }
}
