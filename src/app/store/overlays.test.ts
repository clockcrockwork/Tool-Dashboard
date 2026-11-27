import { describe, expect, it } from 'vitest';
import { Dashboard } from './store';
import { memoryStore } from './persist';
import {
  closeMenu, collapse, menuGeometry, menuHeight, menuKeyTarget, noticeOpen, placeTemp, selectMenuItems, tempSize, tipFor,
  reloadStops, tourEnd, tourNext, tourView, TOUR_STEPS, updGo, updLater, updOpen, widgetMenuItems,
} from './overlays';
import { runtimeOf } from '../runtime/runtime';
import type { MenuAnchor } from './types';

const T0 = Date.parse('2026-11-19T10:24:36+09:00');
function dash(): Dashboard {
  return new Dashboard({ store: memoryStore(), dataDefs: {}, now: () => T0, setTimeout: () => 0 });
}
const anchor = (over: Partial<MenuAnchor> = {}): MenuAnchor => ({ l: 100, t: 100, w: 0, h: 0, rw: 1440, rh: 900, al: '', ...over });

describe('menuKeyTarget (↑↓・Home/End・頭文字)', () => {
  const labels = ['設定', '位置を固定', '大きさを固定', '人前では隠す', 'ボードから外す'];
  it('wraps with the arrows', () => {
    expect(menuKeyTarget(labels, -1, 'ArrowDown', false, false)).toBe(0);
    expect(menuKeyTarget(labels, 4, 'ArrowDown', false, false)).toBe(0);
    expect(menuKeyTarget(labels, 0, 'ArrowUp', false, false)).toBe(4);
    expect(menuKeyTarget(labels, -1, 'ArrowUp', false, false)).toBe(4);
  });
  it('jumps with Home / End', () => {
    expect(menuKeyTarget(labels, 2, 'Home', false, false)).toBe(0);
    expect(menuKeyTarget(labels, 2, 'End', false, false)).toBe(4);
  });
  it('moves to the next row starting with the typed letter', () => {
    const l = ['Tokyo', 'Osaka', 'Toyama', 'Sapporo'];
    expect(menuKeyTarget(l, 0, 't', false, false)).toBe(2);
    expect(menuKeyTarget(l, 2, 'T', false, false)).toBe(0);
    expect(menuKeyTarget(l, 0, 'x', false, false)).toBeNull();
  });
  it('ignores letters typed in the filter field, with modifiers, and space', () => {
    const l = ['Tokyo', 'Toyama'];
    expect(menuKeyTarget(l, 0, 't', true, false)).toBeNull();
    expect(menuKeyTarget(l, 0, 't', false, true)).toBeNull();
    expect(menuKeyTarget(l, 0, ' ', false, false)).toBeNull();
    expect(menuKeyTarget([], -1, 'ArrowDown', false, false)).toBeNull();
  });
});

describe('menuGeometry', () => {
  it('opens below the anchor, growing from the side it was opened from', () => {
    const g = menuGeometry('widget', anchor({ l: 300, t: 200, w: 40, h: 40 }), 200);
    expect(g).toEqual({ x: 300, y: 246, origin: '20px 0', dock: '' });
  });
  it('flips above when there is no room below and keeps 8px from the right edge', () => {
    const g = menuGeometry('widget', anchor({ l: 1400, t: 800 }), 280);
    expect(g.y).toBe(800 - 280 - 6);
    expect(g.x).toBe(1440 - 244);
    expect(g.origin).toBe('204px 280px');
  });
  it('docks a select menu under 520px wide', () => {
    expect(menuGeometry('select', anchor({ rw: 390 }), 100).dock).toBe('sheet');
    expect(menuGeometry('select', anchor({ rw: 390 }), 100).origin).toBe('50% 100%');
    expect(menuGeometry('widget', anchor({ rw: 390 }), 100).dock).toBe('');
  });
  it('estimates the height from rows, separators and the filter', () => {
    expect(menuHeight([{ sep: false }, { sep: true }], false)).toBe(2 * 44 + 12 + 9);
    expect(menuHeight([{ sep: false }], true)).toBe(44 + 12 + 52);
    expect(menuHeight(Array.from({ length: 20 }, () => ({ sep: false })), true)).toBe(420);
  });
});

describe('widget menu', () => {
  it('lists settings, pin, size lock, veil and remove for a placed widget', () => {
    const d = dash();
    const it = widgetMenuItems(d, 'clock');
    expect(it.map(x => x.l)).toEqual(['設定', '位置を固定', '大きさを固定', '人前では隠す', 'ボードから外す']);
    expect(it.map(x => x.kind)).toEqual(['cmd', 'chk', 'chk', 'chk', 'cmd']);
    expect(it[4]).toMatchObject({ sep: true, bad: true });
  });
  it('offers 大きく表示 only for widgets that have it', () => {
    const d = dash();
    expect(widgetMenuItems(d, 'memo').some(x => x.l === '大きく表示')).toBe(true);
    expect(widgetMenuItems(d, 'clock').some(x => x.l === '大きく表示')).toBe(false);
  });
  it('toggles pin and size lock and closes', () => {
    const d = dash();
    d.ui.mn = { kind: 'widget', id: 'clock', x: 0, y: 0, origin: '', dock: '' };
    widgetMenuItems(d, 'clock').find(x => x.l === '位置を固定')?.tap();
    expect(d.g.pins.clock).toBeDefined();
    expect(d.ui.mn).toBeNull();
    widgetMenuItems(d, 'clock').find(x => x.l === '大きさを固定')?.tap();
    expect(d.g.lockSz.clock).toBe(true);
    expect(widgetMenuItems(d, 'clock').find(x => x.l === '大きさを固定')?.on).toBe(true);
  });
  it('removes from the board with an undo toast', () => {
    const d = dash();
    widgetMenuItems(d, 'clock').find(x => x.l === 'ボードから外す')?.tap();
    expect(d.g.off.clock).toBe(true);
    expect(d.ui.toasts.at(-1)?.act?.label).toBe('元に戻す');
  });
  it('設定 opens the widget sheet in edit mode', () => {
    const d = dash();
    widgetMenuItems(d, 'clock')[0]?.tap();
    expect(d.ui).toMatchObject({ edit: true, sel: 'clock', panel: 'widget', big: null });
  });
});

describe('select menu', () => {
  it('marks the chosen option and narrows by the filter', () => {
    const d = dash();
    const all = selectMenuItems(d, 'sunloc:sun');
    expect(all.map(x => x.l)).toEqual(['東京', '大阪', '札幌', '福岡', '那覇', '現在地']);
    expect(all.find(x => x.on)?.l).toBe('東京');
    d.ui.mnQ = '大';
    expect(selectMenuItems(d, 'sunloc:sun').map(x => x.l)).toEqual(['大阪']);
  });
  it('choosing an option applies it and closes', () => {
    const d = dash();
    d.ui.mn = { kind: 'select', id: 'sunloc:sun', x: 0, y: 0, origin: '', dock: '' };
    selectMenuItems(d, 'sunloc:sun').find(x => x.l === '札幌')?.tap();
    expect(d.cfgOf('sun', 'loc')).toBe('札幌');
    expect(d.ui.mn).toBeNull();
  });
});

describe('layers and 戻る (仕様書 7章)', () => {
  it('closes the menu first, then the dialog as キャンセル', () => {
    const d = dash();
    d.ui.mn = { kind: 'widget', id: 'clock', x: 0, y: 0, origin: '', dock: '' };
    d.confirm({ title: 't', msg: 'm', two: true, okLabel: '削除する', bad: true });
    d.back();
    expect(d.ui.mn).toBeNull();
    expect(d.ui.dlg).not.toBeNull();
    d.back();
    expect(d.ui.dlg).toBeNull();
    expect(d.ui.toasts.at(-1)?.text).toBe('キャンセルしました');
  });
  it('closeMenu clears the query and anchor', () => {
    const d = dash();
    Object.assign(d.ui, { mn: { kind: 'select', id: 'home', x: 0, y: 0, origin: '', dock: '' }, mnQ: 'x', mnAt: anchor() });
    closeMenu(d, false);
    expect(d.ui).toMatchObject({ mn: null, mnQ: '', mnAt: null });
  });
});

describe('最初の案内', () => {
  it('has 5 steps; the last cannot be skipped and ends with はじめる', () => {
    const d = dash();
    expect(d.ui.tour).toBe(0);
    const env = { title: '', text: '準備', sub: '', actLabel: 'URLをコピー', act: () => undefined };
    expect(tourView(d, env)).toMatchObject({ count: '1 / 5', nextLabel: '次へ', canSkip: true, actLabel: '' });
    for (let i = 1; i < TOUR_STEPS.length; i++) tourNext(d);
    const v = tourView(d, env);
    expect(v).toMatchObject({ text: '準備', count: '5 / 5', nextLabel: 'はじめる', canSkip: false, actLabel: 'URLをコピー' });
    expect(v.sub).toContain('記録はこの端末');
    tourNext(d);
    expect(d.ui.tour).toBe(-1);
    expect(d.g.tourDone).toBe(true);
  });
  it('スキップ ends and remembers', () => {
    const d = dash();
    tourEnd(d);
    expect(d.ui.tour).toBe(-1);
    expect(d.g.tourDone).toBe(true);
  });
});

describe('top bars', () => {
  it('keeps the share notice quiet during sheets, front view, edit mode and the tour', () => {
    const d = dash();
    tourEnd(d);
    d.ui.rcv = { d: '', text: 'x', al: 'コピー', act: () => undefined, t: T0 };
    expect(noticeOpen(d)).toBe(true);
    d.ui.edit = true;
    expect(noticeOpen(d)).toBe(false);
    d.ui.edit = false;
    d.ui.rcvHide = T0 + 1;
    expect(noticeOpen(d)).toBe(false);
  });
  it('「再読み込み」 with nothing running reloads at once', () => {
    const d = dash();
    tourEnd(d);
    d.ui.upd = true;
    updGo(d);
    expect(d.ui.dlg).toBeNull();
    expect(updOpen(d)).toBe(false);
    expect(d.ui.toasts.map(t => t.text)).toEqual(['新しい版にしました（見本）']);
  });
  it('「再読み込み」 while 録音・ポモドーロ・ストップウォッチ run asks first and names what stops (from the runtime)', () => {
    const d = dash();
    tourEnd(d);
    d.ui.upd = true;
    const rt = runtimeOf(d);
    // Paused or idle runs, and kinds that are not 継続実行, are not named.
    rt.set('pomo', { on: false, endAt: null, left: 300 });
    rt.set('sketch', { on: true });
    expect(reloadStops(d)).toEqual([]);
    rt.set('recorder', { on: true, start: T0, takes: [], play: null });
    rt.set('pomo', { on: true, endAt: T0 + 60_000, left: null });
    rt.set('stopwatch', { run: true, base: 0, start: T0, laps: [] });
    const order = d.g.order;
    const want = ['pomo', 'stopwatch', 'recorder'].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    expect(rt.active()).toEqual(want);
    const names = { pomo: 'ポモドーロ', stopwatch: 'ストップウォッチ', recorder: '録音' } as const;
    expect(reloadStops(d)).toEqual(want.map(id => names[id as keyof typeof names]));
    updGo(d);
    expect(d.ui.dlg).toMatchObject({
      title: '再読み込みしますか？', msg: reloadStops(d).join('、') + 'が止まります。入力した内容は保存されています。', two: true, okLabel: '再読み込み',
    });
    expect(updOpen(d)).toBe(true);
    d.dialogCancel();
    expect(updOpen(d)).toBe(true);
    updGo(d);
    d.dialogOk();
    expect(d.ui.dlg).toBeNull();
    expect(updOpen(d)).toBe(false);
    expect(d.ui.toasts.map(t => t.text)).toContain('新しい版にしました（見本）');
  });
  it('a placement dropped from the order is not named', () => {
    const d = dash();
    runtimeOf(d).set('recorder', { on: true, start: T0, takes: [], play: null });
    expect(reloadStops(d)).toEqual(['録音']);
    d.g.order = d.g.order.filter(id => id !== 'recorder');
    expect(reloadStops(d)).toEqual([]);
  });
  it('「あとで」 hides the update bar', () => {
    const d = dash();
    tourEnd(d);
    d.ui.upd = true;
    expect(updOpen(d)).toBe(true);
    updLater(d);
    expect(updOpen(d)).toBe(false);
  });
});

describe('一時利用', () => {
  it('sizes the temporary window from the widget size', () => {
    expect(tempSize('clock')).toEqual({ tw: '360px', th: '240px' });
    expect(tempSize('nope')).toBeNull();
  });
  it('places the temporary widget on the target board', () => {
    const d = dash();
    Object.assign(d.ui, { big: 'calc', temp: 'calc', ret: 'add' });
    placeTemp(d);
    expect(d.g.off.calc).toBeUndefined();
    expect(d.ui).toMatchObject({ big: null, temp: null, panel: 'none' });
    expect(d.g.order.at(-1)).toBe('calc');
  });
  it('戻る returns to the sheet it came from', () => {
    const d = dash();
    Object.assign(d.ui, { big: 'calc', temp: 'calc', ret: 'add', panel: 'none' });
    collapse(d);
    expect(d.ui).toMatchObject({ big: null, temp: null, panel: 'add' });
  });
});

describe('tooltip position', () => {
  it('sits above the button, or below near the top edge, inside 70px of the sides', () => {
    expect(tipFor('a', '', { left: 100, top: 300, width: 44, bottom: 344 }, 1440)).toEqual({ text: 'a', key: '', x: 122, y: 264 });
    expect(tipFor('a', 'E', { left: 0, top: 10, width: 44, bottom: 54 }, 1440)).toMatchObject({ x: 70, y: 62, key: 'E' });
  });
});
