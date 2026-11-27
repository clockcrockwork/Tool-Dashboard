/** ハビットの表示と操作 (prototype `habits` in `renderVals()`, `none.habit`). 切替の丸ボタン群（仕様書 3章「操作の部品」）. */
import { iconPath } from '../../app/registry/icons';
import type { HabitItem } from './data';

export type HabitView = { id: number; label: string; d: string; img: string; on: boolean };

export function habitView(h: HabitItem): HabitView {
  return { id: h.id, label: h.label || '名前のない項目', d: iconPath(h.ic), img: h.img ?? '', on: h.on };
}

/** Flips one item; returns the new list and whether it became achieved. */
export function toggleHabit(items: readonly HabitItem[], id: number): { items: HabitItem[]; done: HabitItem | null } {
  let done: HabitItem | null = null;
  const next = items.map((x) => {
    if (x.id !== id) return x;
    const y = { ...x, on: !x.on };
    if (y.on) done = y;
    return y;
  });
  return { items: next, done };
}

/** 「達成を通知」の文 (prototype `(h.label || '項目') + ' 達成'`). */
export function achievedText(h: HabitItem): string {
  return (h.label || '項目') + ' 達成';
}

/** The key of one achievement (one tap): placement, item and time, so each tap notifies once. */
export function achievedKey(placement: string, h: HabitItem, at: number): string {
  return 'habit:' + placement + ':' + String(h.id) + ':' + String(at);
}

export const HABIT_EMPTY = '続けたいことを項目に足します';
