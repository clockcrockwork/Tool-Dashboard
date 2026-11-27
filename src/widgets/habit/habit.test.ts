import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../app/store/store';
import { memoryStore, widgetKey } from '../../app/store/persist';
import { addItem, itemsOf, patchItem, removeItem } from '../../app/store/sheets';
import { VEILED_TOAST, resetNotifyApi } from '../../app/runtime/notify';
import { fakeNotify, toastTexts } from '../../app/runtime/test-fixtures';
import { WIDGET_DATA } from '../index';
import { HABIT_LABEL_MAX, HABIT_MAX, habitData, initialHabits, type HabitData } from './data';
import { achievedKey, habitView, toggleHabit } from './habit';
import { habitTap } from './actions';

const T0 = new Date(2026, 10, 19, 10, 24, 36).getTime();
const make = (store = memoryStore()): Dashboard => new Dashboard({ store, dataDefs: WIDGET_DATA });

beforeEach(() => { vi.useFakeTimers({ now: T0 }); });
afterEach(() => { vi.useRealTimers(); resetNotifyApi(); });

describe('ハビットの記録', () => {
  it('initial = prototype habitItems', () => {
    expect(initialHabits().items.map(x => [x.label, x.ic, x.on])).toEqual([['水を飲む', 'drop', true], ['読書', 'book', false], ['運動', 'pulse', false], ['早寝', 'moon', false]]);
  });
  it('sanitize: drops broken items, unknown fields, duplicate IDs; caps label and count; bad images are dropped', () => {
    const raw = {
      items: [
        { id: 1, label: 'a'.repeat(99), ic: 'drop', on: true, url: '', x: 1 },
        { id: 1, label: 'dup', ic: 'drop', on: false },
        { id: 2, label: 'b', ic: 'star' },
        { id: 3, label: 'c', ic: 'star', on: 'yes' },
        { id: 'x', label: 'd', ic: 'star', on: false },
        { id: 4, label: 'e', ic: 'star', on: false, img: 'javascript:alert(1)' },
        { id: 5, label: 'f', ic: 'star', on: false, img: 'data:image/png;base64,AAAA' },
      ],
    };
    const s = habitData.sanitize(raw, T0);
    expect(s?.items).toEqual([
      { id: 1, label: 'a'.repeat(HABIT_LABEL_MAX), ic: 'drop', on: true },
      { id: 2, label: 'b', ic: 'star', on: false },
      { id: 4, label: 'e', ic: 'star', on: false },
      { id: 5, label: 'f', ic: 'star', on: false, img: 'data:image/png;base64,AAAA' },
    ]);
    expect(habitData.sanitize({ items: 'x' }, T0)).toBeNull();
    expect(habitData.sanitize(null, T0)).toBeNull();
    const many = { items: Array.from({ length: 40 }, (_v, i) => ({ id: i, label: String(i), ic: 'star', on: false })) };
    expect(habitData.sanitize(many, T0)?.items).toHaveLength(HABIT_MAX);
  });
  it('the settings sheet edits the items (共通の項目の編集); its extra url field is not saved', async () => {
    const store = memoryStore();
    const d = make(store);
    const stop = d.start();
    addItem(d, 'habit');
    const added = itemsOf(d, 'habit').at(-1);
    expect(added).toMatchObject({ label: '', ic: 'star', on: false });
    patchItem(d, 'habit', added?.id ?? 0, { label: '散歩', ic: 'leaf' });
    removeItem(d, 'habit', 2);
    await Promise.resolve();
    await vi.runAllTimersAsync();
    const sec = JSON.parse(store.get(widgetKey('habit')) ?? '{}') as { data: HabitData };
    expect(sec.data.items.map(x => x.label)).toEqual(['水を飲む', '運動', '早寝', '散歩']);
    expect(JSON.stringify(sec.data)).not.toContain('url');
    const again = make(store);
    expect(again.dataOf<HabitData>('habit').items.at(-1)).toMatchObject({ label: '散歩', ic: 'leaf', on: false });
    stop();
  });
});

describe('ハビットの操作と「達成を通知」（共通の通知）', () => {
  it('toggle and view', () => {
    const r = toggleHabit(initialHabits().items, 2);
    expect(r.done?.label).toBe('読書');
    expect(toggleHabit(r.items, 2).done).toBeNull();
    expect(habitView({ id: 9, label: '', ic: 'nope', on: false }).label).toBe('名前のない項目');
    expect(achievedKey('habit#2', { id: 3, label: '', ic: '', on: true }, 5)).toBe('habit:habit#2:3:5');
  });
  it('achieving notifies once per tap; turning off does not', () => {
    fakeNotify('granted');
    const d = make();
    expect(habitTap(d, 'habit', 2)).toBe('shown');
    expect(toastTexts(d)).toEqual(['読書 達成']);
    expect(habitTap(d, 'habit', 2)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(habitTap(d, 'habit', 2)).toBe('shown');
    expect(d.dataOf<HabitData>('habit').items.find(x => x.id === 2)?.on).toBe(true);
  });
  it('「達成を通知」がオフなら知らせない（達成は記録する）', () => {
    fakeNotify('granted');
    const d = make();
    d.setCfg('habit', 'notify', false);
    expect(habitTap(d, 'habit', 3)).toBe('off');
    expect(d.ui.toasts).toEqual([]);
    expect(d.dataOf<HabitData>('habit').items.find(x => x.id === 3)?.on).toBe(true);
  });
  it('人前では隠すの間も記録と知らせは続き、文は伏せる（項目名を出さない）', () => {
    fakeNotify('granted');
    const d = make();
    d.g.gs.veil = true;
    d.setCfg('habit', 'veil', true);
    expect(habitTap(d, 'habit', 4)).toBe('veiled');
    expect(toastTexts(d)).toEqual([VEILED_TOAST]);
    expect(toastTexts(d).join()).not.toContain('早寝');
  });
  it('placements keep their own items (habit / habit#2)', () => {
    fakeNotify('granted');
    const d = make();
    d.setData<HabitData>('habit#2', { items: [{ id: 1, label: '別', ic: 'star', on: false }] });
    habitTap(d, 'habit#2', 1);
    expect(d.dataOf<HabitData>('habit').items.find(x => x.id === 1)?.on).toBe(true);
    expect(d.dataOf<HabitData>('habit#2').items[0]?.on).toBe(true);
  });
});
