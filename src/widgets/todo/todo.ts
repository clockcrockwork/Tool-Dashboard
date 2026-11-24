/** TODO の計算 (prototype `todoKey`, `todos`, `none.todo`, `todoPhrases`). */
import { TODO_MAX, type TodoItem } from './data';

/** 入力補助の帯の定型の接頭語. */
export const TODO_PHRASES = ['買う', '連絡', '確認', '予約'] as const;

/** Adds to the top; empty text is ignored; keeps at most 50. */
export function addTodo(items: readonly TodoItem[], text: string, id: number): TodoItem[] | null {
  const t = text.trim();
  if (!t) return null;
  return [{ id, t, done: false }, ...items].slice(0, TODO_MAX);
}

export function toggleTodo(items: readonly TodoItem[], id: number): TodoItem[] {
  return items.map(x => (x.id === id ? { ...x, done: !x.done } : x));
}

/** Puts 「買う：」 at the head of the input, replacing a previous short prefix. */
export function applyPhrase(value: string, phrase: string): string {
  return phrase + '：' + value.replace(/^[^：]{1,4}：/, '');
}

export function visibleTodos(items: readonly TodoItem[], hideDone: boolean): TodoItem[] {
  return items.filter(it => !(hideDone && it.done));
}

/** Empty line text, or null when something is shown (仕様書 3章「利用者が書きためるものが空のとき」). */
export function todoEmptyText(items: readonly TodoItem[], hideDone: boolean): string | null {
  const empty = !items.length || (hideDone && !items.some(x => !x.done));
  if (!empty) return null;
  return items.length ? 'すべて完了しました' : '上の欄に書いて Enter で追加します';
}

/**
 * Removes the row `id` added by one operation (メモからの追加の「元に戻す」) and puts back the rows that the 50-item limit
 * pushed out by that addition (`dropped`, at the bottom where they were). Other edits made since are kept; a dropped
 * row that is somehow back already is not duplicated, and the limit still applies.
 */
export function undoAddTodo(items: readonly TodoItem[], id: number, dropped: readonly TodoItem[] = []): TodoItem[] {
  const rest = items.filter(x => x.id !== id);
  const back = dropped.filter(x => !rest.some(y => y.id === x.id));
  return [...rest, ...back].slice(0, TODO_MAX);
}

/** Rows of `before` that are missing from `after` (pushed out by the limit). */
export function droppedRows<T extends { id: number }>(before: readonly T[], after: readonly T[]): T[] {
  return before.filter(x => !after.some(y => y.id === x.id));
}
