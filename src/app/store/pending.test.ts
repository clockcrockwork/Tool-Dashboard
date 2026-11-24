/**
 * review #9: 未実装の種類を成功扱いにしない. Adding a kind without an implementation shows 「〇〇 は準備中です」 and does not
 * place it (from the catalog and from the temporary-use bar); implemented kinds are added as before.
 */
import { describe, expect, it } from 'vitest';
import { Dashboard } from './store';
import { memoryStore } from './persist';
import { placeAt } from './sheets';
import { placeTemp } from './overlays';

const make = () => new Dashboard({ store: memoryStore(), dataDefs: {}, setTimeout: () => 0, implemented: ['clock', 'todo', 'links'] });
const lastToast = (d: Dashboard) => d.ui.toasts[d.ui.toasts.length - 1];

describe('準備中の種類 (review #9)', () => {
  it('isReady follows the implemented kinds; without the option every registered kind counts', () => {
    const d = make();
    expect(d.isReady('todo')).toBe(true);
    expect(d.isReady('alarm')).toBe(false);
    const all = new Dashboard({ store: memoryStore(), dataDefs: {} });
    expect(all.isReady('alarm')).toBe(true);
    expect(all.isReady('nope')).toBe(false);
  });
  it('＋ 追加 of an unimplemented kind is refused with 「〇〇 は準備中です」 and nothing is placed', () => {
    const d = make();
    expect(d.g.off.alarm).toBe(true);
    expect(placeAt(d, 'alarm', 'g0', true)).toBe(false);
    expect(d.g.off.alarm).toBe(true);
    expect(lastToast(d)).toMatchObject({ text: 'アラーム は準備中です', act: null });
    expect(d.canUndo).toBe(false);
  });
  it('an implemented kind is added as before', () => {
    const d = make();
    d.g.off = { ...d.g.off, links: true };
    expect(placeAt(d, 'links', 'g0', true)).toBe(true);
    expect(d.g.off.links).toBeUndefined();
    expect(lastToast(d)?.text).toBe('クイックリンク を「ボード 1」に追加しました');
  });
  it('moving an already placed unimplemented kind (e.g. from a saved layout) still works', () => {
    const d = make();
    const g1 = d.addBoard();
    const off = { ...d.g.off };
    delete off.alarm;
    d.g.off = off;
    expect(placeAt(d, 'alarm', g1, true)).toBe(true);
    expect(d.g.place.alarm).toBe(g1);
  });
  it('「ボードに追加」 from temporary use keeps the 準備中 view open and does not place it', () => {
    const d = make();
    Object.assign(d.ui, { big: 'alarm', temp: 'alarm', ret: 'add' });
    placeTemp(d);
    expect(d.ui.temp).toBe('alarm');
    expect(d.g.off.alarm).toBe(true);
    expect(lastToast(d)?.text).toBe('アラーム は準備中です');
  });
});
