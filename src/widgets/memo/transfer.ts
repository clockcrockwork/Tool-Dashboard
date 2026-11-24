/**
 * メモから予定・TODOへの追加と、その「元に戻す」(仕様書 6章, review #3).
 * 元に戻すは全体の写しを戻さず、**追加した行の ID だけ**を消す。追加で上限から落ちた行は戻し、提案の結果（memo の `done`）は
 * その行の文面の分だけ前の値に戻す。追加のあとに行われたほかの編集（別の TODO・予定・提案の結果）は残す。
 */
import type { SugResult } from './data';
import type { LineCand } from './suggest';
import type { TodoData, TodoItem } from '../todo/data';
import { addTodo, droppedRows, undoAddTodo } from '../todo/todo';
import { addEvent, undoAddEvent, type AgendaData, type AgendaEvent } from '../agenda/data';

/** The records an addition from the memo touches. */
export type MemoTargets = { todo: TodoData; agenda: AgendaData; done: Readonly<Record<string, SugResult>> };

/** What one addition changed — enough to take back only that addition. */
export type MemoAddReceipt =
  | { kind: 'todo'; id: number; key: string; prev: SugResult | undefined; added: boolean; dropped: TodoItem[] }
  | { kind: 'ev'; id: number; key: string; prev: SugResult | undefined; added: boolean; dropped: AgendaEvent[] };

export function addFromMemo(t: MemoTargets, c: LineCand, id: number): { next: MemoTargets; receipt: MemoAddReceipt } {
  const done = { ...t.done, [c.key]: 'add' as const };
  const prev = t.done[c.key];
  if (c.kind === 'todo') {
    const items = addTodo(t.todo.items, c.title, id);
    const next = items ? { ...t, todo: { items }, done } : { ...t, done };
    return { next, receipt: { kind: 'todo', id, key: c.key, prev, added: !!items, dropped: items ? droppedRows(t.todo.items, items) : [] } };
  }
  const agenda = addEvent(t.agenda, { id, ts: c.ts, hasTime: c.hasTime, n: c.title, c: 'a1' });
  return { next: { ...t, agenda, done }, receipt: { kind: 'ev', id, key: c.key, prev, added: true, dropped: droppedRows(t.agenda.events, agenda.events) } };
}

/** Takes back one addition on the current records `t`; everything else in `t` stays. */
export function undoFromMemo(t: MemoTargets, r: MemoAddReceipt): MemoTargets {
  const done: Record<string, SugResult> = { ...t.done };
  // Only the result this addition wrote; an answer given to the line afterwards stays.
  if (done[r.key] === 'add') {
    if (r.prev === undefined) delete done[r.key];
    else done[r.key] = r.prev;
  }
  if (!r.added) return { ...t, done };
  if (r.kind === 'todo') return { ...t, todo: { items: undoAddTodo(t.todo.items, r.id, r.dropped) }, done };
  return { ...t, agenda: undoAddEvent(t.agenda, r.id, r.dropped), done };
}
