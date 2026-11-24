import { describe, expect, it } from 'vitest';
import { AGENDA_MAX, addEvent, agendaData, initialAgenda } from './data';

const NOW = new Date(2026, 10, 19, 10, 24, 36).getTime();

describe('agenda data', () => {
  it('initial events follow the prototype (today 14:00 レビュー … 6日後 休み 終日)', () => {
    const e = initialAgenda(NOW).events;
    expect(e.map(x => [x.n, x.hasTime, x.c])).toEqual([['レビュー', true, 'a1'], ['定例', true, 'a2'], ['勉強会', true, 'a1'], ['休み', false, 'n']]);
    expect(e[0]?.ts).toBe(new Date(2026, 10, 19, 14, 0).getTime());
    expect(e[3]?.ts).toBe(new Date(2026, 10, 25, 0, 0).getTime());
  });
  it('addEvent keeps the newest 50', () => {
    let d = { events: [] as ReturnType<typeof initialAgenda>['events'] };
    for (let i = 0; i < 60; i++) d = addEvent(d, { id: i, ts: i, hasTime: false, n: String(i), c: 'a1' });
    expect(d.events).toHaveLength(AGENDA_MAX);
    expect(d.events[0]?.id).toBe(10);
  });
  it('sanitize', () => {
    expect(agendaData.sanitize({ events: [{ id: 1, ts: 2, hasTime: true, n: 'a', c: 'zz', q: 1 }, { id: 'x' }] }, 0))
      .toEqual({ events: [{ id: 1, ts: 2, hasTime: true, n: 'a', c: 'a1' }] });
    expect(agendaData.sanitize({}, 0)).toBeNull();
  });
});
