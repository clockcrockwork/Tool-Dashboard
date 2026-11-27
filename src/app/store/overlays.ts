/**
 * Overlay layers (その他メニュー・選択メニュー・ダイアログ・最初の案内・一時利用・上部の帯).
 * Ported from the prototype methods `mnOpen` `mnHid` `mnClose` `mnKey` `wMenu`, the menu geometry in
 * `xVals`, and the tour / temp / update parts of `renderVals` (design/claude-design/Main.dc.html).
 * Every operation takes the Dashboard as its first argument; components in `src/app/shell/overlays/`
 * only render and wire DOM events.
 */
import { shallowRef } from 'vue';
import { defOf, kindOf, nameOf } from '../registry/instances';
import { runtimeOf } from '../runtime/runtime';
import type { Dashboard } from './store';
import { STORE_NOTE, detectEnv, envGuide, pendingToast, placeAt, selectOptions, sheetState, targetBoard, type EnvGuide, type SelectKey, type SelectOption } from './sheets';
import type { DialogSpec, MenuAnchor, MenuSpec, NoticeBar } from './types';

// ---------------------------------------------------------------- icons (prototype `IX()`)
export const MI = {
  chk: 'M5 12.5l4.5 4.5L19 7.5',
  gear: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
  big: 'M4 10V4h6M20 14v6h-6',
  small: 'M10 4v6H4M14 20v-6h6',
  pin: 'M9 4h6l-1 5 3 3H7l3-3zM12 15v5',
  lock: 'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3',
  out: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM8 12h8',
  veil: 'M4 4l16 16M9.5 9.6a3.5 3.5 0 0 0 4.9 4.9M6.3 6.6C4.4 7.9 3 9.8 2.5 12c1.2 4 5 7 9.5 7 1.6 0 3.1-.4 4.4-1M10 5.2c.6-.1 1.3-.2 2-.2 4.5 0 8.3 3 9.5 7-.4 1.4-1.1 2.6-2 3.7',
} as const;

// ---------------------------------------------------------------- menu model
/** One row of `.mnu`: command (menuitem), check (menuitemcheckbox) or option (listbox). */
export type MenuItem = {
  kind: 'cmd' | 'chk' | 'opt';
  l: string;
  /** icon path ('' = none) */
  d: string;
  on: boolean;
  /** a separator `.msep` goes before this row */
  sep: boolean;
  bad: boolean;
  tap: () => void;
};

export { selectOptions, type SelectKey, type SelectOption };

/** Widgets with 「大きく表示」 (prototype `wMenu`). */
export const BIG_IDS: readonly string[] = ['memo', 'sketch', 'translate', 'chat', 'share', 'table', 'script', 'imgconv'];

/**
 * Where focus returns when a menu closes: an element, or a function read at that moment (for a button that may be gone
 * by then, such as 「都市を選ぶ」 on a card that closes once a city is chosen).
 */
export type MenuReturn = HTMLElement | (() => HTMLElement | null) | null;
/** Runtime that is not part of the reactive state: where focus returns, and buttons folded into the menu. */
type MenuRuntime = { ret: MenuReturn; extra: { l: string; el: HTMLElement }[]; focus: boolean };
const RT = new WeakMap<Dashboard, MenuRuntime>();
export function menuRuntime(d: Dashboard): MenuRuntime {
  let r = RT.get(d);
  if (!r) { r = { ret: null, extra: [], focus: false }; RT.set(d, r); }
  return r;
}

/** Menu height used for placement (prototype `xVals`: 44px a row, 9px a separator, 52px the filter). */
export function menuHeight(items: readonly Pick<MenuItem, 'sep'>[], hasQ: boolean): number {
  return Math.min(420, items.length * 44 + 12 + items.filter(y => y.sep).length * 9 + (hasQ ? 52 : 0));
}

/** Position and animation origin of `.mnu` (opens from the side of the button that opened it). */
export function menuGeometry(kind: MenuSpec['kind'], a: MenuAnchor, h: number): Pick<MenuSpec, 'x' | 'y' | 'origin' | 'dock'> {
  let yy = a.t + a.h + 6;
  if (yy + h > a.rh - 8) yy = Math.max(8, a.t - h - 6);
  const x = Math.round(Math.max(8, Math.min(a.l, a.rw - 244)));
  const dock: MenuSpec['dock'] = kind === 'select' && a.rw < 520 ? 'sheet' : '';
  const origin = dock ? '50% 100%' : String(Math.round(Math.max(0, Math.min(236, a.l + a.w / 2 - x)))) + 'px ' + (yy > a.t ? '0' : String(Math.round(h)) + 'px');
  return { x, y: Math.round(yy), origin, dock };
}

/** A select menu shows a filter field from 13 choices (仕様書 4章). */
export const hasFilter = (n: number): boolean => n > 12;

/**
 * Keyboard movement inside `.mnu` (prototype `mnKey`): ↑↓ wrap, Home/End, first letter.
 * Returns the index to focus, or null when the key does not move.
 */
export function menuKeyTarget(labels: readonly string[], i: number, key: string, inInput: boolean, mod: boolean): number | null {
  const n = labels.length;
  if (!n) return null;
  const wrap = (j: number): number => ((j % n) + n) % n;
  if (key === 'ArrowDown') return wrap(i + 1);
  if (key === 'ArrowUp') return wrap(i < 0 ? -1 : i - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  if (key.length === 1 && key !== ' ' && !inInput && !mod) {
    const c = key.toLowerCase();
    for (let k = 1; k <= n; k++) {
      const j = wrap(i + k);
      if ((labels[j] ?? '').trim().toLowerCase().startsWith(c)) return j;
    }
  }
  return null;
}

/** Anchor from a point or an element, relative to the `.dash` root. */
export function anchorOf(root: HTMLElement, src: { x: number; y: number } | HTMLElement | null, al = ''): MenuAnchor {
  const rr = root.getBoundingClientRect();
  let a = { l: 8, t: 8, w: 0, h: 0 };
  if (src && 'getBoundingClientRect' in src) {
    const b = src.getBoundingClientRect();
    a = { l: b.left - rr.left, t: b.top - rr.top, w: b.width, h: b.height };
  } else if (src) a = { l: src.x - rr.left, t: src.y - rr.top, w: 0, h: 0 };
  return { ...a, rw: rr.width, rh: rr.height, al };
}

function setMenu(d: Dashboard, kind: MenuSpec['kind'], id: string, at: MenuAnchor, count: number, ret: MenuReturn): void {
  const r = menuRuntime(d);
  r.ret = ret;
  r.focus = true;
  const geo = menuGeometry(kind, at, menuHeight(Array.from({ length: count }, () => ({ sep: false })), kind === 'select' && hasFilter(count)));
  d.ui.mnQ = '';
  d.ui.mnAt = at;
  d.ui.mn = { kind, id, ...geo };
}

/** Low-priority strip buttons hidden at narrow widths move to the top of the menu (prototype `mnHid`). */
function hiddenStripButtons(root: HTMLElement, id: string): { l: string; el: HTMLElement }[] {
  const w = root.querySelector('.w[data-wid="' + id + '"]');
  if (!w) return [];
  return Array.from(w.querySelectorAll<HTMLElement>('.ab .abb.lo')).filter(b => b.offsetParent === null)
    .map(b => ({ l: (b.getAttribute('aria-label') ?? b.textContent ?? '').trim(), el: b }));
}

/** その他メニュー for a widget, opened at a point (right click / long press) or from a 「…」 button. */
export function openWidgetMenu(d: Dashboard, root: HTMLElement, id: string, src: { x: number; y: number } | HTMLElement | null, ret: HTMLElement | null): void {
  menuRuntime(d).extra = hiddenStripButtons(root, id);
  const at = anchorOf(root, src);
  setMenu(d, 'widget', id, at, widgetMenuItems(d, id).length, ret ?? (src instanceof HTMLElement ? src : null) ?? activeEl());
}

/**
 * 選択メニュー opened from its button (`.selb`). `label` names the listbox (「ホーム」「場所」…). Focus returns to `ret` when
 * given (prototype `mnOpen({ ret })`), else to the button: pass `ret` when the button may be gone once an option is chosen.
 */
export function openSelectMenu(d: Dashboard, root: HTMLElement, key: string, label: string, btn: HTMLElement | null, ret?: MenuReturn): void {
  menuRuntime(d).extra = [];
  const at = anchorOf(root, btn, label);
  setMenu(d, 'select', key, at, selectOptions(d, key).length, ret ?? btn ?? activeEl());
}

function activeEl(): HTMLElement | null {
  return typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

/**
 * Focus an element that may not take focus by itself (a widget's `section`): it gets `tabindex="-1"` until it loses focus.
 * Returns whether it has focus.
 */
export function focusBack(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  el.focus({ preventScroll: true });
  if (document.activeElement === el || el.hasAttribute('tabindex')) return document.activeElement === el;
  el.setAttribute('tabindex', '-1');
  el.addEventListener('blur', () => { el.removeAttribute('tabindex'); }, { once: true });
  el.focus({ preventScroll: true });
  return document.activeElement === el;
}

/** Close; with `ret` focus goes back to the button that opened it, or to the `ret` it was given (prototype `mnClose`). */
export function closeMenu(d: Dashboard, ret: boolean): void {
  const r = menuRuntime(d);
  const to = r.ret;
  r.ret = null;
  r.extra = [];
  if (d.ui.mn) Object.assign(d.ui, { mn: null, mnQ: '', mnAt: null });
  // Read after the next render: an option may have removed the button (a function `ret` then names another place).
  if (ret && to) setTimeout(() => { const el = typeof to === 'function' ? to() : to; if (el) focusBack(el); }, 0);
}

/** Rows of the widget menu (prototype `wMenu`). */
export function widgetMenuItems(d: Dashboard, id: string): MenuItem[] {
  const L = d.layout.value;
  const placed = !d.g.off[id] && !!L.pos[id];
  const row = (y: Partial<MenuItem> & Pick<MenuItem, 'kind' | 'l' | 'tap'>): MenuItem => ({ d: '', on: false, sep: false, bad: false, ...y });
  const out: MenuItem[] = menuRuntime(d).extra.map(y => row({ kind: 'cmd', l: y.l, tap: () => { closeMenu(d, true); y.el.click(); } }));
  const own: MenuItem[] = [];
  if (placed) own.push(row({ kind: 'cmd', l: '設定', d: MI.gear, tap: () => { closeMenu(d, false); Object.assign(d.ui, { edit: true, sel: id, panel: 'widget', big: null }); } }));
  if (BIG_IDS.includes(kindOf(id))) {
    const on = d.ui.big === id;
    own.push(row({ kind: 'cmd', l: on ? '元の大きさに戻す' : '大きく表示', d: on ? MI.small : MI.big, tap: () => {
      closeMenu(d, false);
      if (d.ui.big === id) collapse(d); else Object.assign(d.ui, { big: id, panel: 'none', edit: false, sel: null });
    } }));
  }
  if (placed) {
    own.push(row({ kind: 'chk', l: '位置を固定', d: MI.pin, on: !!d.g.pins[id], tap: () => {
      if (d.g.pins[id]) d.setPin(id, null);
      else {
        const q = d.layout.value.pos[id];
        if (!q) return;
        d.setPin(id, [q.page - (d.layout.value.first[q.gi] ?? 0), q.c, q.r]);
      }
      closeMenu(d, true);
    } }));
    own.push(row({ kind: 'chk', l: '大きさを固定', d: MI.lock, on: !!d.g.lockSz[id], tap: () => {
      const m = { ...d.g.lockSz };
      if (m[id]) delete m[id]; else m[id] = true;
      d.g.lockSz = m;
      closeMenu(d, true);
    } }));
    own.push(row({ kind: 'chk', l: '人前では隠す', d: MI.veil, on: d.veilOf(id), tap: () => { d.setCfg(id, 'veil', !d.veilOf(id)); closeMenu(d, true); } }));
    own.push(row({ kind: 'cmd', sep: true, bad: true, l: 'ボードから外す', d: MI.out, tap: () => {
      closeMenu(d, false);
      Object.assign(d.ui, { sel: null, panel: 'none' });
      d.unplace(id);
    } }));
  }
  const first = own[0];
  if (out.length && first) first.sep = true;
  return out.concat(own);
}

/** Rows of a select menu, narrowed by the filter (prototype `xVals`). */
export function selectMenuItems(d: Dashboard, key: string, opts: readonly SelectOption[] = selectOptions(d, key)): MenuItem[] {
  const q = d.ui.mnQ.trim().toLowerCase();
  return opts.filter(y => !q || y.n.toLowerCase().includes(q)).map(y => ({
    kind: 'opt' as const, l: y.n, on: y.on, d: y.on ? MI.chk : '', sep: false, bad: false,
    tap: () => { y.tap(); closeMenu(d, true); },
  }));
}

/** Whether right click / long press / Shift+F10 on `t` may open the widget menu (prototype `mnL` `ok`). */
export function menuTarget(d: Dashboard, t: EventTarget | null): HTMLElement | null {
  if (!(t instanceof Element) || d.ui.edit || d.ui.mn) return null;
  const w = t.closest<HTMLElement>('.w[data-wid]');
  if (!w || t.closest('input,textarea,select,canvas,[contenteditable],.veilc,.pmw')) return null;
  if (d.ui.big && d.ui.big !== w.getAttribute('data-wid')) return null;
  return w;
}

// ---------------------------------------------------------------- 前面表示・一時利用
/** 戻る from the front view: back to the size before, or to the sheet a temporary use came from. */
export function collapse(d: Dashboard): void {
  const u = d.ui;
  Object.assign(u, { big: null, temp: null, ret: null, panel: u.temp && u.ret ? u.ret : u.panel });
}

/** 一時利用の帯「「ボード名」に追加」. */
export function placeTemp(d: Dashboard): void {
  const id = d.ui.temp;
  if (!id) return;
  // 準備中の種類は置かない（一時利用はそのまま開いておく。review #9）。
  if (!d.isReady(kindOf(id))) { pendingToast(d, id); return; }
  const tgt = targetBoard(d);
  Object.assign(d.ui, { big: null, temp: null, ret: null, panel: 'none' });
  placeAt(d, id, tgt.id, false);
}

/** `--tw` / `--th` for the temporary-use window (componentDidUpdate `tp !== this._tpv`). */
export function tempSize(id: string): { tw: string; th: string } | null {
  const r = defOf(id);
  if (!r) return null;
  const sz = r.ts ?? r.s;
  return { tw: String(Math.max(340, sz[0] * 180)) + 'px', th: String(Math.max(240, sz[1] * 168)) + 'px' };
}

// ---------------------------------------------------------------- 最初の案内 (仕様書 2章, 実装ガイド 7.2)
export const TOUR_STEPS: readonly (readonly ['pg' | 'index' | 'edit' | 'gear' | 'setup', string])[] = [
  ['pg', '左右にスワイプするか、下の矢印で画面を切り替えます。'],
  ['index', '「一覧」から目的のウィジェットへ移動できます。「ウィジェットを追加」には全部の道具が並び、置かずに使うこともできます。'],
  ['edit', '「編集」にしてウィジェットをタップすると、大きさや設定を変えられます。間違えたら「元に戻す」、終わったら「完了」。'],
  ['gear', '見た目や保存は「設定」から。開いたものは、左上の「‹」か外側のタップで元の画面に戻れます。'],
  ['setup', ''],
];
type InstallPrompt = Event & { prompt: () => void; userChoice?: Promise<unknown> };
/** Captured `beforeinstallprompt` (OverlaysHost listens for it); the help sheet can read it too. */
export const installPrompt = shallowRef<InstallPrompt | null>(null);

/** 「アプリとして入れる」 */
export function install(d: Dashboard): void {
  const ev = installPrompt.value;
  if (!ev) { d.toast('このブラウザでは、メニューから「アプリをインストール」か「ホーム画面に追加」を選びます', 'info'); return; }
  try { ev.prompt(); void (ev.userChoice ?? Promise.resolve()).then(() => { installPrompt.value = null; }); } catch { /* ignore */ }
}

/** 「使い始めの準備」 for the environment (the DEV override of the help sheet applies too). */
export function setupGuide(d: Dashboard): EnvGuide {
  const kind = sheetState(d).simEnv || detectEnv();
  return envGuide(d, kind, !!installPrompt.value && kind !== 'app', () => { install(d); });
}

export function copyText(d: Dashboard, text: string, label = 'コピーしました'): void {
  try { void navigator.clipboard.writeText(text).catch(() => undefined); } catch { /* no clipboard */ }
  d.toast(label, 'ok');
}

/** Card contents for the current tour step. */
export function tourView(d: Dashboard, env: EnvGuide): { text: string; sub: string; count: string; nextLabel: string; canSkip: boolean; actLabel: string; act: (() => void) | null } {
  const i = Math.max(0, Math.min(d.ui.tour, TOUR_STEPS.length - 1));
  const step = TOUR_STEPS[i] ?? TOUR_STEPS[0];
  const setup = step?.[0] === 'setup';
  return {
    text: setup ? env.text : step?.[1] ?? '',
    sub: setup ? [env.sub, STORE_NOTE].filter(Boolean).join(' ') : '',
    count: String(i + 1) + ' / ' + String(TOUR_STEPS.length),
    nextLabel: d.ui.tour >= TOUR_STEPS.length - 1 ? 'はじめる' : '次へ',
    canSkip: !setup,
    actLabel: setup && env.act ? env.actLabel : '',
    act: setup ? env.act : null,
  };
}
export function tourEnd(d: Dashboard): void {
  d.ui.tour = -1;
  d.g.tourDone = true;
}
export function tourNext(d: Dashboard): void {
  if (d.ui.tour >= TOUR_STEPS.length - 1) tourEnd(d);
  else d.ui.tour += 1;
}
/** 「最初の案内をもう一度見る」. */
export function tourStart(d: Dashboard): void {
  Object.assign(d.ui, { tour: 0, panel: 'none', edit: false, sel: null, big: null, temp: null });
}

// ---------------------------------------------------------------- 上部の帯・ページ読み込み
/** The bar stays quiet while a sheet, the front view, edit mode or the tour is up (仕様書 受け渡し). */
export function noticeQuiet(d: Dashboard): boolean {
  const u = d.ui;
  return u.panel !== 'none' || !!u.big || u.edit || u.tour >= 0;
}
export function noticeOpen(d: Dashboard): boolean {
  const r = d.ui.rcv;
  return !!r && !noticeQuiet(d) && !((d.ui.rcvHide ?? -1) >= r.t);
}
export function showNotice(d: Dashboard, bar: NoticeBar | null): void {
  d.ui.rcv = bar;
}
export function closeNotice(d: Dashboard): void {
  d.ui.rcvHide = d.now();
}
/** Sample notice for display tests (the share widget provides real ones in P2). */
export function sampleNotice(d: Dashboard): NoticeBar {
  const text = '駅前の店、19時に集合';
  return { d: 'M5 6h14M5 10h14M5 14h9', text: 'iPhoneから文：' + text, al: 'コピー', act: () => { copyText(d, text); d.ui.rcv = null; }, t: d.now() };
}

export const updOpen = (d: Dashboard): boolean => d.ui.upd && !d.ui.updLater && d.ui.tour < 0;
export function updLater(d: Dashboard): void {
  d.ui.updLater = true;
  d.toast('次に開いたときに新しい版になります', 'info');
}
/**
 * What a reload stops (prototype `updGo` `busy`): the names of the running 継続実行 placements of the runtime (録音、ポモドーロ、
 * ストップウォッチ…; `runtimeOf(d).active()`), each name once, in board order. Their run state is not saved (実装ガイド 6章).
 * The prototype's スクリプトの実行・ローカルAI・画像の変換 join through the runtime when those kinds are made (P2d・P2e).
 */
export function reloadStops(d: Dashboard): string[] {
  return [...new Set(runtimeOf(d).active().map(nameOf))];
}

/** The confirmation of 「再読み込み」 while something runs (prototype `dlg: 'reload'`). */
export function reloadDialog(d: Dashboard, stops: readonly string[]): DialogSpec {
  return {
    title: '再読み込みしますか？', msg: stops.join('、') + 'が止まります。入力した内容は保存されています。', two: true, okLabel: '再読み込み',
    onOk: () => { doReload(d); },
  };
}

/** The reload itself. The real reload arrives with the Service Worker in P3; until then it acts like the prototype. */
function doReload(d: Dashboard): void {
  Object.assign(d.ui, { upd: false, updLater: false, dlg: null });
  d.toast('新しい版にしました（見本）', 'ok');
}

/** 「再読み込み」: asks first when something would stop (`reloadStops`), else reloads. */
export function updGo(d: Dashboard): void {
  const stops = reloadStops(d);
  if (stops.length) { d.ui.dlg = reloadDialog(d, stops); return; }
  doReload(d);
}

/** Page loading bar `.pgb` for `ms` milliseconds (prototype `testPage`). */
export function pageLoading(d: Dashboard, ms = 2400): void {
  Object.assign(d.ui, { pageLoad: true, panel: 'none' });
  setTimeout(() => { d.ui.pageLoad = false; }, ms);
}

/** 表示テストのダイアログ (prototype `dlgSet.alert` / `dlgSet.confirm`). */
export const DIALOG_SAMPLES = {
  alert: (): DialogSpec => ({ title: '同期が完了しました', msg: '3台の端末に最新の設定を反映しました。', two: false, okLabel: '閉じる' }),
  confirm: (d: Dashboard): DialogSpec => ({
    title: 'このボードを削除しますか？', msg: '置いてあるウィジェットは未配置に戻ります。この操作は取り消せません。', two: true, okLabel: '削除する', bad: true,
    onOk: () => { d.toast('削除しました（見本）', 'info'); },
  }),
} as const;

// ---------------------------------------------------------------- ツールチップ
export type Tip = { text: string; key: string; x: number; y: number };
/** Tooltip above the button; below it near the top edge (prototype `show`). */
export function tipFor(text: string, key: string, r: { left: number; top: number; width: number; bottom: number }, vw: number): Tip {
  return {
    text, key,
    x: Math.round(Math.max(70, Math.min(vw - 70, r.left + r.width / 2))),
    y: Math.round(r.top < 52 ? r.bottom + 8 : r.top - 36),
  };
}
