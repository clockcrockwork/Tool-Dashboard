/**
 * Sheet operations (全体設定・一覧・追加・ウィジェットの設定・操作ヒント・端末をつなぐ).
 * Functions take the Dashboard so they stay testable without components. Ported from the prototype
 * `renderVals()` / `xVals()` (design/claude-design/Main.dc.html 4507–4720, 5125–5260, 5470–6010).
 */
import { reactive } from 'vue';
import { DEFAULT_ORDER, REGISTRY, REGISTRY_ORDER, STARTER, type FieldValue, type Size, type WidgetDef } from '../registry/registry';
import { defOf, kindOf, nameOf } from '../registry/instances';
import { defaultPlace, defaultSettings, fullGroups, renumber } from './defaults';
import { IMPORT_REASONS, type Dashboard } from './store';
import type { GlobalSettings } from './types';

// ---------------------------------------------------------------- search (仕様書 2章「ウィジェットを探す」)

/** Folds kana / width / case: NFKC, lower-case, katakana → hiragana. */
export function foldKana(t: string): string {
  return String(t).normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** All whitespace-separated words must appear in name, id, keywords or category. */
export function matchWidget(def: Pick<WidgetDef, 'id' | 'n' | 'kw' | 'cat'>, query: string): boolean {
  const q = foldKana(query).trim();
  if (!q) return true;
  const hay = foldKana(def.n + ' ' + def.id + ' ' + def.kw + ' ' + def.cat);
  return q.split(/\s+/).every(w => hay.includes(w));
}

export type CatalogGroup = { n: string; ids: string[] };

/** Catalog in fixed order; one 「検索結果」 group while searching. Empty only when nothing matches. */
export function catalogGroups(query: string, defs: Readonly<Record<string, WidgetDef>> = REGISTRY, order: readonly string[] = REGISTRY_ORDER): CatalogGroup[] {
  const searching = foldKana(query).trim() !== '';
  const out: CatalogGroup[] = [];
  for (const id of order) {
    const def = defs[id];
    if (!def || !matchWidget(def, query)) continue;
    const n = searching ? '検索結果' : def.cat;
    let g = out.find(x => x.n === n);
    if (!g) { g = { n, ids: [] }; out.push(g); }
    g.ids.push(id);
  }
  return out;
}

/** Remember a query that was used (max 5, newest first, no duplicates). */
export function pushHistory(hist: readonly string[], query: string): string[] {
  const q = query.trim();
  if (!q) return [...hist];
  return [q, ...hist.filter(x => x !== q)].slice(0, 5);
}

export function rememberQuery(d: Dashboard): void {
  const next = pushHistory(d.g.catHist, d.ui.catQ);
  if (next.join('\n') !== d.g.catHist.join('\n')) d.g.catHist = next;
}

/** Mark every registered widget as seen (called when 「ウィジェットを追加」 closes). */
export function markSeen(d: Dashboard): void {
  const all = Object.keys(REGISTRY);
  if (d.g.seenW.length !== all.length) d.g.seenW = all;
}

// ---------------------------------------------------------------- per-dashboard sheet state (not persisted here)

export type DeviceKind = 'phone' | 'pc' | 'tab';
export type PairedDevice = { id: string; n: string; type: DeviceKind; on: boolean; last: number };
export type NearbyDevice = { id: string; n: string; type: DeviceKind; tag: string };

export type SheetState = {
  /** Last selected widget, kept while the widget sheet fades out. */
  lastSel: string | null;
  /** Item whose icon picker is open. */
  pick: number | null;
  /** Fields the user has left once (errors show only after blur). */
  touched: Record<string, boolean>;
  /** Field input the check refused (`<id>.<key>` → value); shown with its error, never saved. */
  draft: Record<string, FieldValue>;
  bulkTx: string;
  /** DEV display test: environment override for 操作ヒント. */
  simEnv: '' | EnvKind;
  demo: 'ok' | 'load' | 'stale' | 'empty' | 'err';
  ai: { model: '軽量' | '標準' | '高品質'; engine: '自動' | 'GPU' | 'CPU' };
  // 端末をつなぐ (見本。実通信は P4)
  myName: string;
  devices: PairedDevice[];
  nearby: NearbyDevice[];
  pairMode: 'show' | 'enter';
  pairAt: number;
  pairCode: string;
  pairIn: string;
  pairMsg: string;
  recvAuto: boolean;
  lsOn: boolean;
  relay: string;
};

const states = new WeakMap<Dashboard, SheetState>();

function newPairCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

/** Sample data = prototype initial state (Main.dc.html 2245–2269). */
export function initialSheetState(now: number): SheetState {
  return {
    lastSel: null, pick: null, touched: {}, draft: {}, bulkTx: '', simEnv: '', demo: 'ok', ai: { model: '標準', engine: '自動' },
    myName: 'MacBook',
    devices: [
      { id: 'd1', n: 'iPhone', type: 'phone', on: true, last: now },
      { id: 'd2', n: '仕事用PC', type: 'pc', on: false, last: now - 3 * 3600000 },
    ],
    nearby: [
      { id: 'n1', n: 'Galaxy Tab', type: 'tab', tag: 'LocalSend' },
      { id: 'n2', n: 'Chrome（Linux）', type: 'pc', tag: 'ブラウザ' },
    ],
    pairMode: 'show', pairAt: now, pairCode: newPairCode(), pairIn: '', pairMsg: '',
    recvAuto: true, lsOn: true, relay: 'wss://relay.example.jp/v1',
  };
}

export function sheetState(d: Dashboard): SheetState {
  let s = states.get(d);
  if (!s) { s = reactive<SheetState>(initialSheetState(d.now())); states.set(d, s); }
  return s;
}

// ---------------------------------------------------------------- shared helpers

export function isWide(d: Dashboard): boolean {
  return d.env.width >= 720;
}

/** Board index of the current screen (full-screen screens count as board 0). */
export function currentBoard(d: Dashboard): number {
  const gi = d.layout.value.phys[d.page] ?? 0;
  return gi >= 0 ? gi : 0;
}

export function currentBoardId(d: Dashboard): string {
  return (d.g.groups[currentBoard(d)] ?? d.g.groups[0])?.id ?? 'g0';
}

/** Add target: `ui.tgt` if it still exists, else the current board. */
export function targetBoard(d: Dashboard): { id: string; n: string } {
  const g = d.g.groups;
  return g.find(x => x.id === d.ui.tgt) ?? g[currentBoard(d)] ?? g[0] ?? { id: 'g0', n: 'ボード 1' };
}

export function boardNameOf(d: Dashboard, gid: string): string {
  return (d.g.groups.find(x => x.id === gid) ?? d.g.groups[0])?.n ?? '';
}

/** Board a widget belongs to (falls back to the first board). */
export function boardOf(d: Dashboard, id: string): string {
  const p = d.g.place[id];
  return p && d.g.groups.some(x => x.id === p) ? p : d.g.groups[0]?.id ?? 'g0';
}

/** Ring a widget briefly (the overlays layer draws `.selring` and clears `ui.flash` after 1.6s). */
export function flashOn(d: Dashboard, id: string): void {
  d.ui.flash = id;
}

/** Move the screen to the widget if it moved to another screen (prototype `_follow`). */
export function follow(d: Dashboard, id: string): void {
  const p = d.layout.value.pos[id];
  if (p && p.page !== d.page) d.go(p.page);
}

/** Move to a placed widget and ring it. */
export function goToWidget(d: Dashboard, id: string): void {
  d.ui.panel = 'none';
  const p = d.layout.value.pos[id];
  if (p) d.go(p.page);
  flashOn(d, id);
}

/** Use without placing (一時利用); 戻る returns to 「ウィジェットを追加」. */
export function useWithoutPlacing(d: Dashboard, id: string): void {
  Object.assign(d.ui, { big: id, temp: id, panel: 'none', ret: 'add', sel: null });
}

/** Add (or move) a widget to a board. `stay` keeps the screen where it is. */
export function placeAt(d: Dashboard, id: string, gid: string, stay: boolean): void {
  const wasOff = !!d.g.off[id];
  const off = { ...d.g.off };
  delete off[id];
  d.g.off = off;
  d.g.place = { ...d.g.place, [id]: gid };
  d.g.order = [...d.g.order.filter(x => x !== id), id];
  if (!stay) follow(d, id);
  flashOn(d, id);
  d.undoable(nameOf(id) + ' を「' + boardNameOf(d, gid) + '」に' + (wasOff ? '追加' : '移動') + 'しました');
}

// ---------------------------------------------------------------- boards and presets

export function addBoardAndGo(d: Dashboard): void {
  const id = d.addBoard();
  const gi = d.g.groups.findIndex(g => g.id === id);
  const f = d.layout.value.first[gi];
  if (f !== undefined) d.go(f);
}

export function deleteBoard(d: Dashboard, gid: string): void {
  if (d.g.groups.length <= 1) return;
  const name = boardNameOf(d, gid);
  const off = { ...d.g.off };
  for (const id of d.g.order) if (d.g.place[id] === gid) off[id] = true;
  d.g.off = off;
  d.g.groups = renumber(d.g.groups.filter(x => x.id !== gid));
  d.go(0, false);
  d.undoable('「' + name + '」を削除しました');
}

/** ミニマル構成: only the first 7, all on the first board. */
export function presetMinimal(d: Dashboard): void {
  const off: Record<string, boolean> = {};
  const place = { ...d.g.place };
  const first = d.g.groups[0]?.id ?? 'g0';
  for (const id of d.g.order) { if (!STARTER.includes(id)) off[id] = true; else place[id] = first; }
  d.g.off = off;
  d.g.place = place;
  d.go(0, false);
  d.undoable('ミニマル構成にしました');
}

/** すべて並べる (display test only; not in production builds). */
export function presetAll(d: Dashboard): void {
  // Extra placements (`links#2`) keep their place in the order and their records.
  const extra = d.g.order.filter(id => !DEFAULT_ORDER.includes(id));
  const place = { ...defaultPlace(), ...Object.fromEntries(extra.map(id => [id, 'g0'])) };
  Object.assign(d.g, { groups: fullGroups(), place, off: {}, order: [...DEFAULT_ORDER, ...extra], pgW: {} });
  d.go(0, false);
  d.undoable('すべてのウィジェットを並べました');
}

/** 初期状態に戻す: layout, global settings and widget settings. Records stay. */
export function resetAll(d: Dashboard): void {
  d.resetLayout();
  d.g.gs = defaultSettings();
  for (const id of d.g.order) d.cfg[id] = {};
  d.go(0, false);
  d.undoable('初期状態に戻しました');
}

// ---------------------------------------------------------------- data

function clip(): Clipboard | null {
  return typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : null;
}

/**
 * 書き出し（コピー）. 「コピーしました」 and the last-export date only after the clipboard accepted the text;
 * without a clipboard, or when writing is refused, a warning is shown and the date stays.
 */
export async function exportCopy(d: Dashboard): Promise<boolean> {
  const c = clip();
  const fail = (): false => { d.toast('コピーできませんでした。「ファイルに保存」を使ってください', 'warn'); return false; };
  if (!c || typeof c.writeText !== 'function') return fail();
  try { await c.writeText(d.exportJson()); } catch { return fail(); }
  d.toast('設定と記録をコピーしました', 'ok');
  d.g.lastExp = d.now();
  return true;
}

/** 読み込み. The whole text is checked before anything changes (`Dashboard.importJson`); a refusal says why. */
export async function importFromClipboard(d: Dashboard): Promise<boolean> {
  const empty = (): false => { d.toast('読み込めるデータがクリップボードにありません', 'warn'); return false; };
  const c = clip();
  if (!c || typeof c.readText !== 'function') return empty();
  let txt: string;
  try { txt = await c.readText(); } catch { return empty(); }
  const r = d.importJson(txt);
  if (!r.ok) {
    if (r.reason === IMPORT_REASONS.format) return empty();
    d.toast(r.reason, 'warn');
    return false;
  }
  d.go(0, false);
  d.undoable('読み込みました');
  return true;
}

export function lastExportText(d: Dashboard): string {
  const at = d.g.lastExp;
  return at ? '最後の書き出し: ' + String(Math.max(0, Math.floor((d.ui.t - at) / 86400000))) + '日前' : 'まだ書き出していません';
}

// ---------------------------------------------------------------- global settings

export function toggleSection(d: Dashboard, n: string): void {
  const c: Record<string, boolean> = { look: true, layout: true, ...d.g.dsO };
  c[n] = !c[n];
  d.g.dsO = c;
}

export function sectionOpen(d: Dashboard, n: string): boolean {
  return !!({ look: true, layout: true, ...d.g.dsO } as Record<string, boolean>)[n];
}

export function setVeil(d: Dashboard, on: boolean): void {
  d.setG('veil', on);
  d.ui.peek = {};
  d.toast(on ? '「人前では隠す」にしたウィジェットの中身を隠しました' : '隠していた中身を表示しました', 'info');
}

export function homeBoardIndex(d: Dashboard): number {
  return Math.max(0, d.g.groups.findIndex(g => g.id === d.g.gs.home));
}

export function setGlobal<K extends keyof GlobalSettings>(d: Dashboard, k: K, v: GlobalSettings[K]): void {
  d.setG(k, v);
}

// ---------------------------------------------------------------- environment (実装ガイド 7.2「使い始めの準備」)

export type EnvKind = 'pc' | 'ios' | 'android' | 'app';

export function detectEnv(): EnvKind {
  try {
    const mm = (q: string): boolean => !!window.matchMedia?.(q).matches;
    const nav = navigator as Navigator & { standalone?: boolean };
    if (mm('(display-mode: standalone)') || mm('(display-mode: window-controls-overlay)') || nav.standalone) return 'app';
    const ua = nav.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) return 'ios';
    if (mm('(pointer: coarse)')) return 'android';
  } catch { /* ignore */ }
  return 'pc';
}

export type EnvGuide = { title: string; text: string; sub: string; actLabel: string; act: (() => void) | null };

export function envGuide(d: Dashboard, kind: EnvKind, canInstall: boolean, install: () => void): EnvGuide {
  const copyUrl = (): void => {
    let url = '';
    try { url = String(window.location.href).split('#')[0] ?? ''; } catch { /* ignore */ }
    try { void clip()?.writeText(url).catch(() => undefined); } catch { /* ignore */ }
    d.toast('URLをコピーしました', 'ok');
  };
  switch (kind) {
    case 'ios': return { title: 'ホーム画面に置く', text: 'ホーム画面に置くと、アプリとして全画面で使えます。共有ボタンから「ホーム画面に追加」を選んでください。', sub: 'Safari とホーム画面のアプリでは、記録が別々に保存されます。使い始める前に置くのがおすすめです。', actLabel: '', act: null };
    case 'android': return { title: 'ホーム画面に置く', text: 'ホーム画面に置くと、アプリとして全画面で使えます。', sub: canInstall ? '' : 'ブラウザのメニューから「ホーム画面に追加」か「アプリをインストール」を選んでください。', actLabel: canInstall ? 'アプリとして入れる' : '', act: canInstall ? install : null };
    case 'app': return { title: 'アプリとして使っています', text: 'このアプリはホーム画面から開けます。', sub: '', actLabel: '', act: null };
    default: return { title: '新しいタブ・起動時に使う', text: '新しいタブの代わりに使うなら、ブラウザの「起動時に開くページ」か「ホームページ」に、このページのURLを設定してください。', sub: canInstall ? '「設定」からアプリとして入れると、専用のウィンドウで開けます。' : '', actLabel: 'URLをコピー', act: copyUrl };
  }
}

export const STORE_NOTE = '記録はこの端末の、このブラウザ（アプリ）の中だけに保存します。ときどき「設定」の「ファイルに保存」で書き出してください。';

// ---------------------------------------------------------------- devices (見本)

export const DEVICE_ICONS: Readonly<Record<DeviceKind, string>> = {
  phone: 'M8 3h8v18H8zM11 18h2',
  pc: 'M3 6h12v9H3zM1.5 18h15M17 8h5v11h-5z',
  tab: 'M5 3h14v18H5zM11 18h2',
};

export function agoText(now: number, ts: number): string {
  const m = Math.round((now - ts) / 60000);
  return m < 1 ? 'たった今' : m < 60 ? String(m) + '分前' : m < 1440 ? String(Math.round(m / 60)) + '時間前' : String(Math.round(m / 1440)) + '日前';
}

/** Sample QR path (見た目だけで読み取れない). */
export function qrPath(code: string): string {
  const qn = 29, seed = Number(code) || 0;
  const finder = (x: number, y: number): number => {
    for (const [ox, oy] of [[0, 0], [qn - 7, 0], [0, qn - 7]] as const) {
      const dx = x - ox, dy = y - oy;
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
        if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return 0;
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
      }
    }
    return -1;
  };
  let out = '';
  for (let y = 0; y < qn; y++) for (let x = 0; x < qn; x++) {
    const f = finder(x, y);
    const on = f >= 0 ? f === 1 : ((x * 7919 + y * 104729 + seed) ^ (x * y * 31 + seed * 7)) % 5 < 2;
    if (on) out += 'M' + String(x) + ' ' + String(y) + 'h1v1h-1z';
  }
  return out;
}

export function setPairMode(d: Dashboard, m: 'show' | 'enter'): void {
  Object.assign(sheetState(d), { pairMode: m, pairAt: d.now(), pairCode: newPairCode(), pairIn: '', pairMsg: '' });
}

export function setPairInput(d: Dashboard, raw: string): void {
  const s = sheetState(d);
  const v = raw.replace(/\D/g, '').slice(0, 6);
  s.pairIn = v;
  s.pairMsg = v.length === 6 ? '確認しています…' : '';
  if (v.length === 6) setTimeout(() => {
    s.devices = [...s.devices, { id: 'd' + String(d.now()), n: '新しい端末', type: 'phone', on: true, last: d.now() }];
    s.pairIn = '';
    s.pairMsg = '';
    d.toast('新しい端末とつながりました', 'ok');
  }, 900);
}

export function askUnpair(d: Dashboard, id: string): void {
  const s = sheetState(d);
  const name = s.devices.find(x => x.id === id)?.n ?? '';
  d.confirm({
    title: '「' + name + '」との接続を解除しますか？',
    msg: 'この端末とは送り合えなくなります。残りの端末とは新しい鍵でつなぎ直すため、もう一度追加するにはコードかQRが必要です。',
    two: true, okLabel: '解除する', bad: true,
    onOk: () => { s.devices = s.devices.filter(x => x.id !== id); d.toast('「' + name + '」との接続を解除しました', 'info'); },
  });
}

// ---------------------------------------------------------------- widget settings

/** The widget the settings sheet shows: the live selection, else the last one while it fades out. */
export function settingsTarget(d: Dashboard): string | null {
  const s = sheetState(d);
  const pos = d.layout.value.pos;
  const sel = d.ui.sel;
  const live = sel && !d.g.off[sel] && pos[sel] ? sel : null;
  if (live) { if (s.lastSel !== live) s.lastSel = live; return live; }
  return s.lastSel && pos[s.lastSel] ? s.lastSel : null;
}

export function settingsOpen(d: Dashboard): boolean {
  const sel = d.ui.sel;
  return d.ui.panel === 'widget' && !!sel && !d.g.off[sel] && !!d.layout.value.pos[sel];
}

/** Widget sheet dock: opposite the selected widget; above/below under 720px (仕様書 4章「シートの出る位置」). */
export function widgetDock(d: Dashboard, id: string | null): 'left' | 'right' | 'top' | 'bottom' {
  const L = d.layout.value;
  const p = id ? L.pos[id] : undefined;
  if (!p) return 'right';
  if (isWide(d)) return p.c + p.w / 2 >= L.cols / 2 ? 'left' : 'right';
  return p.r + p.h / 2 >= L.rows / 2 ? 'top' : 'bottom';
}

export function setWidgetSize(d: Dashboard, id: string, w: number, h: number): void {
  const def = defOf(id);
  if (!def || d.g.lockSz[id]) return;
  if (w < def.min[0] || h < def.min[1] || w > def.max[0] || h > def.max[1]) return;
  d.setSize(id, [w, h] as Size);
  const pg = { ...d.g.pgW };
  delete pg[id];
  d.g.pgW = pg;
  follow(d, id);
}

export function setFullScreenOn(d: Dashboard, id: string): void {
  if (d.g.lockSz[id] || d.pgOn(id)) return;
  d.g.pgW = { ...d.g.pgW, [id]: true };
  d.setPin(id, null);
}

export function toggleSizeLock(d: Dashboard, id: string): void {
  const m = { ...d.g.lockSz };
  if (m[id]) delete m[id]; else m[id] = true;
  d.g.lockSz = m;
}

export function togglePin(d: Dashboard, id: string): void {
  if (d.g.pins[id]) { d.setPin(id, null); return; }
  const L = d.layout.value;
  const q = L.pos[id];
  if (!q || q.pg) return;
  d.setPin(id, [q.page - (L.first[q.gi] ?? 0), q.c, q.r]);
}

export function canNudge(d: Dashboard, id: string, dx: number, dy: number): boolean {
  const cur = d.g.pins[id];
  if (!cur) return false;
  const L = d.layout.value;
  const sz = d.sizeOf(id);
  const nc = cur[1] + dx, nr = cur[2] + dy;
  return !(nc < 0 || nr < 0 || nc + Math.min(sz[0], L.cols) > L.cols || nr + Math.min(sz[1], L.rows) > L.rows);
}

export function nudgePin(d: Dashboard, id: string, dx: number, dy: number): void {
  const cur = d.g.pins[id];
  if (!cur || !canNudge(d, id, dx, dy)) return;
  d.setPin(id, [cur[0], cur[1] + dx, cur[2] + dy]);
  follow(d, id);
}

export function moveToBoard(d: Dashboard, id: string, gid: string): void {
  d.g.place = { ...d.g.place, [id]: gid };
  follow(d, id);
}

/** Swap with the previous/next placed widget on the same board. */
export function shiftOrder(d: Dashboard, id: string, dir: -1 | 1): void {
  const ord = [...d.g.order];
  const i = ord.indexOf(id);
  let j = i + dir;
  const same = (x: string | undefined): boolean => x !== undefined && !d.g.off[x] && d.g.place[x] === d.g.place[id];
  while (j >= 0 && j < ord.length && !same(ord[j])) j += dir;
  if (i < 0 || j < 0 || j >= ord.length) return;
  const other = ord[j];
  if (other === undefined) return;
  ord[i] = other;
  ord[j] = id;
  d.g.order = ord;
  follow(d, id);
}

/** このボードから外す */
export function hideSelected(d: Dashboard, id: string): void {
  Object.assign(d.ui, { sel: null, panel: 'none' });
  d.unplace(id);
}

export function toggleWidgetVeil(d: Dashboard, id: string): void {
  d.setCfg(id, 'veil', !d.veilOf(id));
}

export type FieldCheck = { hint?: string; err?: string };

/** 入力欄の補足とエラー (prototype `fChk`). */
export function fieldCheck(id: string, k: string, raw: FieldValue | undefined, now: number): FieldCheck {
  const v = raw === undefined ? '' : String(raw).trim();
  const kind = kindOf(id);
  if (kind === 'search' && k === 'url') {
    if (!v) return { hint: '空のときは「検索先」で選んだサービスを使います' };
    if ((!v.startsWith('https://') && !v.startsWith('http://')) || v.includes(' ')) return { err: '「https://」で始まるURLを入れてください' };
    if (!v.includes('%s')) return { err: '%s が入っていません。検索語を入れる場所に %s を書いてください' };
    return { hint: '%s のところに検索語が入ります' };
  }
  if (kind === 'tax' && k === 'rates') {
    const p = v.split(/[,、 ]+/).filter(Boolean);
    if (!p.length || p.some(y => !Number.isFinite(Number(y)) || Number(y) < 0 || Number(y) >= 100)) return { err: '0〜99の数を、カンマで区切って入れてください（例: 10, 8）' };
    if (p.length > 4) return { err: '税率は4つまでです。5つ目からは使いません' };
    return { hint: 'カンマで区切って4つまで（例: 10, 8）' };
  }
  if (kind === 'countdown' && k === 'date') {
    const m = v.split('-');
    if (m.length !== 3) return { err: '日付を選んでください' };
    const n = new Date(now);
    const t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    const t = new Date(Number(m[0]), Number(m[1]) - 1, Number(m[2]));
    const dd = Math.round((t.getTime() - t0.getTime()) / 86400000);
    const md = String(Number(m[1])) + '月' + String(Number(m[2])) + '日';
    return { hint: dd > 0 ? 'あと' + String(dd) + '日（' + md + '）' : dd === 0 ? '今日です（' + md + '）' : md + 'は' + String(-dd) + '日前に過ぎました' };
  }
  if (kind === 'alarm') {
    const m = v.split(':');
    if (m.length < 2 || !Number.isFinite(Number(m[0])) || !Number.isFinite(Number(m[1])) || m[0] === '' || m[1] === '') return { err: '時刻を入れてください' };
    const n = new Date(now);
    const t = new Date(n.getFullYear(), n.getMonth(), n.getDate(), Number(m[0]), Number(m[1]));
    return { hint: '毎日鳴ります。次は' + (t <= n ? '明日 ' : '今日 ') + String(Number(m[0])) + ':' + (m[1] ?? '') + '（オンのときだけ）' };
  }
  return {};
}

// ---------------------------------------------------------------- items (ハビット・クイックリンク)

export type EditItem = { id: number; label: string; ic: string; img?: string | null; url?: string; on?: boolean };

/** Item lists edited in the settings sheet. The data may be an array or `{ items }` (widget layer decides). */
export const ITEM_WIDGETS: readonly string[] = ['habit', 'links'];

/** Prototype initial items; used only until the widget defines its own record. */
const FALLBACK_ITEMS: Readonly<Record<string, readonly EditItem[]>> = {
  habit: [
    { id: 1, label: '水を飲む', ic: 'drop', on: true }, { id: 2, label: '読書', ic: 'book', on: false },
    { id: 3, label: '運動', ic: 'pulse', on: false }, { id: 4, label: '早寝', ic: 'moon', on: false },
  ],
  links: [
    { id: 1, label: 'コード', ic: 'code', url: '' }, { id: 2, label: 'メール', ic: 'mail', url: '' },
    { id: 3, label: 'ドキュメント', ic: 'doc', url: '' }, { id: 4, label: 'チャット', ic: 'chat', url: '' },
    { id: 5, label: 'クラウド', ic: 'cloud', url: '' },
  ],
};

export function itemsOf(d: Dashboard, id: string): EditItem[] {
  const v = d.data[id];
  if (Array.isArray(v)) return v as EditItem[];
  if (v && typeof v === 'object' && Array.isArray((v as { items?: unknown }).items)) return (v as { items: EditItem[] }).items;
  return [...(FALLBACK_ITEMS[kindOf(id)] ?? [])];
}

export function setItems(d: Dashboard, id: string, items: EditItem[]): void {
  const v = d.data[id];
  if (Array.isArray(v)) d.setData(id, items);
  else d.setData(id, { ...(v && typeof v === 'object' ? v : {}), items });
}

/** `null` removes the key (e.g. `img: null` when an icon is chosen). */
export function patchItem(d: Dashboard, id: string, itemId: number, patch: Partial<EditItem>): void {
  setItems(d, id, itemsOf(d, id).map(x => {
    if (x.id !== itemId) return x;
    const o: Record<string, unknown> = { ...x, ...patch };
    for (const [k, v] of Object.entries(patch)) if (v === null) delete o[k];
    return o as EditItem;
  }));
}

export function addItem(d: Dashboard, id: string): void {
  setItems(d, id, [...itemsOf(d, id), { id: d.now(), label: '', ic: 'star', on: false, url: '' }]);
}

export function removeItem(d: Dashboard, id: string, itemId: number): void {
  setItems(d, id, itemsOf(d, id).filter(x => x.id !== itemId));
}

/** URLs pasted one per line (「URL 名前」) or a bookmarks HTML export. Max 40. */
export function parseBulkLinks(txt: string): { url: string; label: string }[] {
  const out: { url: string; label: string }[] = [];
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt))) if (m[1] && /^https?:\/\//i.test(m[1])) out.push({ url: m[1], label: (m[2] ?? '').trim() });
  if (!out.length) for (const ln of String(txt).split(/\r?\n/)) {
    const u = /(https?:\/\/\S+)/.exec(ln)?.[1];
    if (!u) continue;
    const label = ln.replace(u, '').trim();
    let host = '';
    try { host = new URL(u).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
    out.push({ url: u, label: label || host });
  }
  return out.slice(0, 40);
}

/** Adds the pasted links to quick-link placement `id` (default: the first one). */
export function bulkAddLinks(d: Dashboard, id = 'links'): void {
  const s = sheetState(d);
  const got = parseBulkLinks(s.bulkTx);
  if (!got.length) return;
  const at = d.now();
  setItems(d, id, [...itemsOf(d, id), ...got.map((g, i) => ({ id: at + i, label: g.label.slice(0, 24), ic: 'doc', url: g.url }))]);
  s.bulkTx = '';
  d.undoable(String(got.length) + '件のリンクを追加しました');
}

/** Square-crop an image file to 96px PNG (仕様書 6章「項目の編集とアイコン」). */
export function readIconFile(d: Dashboard, file: File | undefined, done: (url: string) => void): void {
  if (!file) return;
  const fail = (): void => { d.toast('画像を読み込めませんでした', 'warn'); };
  try {
    const rd = new FileReader();
    rd.onerror = fail;
    rd.onload = () => {
      const im = new Image();
      im.onerror = fail;
      im.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = 96; cv.height = 96;
          const sc = Math.max(96 / im.width, 96 / im.height);
          const w = im.width * sc, h = im.height * sc;
          cv.getContext('2d')?.drawImage(im, (96 - w) / 2, (96 - h) / 2, w, h);
          done(cv.toDataURL('image/png'));
        } catch { fail(); }
      };
      im.src = typeof rd.result === 'string' ? rd.result : '';
    };
    rd.readAsDataURL(file);
  } catch { fail(); }
}

// ---------------------------------------------------------------- select menus (選択メニュー; drawn by the overlays layer)

export type SelectKey = 'home' | 'tgt' | 'move' | 'sunloc' | `f:${string}`;
export type SelectOption = { n: string; on: boolean; tap: () => void };

/** Options for a select menu. `f:<key>` uses the widget shown in the settings sheet. */
export function selectOptions(d: Dashboard, key: string): SelectOption[] {
  const groups = d.g.groups;
  if (key === 'home') {
    const hi = homeBoardIndex(d);
    return groups.map((gr, gi) => ({ n: gr.n, on: gi === hi, tap: () => { d.setG('home', gi === 0 ? '' : gr.id); } }));
  }
  if (key === 'tgt') {
    const t = targetBoard(d);
    return groups.map(gr => ({ n: gr.n, on: gr.id === t.id, tap: () => { d.ui.tgt = gr.id; } }));
  }
  if (key === 'move') {
    const sel = settingsTarget(d);
    const sp = sel ? d.layout.value.pos[sel] : undefined;
    return groups.map((gr, gi) => ({ n: gr.n, on: !!sp && sp.gi === gi, tap: () => { if (sel) moveToBoard(d, sel, gr.id); } }));
  }
  if (key === 'sunloc') {
    const cur = d.cfgOf('sun', 'loc');
    return (REGISTRY.sun?.f.find(f => f.k === 'loc')?.o ?? []).map(c => ({ n: c, on: c === cur, tap: () => { d.setCfg('sun', 'loc', c); } }));
  }
  if (key.startsWith('f:')) {
    const sel = settingsTarget(d);
    const fk = key.slice(2);
    const f = sel ? defOf(sel)?.f.find(x => x.k === fk) : undefined;
    if (!sel || !f) return [];
    const cur = d.cfgOf(sel, fk);
    return (f.o ?? []).map(o => ({ n: o, on: o === cur, tap: () => { d.setCfg(sel, fk, o); } }));
  }
  return [];
}

/** Label shown on the select button (the chosen option, or 「選ぶ」). */
export function selectLabel(d: Dashboard, key: string): string {
  return selectOptions(d, key).find(o => o.on)?.n ?? '選ぶ';
}

export function selectExpanded(d: Dashboard, key: string): boolean {
  return d.ui.mn?.kind === 'select' && d.ui.mn.id === key;
}
