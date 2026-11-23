/** TODO の記録 (区画 `w:todo` の data). 上限50件. */
import type { WidgetDataDef } from '../../app/store/store';
import { isBool, isNum, isObj, isStr, pickList } from '../shared/guards';

export type TodoItem = { id: number; t: string; done: boolean };
export type TodoData = { items: TodoItem[] };

export const TODO_MAX = 50;

export function initialTodos(): TodoData {
  return {
    items: [
      { id: 1, t: 'PRレビュー', done: true },
      { id: 2, t: 'メール返信', done: false },
      { id: 3, t: '買い物', done: false },
      { id: 4, t: '30分散歩', done: false },
    ],
  };
}

function pickItem(x: unknown): TodoItem | null {
  if (!isObj(x) || !isNum(x.id) || !isStr(x.t) || !isBool(x.done)) return null;
  return { id: x.id, t: x.t, done: x.done };
}

export const todoData: WidgetDataDef<TodoData> = {
  version: 1,
  initial: () => initialTodos(),
  sanitize: raw => {
    if (!isObj(raw)) return null;
    const items = pickList(raw.items, pickItem, TODO_MAX);
    return items ? { items } : null;
  },
};
