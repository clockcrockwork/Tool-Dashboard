/**
 * カウンターの操作 (prototype `counters`, `cnAdd`, `cnDel`, `cnDelTog` in `renderVals()`). どれも純粋な関数で、部品とテストで同じものを使う.
 * 行の削除は個別の「元に戻す」で、消した行だけを元の位置に戻す（ほかの行の数や名前の変更は残す）。
 */
import { COUNTER_MAX, COUNTER_NAME_MAX, COUNT_MAX, type CounterItem } from './data';

/** The step setting (「ステップ」 1・5・10). */
export function stepOf(v: unknown): number {
  const n = Number(v);
  return n === 5 || n === 10 ? n : 1;
}

/** Adds `m` (negative to take) to one row; the count stays within 0…999,999. */
export function bump(items: readonly CounterItem[], id: number, m: number): CounterItem[] {
  return items.map(x => (x.id === id ? { ...x, v: Math.min(COUNT_MAX, Math.max(0, x.v + m)) } : x));
}

/** Sets a row from the number field; null when the text is not a count (the field then shows the old number again). */
export function setCount(items: readonly CounterItem[], id: number, text: string): CounterItem[] | null {
  const nv = parseInt(text, 10);
  if (!(nv >= 0) || nv > COUNT_MAX) return null;
  return items.map(x => (x.id === id ? { ...x, v: nv } : x));
}

export function rename(items: readonly CounterItem[], id: number, n: string): CounterItem[] {
  return items.map(x => (x.id === id ? { ...x, n: n.slice(0, COUNTER_NAME_MAX) } : x));
}

/** Appends a blank row (prototype `cnAdd`); null at the limit. */
export function addRow(items: readonly CounterItem[], id: number): CounterItem[] | null {
  if (items.length >= COUNTER_MAX) return null;
  return [...items, { id, n: '', v: 0 }];
}

/** What a removal took away: the row and where it was. */
export type Removed = Readonly<{ row: CounterItem; at: number }>;

export function removeRow(items: readonly CounterItem[], id: number): { items: CounterItem[]; removed: Removed | null } {
  const at = items.findIndex(x => x.id === id);
  const row = items[at];
  if (!row) return { items: [...items], removed: null };
  return { items: items.filter(x => x.id !== id), removed: { row, at } };
}

/** 「元に戻す」 of one removal on the current rows: puts the row back at its place; other edits stay. */
export function undoRemove(items: readonly CounterItem[], r: Removed): CounterItem[] {
  if (items.some(x => x.id === r.row.id) || items.length >= COUNTER_MAX) return [...items];
  const next = [...items];
  next.splice(Math.min(r.at, next.length), 0, r.row);
  return next;
}

/** Names read out (prototype `dl`, `gl`). */
export const deleteLabel = (x: CounterItem): string => (x.n || '項目') + ' を削除';
export const countLabel = (x: CounterItem): string => (x.n || '項目') + 'の数';

export const COUNTER_EMPTY = '下の「項目」で数えたいものを足します';
/** The toast after a removal (with 「元に戻す」). */
export const removedText = (x: CounterItem): string => (x.n || '項目') + ' を削除しました';
