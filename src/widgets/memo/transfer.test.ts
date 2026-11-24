import { describe, expect, it } from 'vitest';
import { candidates, type LineCand } from './suggest';
import { addFromMemo, undoFromMemo, type MemoTargets } from './transfer';
import { TODO_MAX, initialTodos, type TodoItem } from '../todo/data';
import { addTodo, toggleTodo } from '../todo/todo';
import { AGENDA_MAX, addEvent, initialAgenda, type AgendaEvent } from '../agenda/data';

const NOW = new Date(2026, 10, 19, 10, 24, 36);
const cand = (ln: string): LineCand => {
  const c = candidates([ln], {}, NOW)[0];
  if (!c) throw new Error('not a candidate: ' + ln);
  return c;
};
const start = (): MemoTargets => ({ todo: initialTodos(), agenda: initialAgenda(NOW.getTime()), done: {} });

describe('メモからの追加の元に戻す (review #3: 追加した行の ID だけを戻す)', () => {
  it('TODO: 追加 → 別の TODO を編集・追加 → 元に戻す で、別の編集が残る', () => {
    const s0 = start();
    const { next: s1, receipt } = addFromMemo(s0, cand('- [ ] 牛乳を買う'), 100);
    expect(s1.todo.items[0]).toEqual({ id: 100, t: '牛乳を買う', done: false });
    expect(s1.done).toEqual({ '- [ ] 牛乳を買う': 'add' });
    expect(s1.agenda).toBe(s0.agenda);
    // 別の編集: 既存の TODO を完了にし、新しい TODO を足し、別の行の提案に答える
    const s2: MemoTargets = {
      ...s1,
      todo: { items: addTodo(toggleTodo(s1.todo.items, 2), '電話', 200) ?? [] },
      done: { ...s1.done, '明日 14:00 打ち合わせ': 'skip' },
    };
    const s3 = undoFromMemo(s2, receipt);
    expect(s3.todo.items.map(x => x.id)).toEqual([200, 1, 2, 3, 4]);
    expect(s3.todo.items.find(x => x.id === 2)?.done).toBe(true);
    expect(s3.done).toEqual({ '明日 14:00 打ち合わせ': 'skip' });
    expect(s3.agenda).toBe(s2.agenda);
  });

  it('予定: 追加 → 別の予定を追加 → 元に戻す で、追加した予定だけが消える', () => {
    const s0 = start();
    const { next: s1, receipt } = addFromMemo(s0, cand('明日 14:00 打ち合わせ'), 100);
    expect(s1.agenda.events.at(-1)).toMatchObject({ id: 100, n: '打ち合わせ', hasTime: true, c: 'a1' });
    const s2: MemoTargets = { ...s1, agenda: addEvent(s1.agenda, { id: 200, ts: 5, hasTime: false, n: '別', c: 'a2' }) };
    const s3 = undoFromMemo(s2, receipt);
    expect(s3.agenda.events.map(x => x.id)).toEqual([1, 2, 3, 4, 200]);
    expect(s3.todo).toBe(s2.todo);
    expect(s3.done).toEqual({});
  });

  it('TODO: 上限で落ちた一番古い行も戻す', () => {
    const items: TodoItem[] = Array.from({ length: TODO_MAX }, (_v, i) => ({ id: i + 1, t: 't' + String(i + 1), done: false }));
    const s0: MemoTargets = { ...start(), todo: { items } };
    const { next: s1, receipt } = addFromMemo(s0, cand('- [ ] 牛乳を買う'), 100);
    expect(s1.todo.items).toHaveLength(TODO_MAX);
    expect(s1.todo.items.some(x => x.id === TODO_MAX)).toBe(false);
    const s2: MemoTargets = { ...s1, todo: { items: toggleTodo(s1.todo.items, 1) } };
    const s3 = undoFromMemo(s2, receipt);
    expect(s3.todo.items).toHaveLength(TODO_MAX);
    expect(s3.todo.items.map(x => x.id)).toEqual(items.map(x => x.id));
    expect(s3.todo.items[0]?.done).toBe(true); // 別の編集は残る
  });

  it('予定: 上限で落ちた一番古い予定も戻す', () => {
    const events: AgendaEvent[] = Array.from({ length: AGENDA_MAX }, (_v, i) => ({ id: i + 1, ts: i, hasTime: false, n: String(i), c: 'a1' }));
    const s0: MemoTargets = { ...start(), agenda: { events } };
    const { next: s1, receipt } = addFromMemo(s0, cand('明日 14:00 打ち合わせ'), 100);
    expect(s1.agenda.events[0]?.id).toBe(2);
    const s3 = undoFromMemo(s1, receipt);
    expect(s3.agenda.events.map(x => x.id)).toEqual(events.map(x => x.id));
  });

  it('戻した行が既に無い・別の答えに変わった場合は、ほかを変えない', () => {
    const s0 = start();
    const { next: s1, receipt } = addFromMemo(s0, cand('- [ ] 牛乳を買う'), 100);
    const s2: MemoTargets = { ...s1, todo: { items: s1.todo.items.filter(x => x.id !== 100) }, done: { '- [ ] 牛乳を買う': 'skip' } };
    const s3 = undoFromMemo(s2, receipt);
    expect(s3.todo.items).toEqual(s2.todo.items);
    expect(s3.done).toEqual({ '- [ ] 牛乳を買う': 'skip' });
  });

  it('前に「追加しない」だった行を追加して戻すと、前の答えに戻る', () => {
    const s0: MemoTargets = { ...start(), done: { '- [ ] 牛乳を買う': 'skip', other: 'add' } };
    const { next: s1, receipt } = addFromMemo(s0, cand('- [ ] 牛乳を買う'), 100);
    expect(undoFromMemo(s1, receipt).done).toEqual({ '- [ ] 牛乳を買う': 'skip', other: 'add' });
  });
});
