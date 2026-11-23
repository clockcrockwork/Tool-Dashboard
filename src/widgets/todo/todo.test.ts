import { describe, expect, it } from 'vitest';
import { TODO_MAX, initialTodos, todoData, type TodoItem } from './data';
import { addTodo, applyPhrase, todoEmptyText, toggleTodo, visibleTodos } from './todo';

const items = initialTodos().items;

describe('todo', () => {
  it('initial data matches the prototype', () => {
    expect(items.map(x => [x.t, x.done])).toEqual([['PRレビュー', true], ['メール返信', false], ['買い物', false], ['30分散歩', false]]);
  });
  it('adds to the top, trims, ignores empty, keeps 50', () => {
    expect(addTodo(items, '  牛乳  ', 9)?.[0]).toEqual({ id: 9, t: '牛乳', done: false });
    expect(addTodo(items, '   ', 9)).toBeNull();
    const many: TodoItem[] = Array.from({ length: TODO_MAX }, (_v, i) => ({ id: i, t: String(i), done: false }));
    const next = addTodo(many, 'new', 100);
    expect(next).toHaveLength(TODO_MAX);
    expect(next?.[0]?.t).toBe('new');
    expect(next?.at(-1)?.t).toBe('48');
  });
  it('toggles one item', () => {
    expect(toggleTodo(items, 2).find(x => x.id === 2)?.done).toBe(true);
    expect(toggleTodo(items, 1).find(x => x.id === 1)?.done).toBe(false);
  });
  it('phrase prefix replaces a previous short prefix', () => {
    expect(applyPhrase('', '買う')).toBe('買う：');
    expect(applyPhrase('牛乳', '買う')).toBe('買う：牛乳');
    expect(applyPhrase('買う：牛乳', '確認')).toBe('確認：牛乳');
  });
  it('hide done and empty texts', () => {
    expect(visibleTodos(items, true).map(x => x.id)).toEqual([2, 3, 4]);
    expect(visibleTodos(items, false)).toHaveLength(4);
    expect(todoEmptyText(items, false)).toBeNull();
    expect(todoEmptyText([], false)).toBe('上の欄に書いて Enter で追加します');
    expect(todoEmptyText([{ id: 1, t: 'a', done: true }], true)).toBe('すべて完了しました');
    expect(todoEmptyText([{ id: 1, t: 'a', done: true }], false)).toBeNull();
  });
  it('sanitize drops unknown fields and broken items', () => {
    expect(todoData.sanitize({ items: [{ id: 1, t: 'a', done: false, x: 1 }, { id: 'x', t: 'b', done: false }], extra: 1 }, 0))
      .toEqual({ items: [{ id: 1, t: 'a', done: false }] });
    expect(todoData.sanitize([], 0)).toBeNull();
    expect(todoData.sanitize({ items: 'x' }, 0)).toBeNull();
    expect(todoData.sanitize({ items: Array.from({ length: 80 }, (_v, i) => ({ id: i, t: 'a', done: false })) }, 0)?.items).toHaveLength(TODO_MAX);
  });
});
