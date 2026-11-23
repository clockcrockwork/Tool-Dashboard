/**
 * 予定の記録 (区画 `w:agenda` の data). The agenda widget itself is P2b; the record is defined now so that
 * メモから予定への追加 can store events. Initial data = prototype `events`.
 */
import type { WidgetDataDef } from '../../app/store/store';
import { isBool, isNum, isObj, isStr, pickList } from '../shared/guards';

export type EventColor = 'a1' | 'a2' | 'n';
export type AgendaEvent = { id: number; ts: number; hasTime: boolean; n: string; c: EventColor };
export type AgendaData = { events: AgendaEvent[] };

export const AGENDA_MAX = 50;
const COLORS: readonly EventColor[] = ['a1', 'a2', 'n'];

/** [days from today, hour (-1 = 終日), minute, name, color]. */
const SEED: readonly (readonly [number, number, number, string, EventColor])[] = [[0, 14, 0, 'レビュー', 'a1'], [1, 10, 0, '定例', 'a2'], [3, 19, 0, '勉強会', 'a1'], [6, -1, 0, '休み', 'n']];

export function initialAgenda(now: number): AgendaData {
  const n = new Date(now);
  return {
    events: SEED.map((a, i) => {
      const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + a[0], a[1] < 0 ? 0 : a[1], a[2]);
      return { id: i + 1, ts: d.getTime(), hasTime: a[1] >= 0, n: a[3], c: a[4] };
    }),
  };
}

function pickEvent(x: unknown): AgendaEvent | null {
  if (!isObj(x) || !isNum(x.id) || !isNum(x.ts) || !isBool(x.hasTime) || !isStr(x.n)) return null;
  const c = COLORS.find(k => k === x.c) ?? 'a1';
  return { id: x.id, ts: x.ts, hasTime: x.hasTime, n: x.n, c };
}

export const agendaData: WidgetDataDef<AgendaData> = {
  version: 1,
  initial: now => initialAgenda(now),
  sanitize: raw => {
    if (!isObj(raw)) return null;
    const events = pickList(raw.events, pickEvent, AGENDA_MAX * 4);
    return events ? { events: events.slice(-AGENDA_MAX) } : null;
  },
};

/** Appends one event; keeps the newest 50 (prototype `.slice(-50)`). */
export function addEvent(data: AgendaData, ev: AgendaEvent): AgendaData {
  return { events: [...data.events, ev].slice(-AGENDA_MAX) };
}
