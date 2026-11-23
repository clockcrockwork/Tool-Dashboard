/**
 * Dashboard store. One reactive state for the shell (boards, sheets, toasts, history) plus one
 * `{cfg, data}` section per widget. Ported from the prototype component (design/claude-design/Main.dc.html).
 * Components get it through `useDash()` (provide/inject); widgets read their own section only.
 */
import { computed, reactive, watch, type ComputedRef } from 'vue';
import { REGISTRY, fieldDefault, type FieldValue, type Size } from '../registry/registry';
import { computeLayout, isFullScreen, sizeOf, type Layout, type Pin } from '../layout/layout';
import { ACCENTS, defaultGlobal, defaultUi, renumber } from './defaults';
import { GLOBAL_KEY, WIDGET_KEY_PREFIX, SECTION_VERSION, readGlobal, readSection, sanitizeCfg, sanitizeGlobal, type SectionStore } from './persist';
import type { DialogSpec, GlobalSection, GlobalSettings, Panel, Toast, ToastAct, ToastKind, UiState, WidgetCfg } from './types';

/** Per-widget record definition (実装ガイド 4章 `store`). */
export type WidgetDataDef<T> = Readonly<{
  version: number;
  initial: (now: number) => T;
  /** Return null to fall back to `initial`. Unknown fields must be dropped. */
  sanitize: (raw: unknown, now: number) => T | null;
  /** Records excluded from saving (e.g. chat when 「会話を保存」 is off). */
  toSaved?: (data: T, cfg: (key: string) => FieldValue | undefined) => unknown;
}>;

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
  dataDefs: Readonly<Record<string, WidgetDataDef<unknown>>>;
  now?: () => number;
  /** Timer hooks (tests). */
  setTimeout?: (fn: () => void, ms: number) => unknown;
}>;

const HIST_KEYS = ['off', 'place', 'groups', 'order', 'sizes', 'gs', 'pins', 'lockSz', 'pgW'] as const;
/** Widget data that is part of undo history (項目: habit, links). */
const HIST_DATA = ['habit', 'links'] as const;

export class Dashboard {
  readonly g: GlobalSection;
  readonly ui: UiState;
  readonly cfg: Record<string, WidgetCfg>;
  readonly data: Record<string, unknown>;
  readonly env: Env;
  readonly layout: ComputedRef<Layout>;
  readonly dark: ComputedRef<boolean>;
  readonly now: () => number;
  private readonly store: SectionStore;
  private readonly defs: Readonly<Record<string, WidgetDataDef<unknown>>>;
  private readonly later: (fn: () => void, ms: number) => unknown;
  private toastSeq = 0;
  private hist: string[] = [];
  private histSig = '';
  private histLast = 0;
  private undoing = false;
  private saved: Record<string, string> = {};
  private toastHold = false;
  /** Called when the active screen changes; the shell scrolls the pager. */
  onGo: ((page: number, smooth: boolean) => void) | null = null;

  constructor(opts: DashOptions) {
    this.now = opts.now ?? (() => Date.now());
    this.store = opts.store;
    this.defs = opts.dataDefs;
    this.later = opts.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
    const t = this.now();
    const global = sanitizeGlobal(readGlobal(this.store), t);
    const cfg: Record<string, WidgetCfg> = {};
    const data: Record<string, unknown> = {};
    for (const id of Object.keys(REGISTRY)) {
      const sec = readSection(this.store, id);
      cfg[id] = sanitizeCfg(id, sec?.cfg);
      const def = this.defs[id];
      if (def) data[id] = (sec && sec.v <= SECTION_VERSION ? def.sanitize(sec.data, t) : null) ?? def.initial(t);
    }
    this.g = reactive(global);
    this.cfg = reactive(cfg);
    this.data = reactive(data);
    this.ui = reactive({ ...defaultUi(t), tour: global.tourDone ? -1 : 0 });
    this.env = reactive<Env>({ width: 1440, height: 900, fontScale: 1, sat: 0, sab: 0, prefersDark: false, finePointer: true });
    this.layout = computed(() => computeLayout(
      { width: this.env.width, height: this.env.height, fontScale: this.env.fontScale, sat: this.env.sat, sab: this.env.sab },
      { dens: this.g.gs.dens, groups: this.g.groups, place: this.g.place, order: this.g.order, off: this.g.off, pins: this.g.pins, sizes: this.g.sizes, pgW: this.g.pgW },
    ));
    this.dark = computed(() => this.g.gs.theme === 'dark' || (this.g.gs.theme === null && this.env.prefersDark));
    this.histSig = this.histSignature();
  }

  /** Starts persistence/history watchers. Call once from the root component. */
  start(): () => void {
    const stops = [
      watch(() => this.serializeGlobal(), v => { this.write(GLOBAL_KEY, v); this.track(); }),
      watch(() => Object.keys(REGISTRY).map(id => this.serializeWidget(id)), list => {
        Object.keys(REGISTRY).forEach((id, i) => { const v = list[i]; if (v !== undefined) this.write(WIDGET_KEY_PREFIX + id, v); });
        this.track();
      }),
    ];
    return () => { stops.forEach(s => { s(); }); };
  }

  // ---------- settings ----------
  cfgOf(id: string, key: string): FieldValue | undefined {
    const c = this.cfg[id];
    const v = c?.[key];
    return v !== undefined ? v : fieldDefault(id, key);
  }
  setCfg(id: string, key: string, v: FieldValue): void {
    this.cfg[id] = { ...(this.cfg[id] ?? {}), [key]: v };
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
  veilOf(id: string): boolean {
    const c = this.cfg[id]?.veil;
    return typeof c === 'boolean' ? c : !!REGISTRY[id]?.vd;
  }
  /** `.w` class modifiers (prototype `k[id]`). */
  frameClass(id: string): string {
    const u = this.ui;
    const tmp = u.temp === id && u.big === id;
    const hidden = (this.g.off[id] || this.pgOn(id)) && !tmp;
    const big = u.big === id && (tmp || !this.g.off[id]);
    const veil = this.g.gs.veil && !u.peek[id] && this.veilOf(id);
    return [hidden ? 'off' : '', big ? 'big' : '', tmp ? 'tmp' : '', veil ? 'veil' : ''].filter(Boolean).join(' ');
  }
  boardName(gi: number): string {
    return this.g.groups[gi]?.n ?? '';
  }
  /** Screen label: 「ボード 1」 or 「ボード 1の2」/「ボード 1-2」 for boards spanning screens. */
  screenLabel(i: number, sep: 'の' | '-'): string {
    const L = this.layout.value;
    const gi = L.phys[i] ?? 0;
    if (gi === -1) return '時計';
    if (gi === -2) return 'スケッチ';
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
    for (const id of HIST_DATA) o['d:' + id] = this.data[id];
    return JSON.stringify(o);
  }
  private restoreSignature(sig: string): void {
    const o = JSON.parse(sig) as Record<string, unknown>;
    const g = sanitizeGlobal({ ...this.g, ...o }, this.now());
    for (const k of HIST_KEYS) (this.g as Record<string, unknown>)[k] = g[k];
    const cfg = (o.cfg ?? {}) as Record<string, unknown>;
    for (const id of Object.keys(REGISTRY)) this.cfg[id] = sanitizeCfg(id, cfg[id]);
    for (const id of HIST_DATA) {
      const def = this.defs[id];
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
    this.undoable((REGISTRY[id]?.n ?? id) + ' をボードから外しました');
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
  addBoard(): string {
    const id = 'g' + String(this.now().toString(36));
    this.g.groups = renumber([...this.g.groups, { id, n: '' }]);
    return id;
  }

  // ---------- persistence ----------
  private serializeGlobal(): string {
    return JSON.stringify(this.g);
  }
  private serializeWidget(id: string): string {
    const def = this.defs[id];
    const d = this.data[id];
    const saved = def?.toSaved ? def.toSaved(d, k => this.cfgOf(id, k)) : d;
    return JSON.stringify({ v: SECTION_VERSION, cfg: this.cfg[id] ?? {}, data: saved });
  }
  private write(key: string, value: string): void {
    if (this.saved[key] === value) return;
    try {
      this.store.set(key, value);
      this.saved[key] = value;
    } catch {
      this.toast('容量がいっぱいで保存できません', 'warn', { label: 'ファイルに保存', fn: () => { this.exportFile(); } });
    }
  }
  /** Whole export (実装ガイド 5章). Credentials/keys are never included. */
  exportJson(): string {
    const widgets: Record<string, unknown> = {};
    for (const id of Object.keys(REGISTRY)) widgets[id] = JSON.parse(this.serializeWidget(id)) as unknown;
    return JSON.stringify({ format: 'lgd-dashboard', v: 1, global: this.g, widgets });
  }
  /** Validates per item and applies. Unknown items are dropped; missing ones fall back to defaults. */
  importJson(text: string): boolean {
    let o: unknown;
    try { o = JSON.parse(text); } catch { return false; }
    if (!o || typeof o !== 'object' || (o as { format?: unknown }).format !== 'lgd-dashboard') return false;
    const src = o as { global?: unknown; widgets?: Record<string, { cfg?: unknown; data?: unknown }> };
    const t = this.now();
    Object.assign(this.g, sanitizeGlobal(src.global, t));
    for (const id of Object.keys(REGISTRY)) {
      const w = src.widgets?.[id];
      this.cfg[id] = sanitizeCfg(id, w?.cfg);
      const def = this.defs[id];
      if (def) this.data[id] = def.sanitize(w?.data, t) ?? def.initial(t);
    }
    return true;
  }
  exportFile(): void {
    this.toast('設定と記録をファイルに保存しました', 'ok');
    this.g.lastExp = this.now();
    this.onExport?.(this.exportJson());
  }
  onExport: ((json: string) => void) | null = null;
  /** 初期状態に戻す / ミニマル構成. */
  resetLayout(): void {
    const d = defaultGlobal(this.now());
    Object.assign(this.g, { groups: d.groups, place: d.place, order: d.order, sizes: {}, off: d.off, pins: {}, lockSz: {}, pgW: {} });
    this.ui.page = 0;
  }
}
