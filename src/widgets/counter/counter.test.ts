import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../app/store/store';
import { memoryStore, widgetKey } from '../../app/store/persist';
import { WIDGET_DATA } from '../index';
import { COUNTER_MAX, COUNTER_NAME_MAX, COUNT_MAX, counterData, initialCounters, type CounterData } from './data';
import { addRow, bump, countLabel, deleteLabel, rename, setCount, stepOf, undoRemove, removeRow } from './counter';
import { counterRemove } from './actions';

const T0 = new Date(2026, 10, 19, 10, 24, 36).getTime();
const make = (store = memoryStore()): Dashboard => new Dashboard({ store, dataDefs: WIDGET_DATA });

beforeEach(() => { vi.useFakeTimers({ now: T0 }); });
afterEach(() => { vi.useRealTimers(); });

describe('カウンターの記録', () => {
  it('initial = prototype counters (水・コーヒー、0)', () => {
    expect(initialCounters()).toEqual({ items: [{ id: 1, n: '水', v: 0 }, { id: 2, n: 'コーヒー', v: 0 }] });
  });
  it('sanitize: bad counts become 0, names are cut, duplicates and broken rows are dropped, the list is capped', () => {
    const s = counterData.sanitize({ items: [
      { id: 1, n: '水', v: 3, extra: 1 }, { id: 2, n: 'a'.repeat(99), v: -1 }, { id: 3, n: 'b', v: 1.5 }, { id: 4, n: 'c', v: COUNT_MAX + 1 },
      { id: 5, n: 'd', v: '7' }, { id: 1, n: 'dup', v: 1 }, { id: 'x', n: 'e', v: 1 }, { id: 6, v: 1 },
    ] }, T0);
    expect(s?.items).toEqual([
      { id: 1, n: '水', v: 3 }, { id: 2, n: 'a'.repeat(COUNTER_NAME_MAX), v: 0 }, { id: 3, n: 'b', v: 0 }, { id: 4, n: 'c', v: 0 }, { id: 5, n: 'd', v: 0 },
    ]);
    expect(counterData.sanitize({}, T0)).toBeNull();
    expect(counterData.sanitize({ items: Array.from({ length: 50 }, (_v, i) => ({ id: i, n: '', v: 0 })) }, T0)?.items).toHaveLength(COUNTER_MAX);
  });
});

describe('カウンターの操作', () => {
  const items = initialCounters().items;
  it('step setting, never below 0, capped', () => {
    expect([stepOf('1'), stepOf('5'), stepOf('10'), stepOf('3'), stepOf(undefined)]).toEqual([1, 5, 10, 1, 1]);
    expect(bump(items, 1, -1)[0]?.v).toBe(0);
    expect(bump(items, 1, 10)[0]?.v).toBe(10);
    expect(bump([{ id: 1, n: '', v: COUNT_MAX - 2 }], 1, 10)[0]?.v).toBe(COUNT_MAX);
  });
  it('the number field accepts whole counts only', () => {
    expect(setCount(items, 2, '12')?.[1]?.v).toBe(12);
    expect(setCount(items, 2, '-3')).toBeNull();
    expect(setCount(items, 2, '')).toBeNull();
    expect(setCount(items, 2, 'abc')).toBeNull();
    expect(setCount(items, 2, String(COUNT_MAX + 1))).toBeNull();
  });
  it('rename, add (limit), labels', () => {
    expect(rename(items, 1, 'x'.repeat(60))[0]?.n).toHaveLength(COUNTER_NAME_MAX);
    expect(addRow(items, 9)?.at(-1)).toEqual({ id: 9, n: '', v: 0 });
    expect(addRow(Array.from({ length: COUNTER_MAX }, (_v, i) => ({ id: i, n: '', v: 0 })), 99)).toBeNull();
    expect(deleteLabel({ id: 1, n: '水', v: 0 })).toBe('水 を削除');
    expect(countLabel({ id: 1, n: '', v: 0 })).toBe('項目の数');
  });
  it('元に戻す puts back only the removed row, at its place; other edits stay', () => {
    const r = removeRow([...items, { id: 3, n: '紅茶', v: 2 }], 2);
    expect(r.items.map(x => x.id)).toEqual([1, 3]);
    const edited = bump(r.items, 1, 5);
    const back = undoRemove(edited, r.removed!);
    expect(back).toEqual([{ id: 1, n: '水', v: 5 }, { id: 2, n: 'コーヒー', v: 0 }, { id: 3, n: '紅茶', v: 2 }]);
    expect(undoRemove(back, r.removed!)).toEqual(back);
  });
  it('removal from the widget: toast with 元に戻す; the record is saved without the row and comes back', async () => {
    const store = memoryStore();
    const d = make(store);
    const stop = d.start();
    counterRemove(d, 'counter', 1);
    expect(d.ui.toasts.map(t => t.text)).toEqual(['水 を削除しました']);
    const undo = d.ui.toasts[0]?.act;
    d.setData<CounterData>('counter', { items: bump(d.dataOf<CounterData>('counter').items, 2, 4) });
    await vi.runOnlyPendingTimersAsync();
    expect((JSON.parse(store.get(widgetKey('counter')) ?? '{}') as { data: CounterData }).data.items.map(x => x.n)).toEqual(['コーヒー']);
    undo?.fn();
    expect(d.dataOf<CounterData>('counter').items).toEqual([{ id: 1, n: '水', v: 0 }, { id: 2, n: 'コーヒー', v: 4 }]);
    counterRemove(d, 'counter', 99);
    stop();
  });
});
