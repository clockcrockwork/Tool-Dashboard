/**
 * 予定の表示 (prototype `events`, `whenText`, `evCol`, `none.agenda` in `renderVals()`): 日時順の行。日付は今日・明日、
 * それより先（と前）は「11.25」、時刻があれば「 14:00」を添える。色の印は記録の色（a1・a2・n）。
 */
import type { AgendaEvent, EventColor } from './data';
import { dayStart, fm } from '../shared/time';

export const EVENT_COLOR: Readonly<Record<EventColor, string>> = { a1: 'var(--a1)', a2: 'var(--a2)', n: 'var(--fill2)' };

export type EventRow = { id: number; w: string; n: string; c: string };

/** 「今日 14:00」「明日」「11.25 19:00」 (`day0`: start of today). */
export function whenText(ts: number, hasTime: boolean, day0: number): string {
  const dd = Math.round((dayStart(ts) - day0) / 864e5);
  const d = new Date(ts);
  const day = dd === 0 ? '今日' : dd === 1 ? '明日' : String(d.getMonth() + 1) + '.' + String(d.getDate());
  return day + (hasTime ? ' ' + fm(ts) : '');
}

/** Rows in date order (the record keeps the order of addition). */
export function eventRows(events: readonly AgendaEvent[], now: number): EventRow[] {
  const day0 = dayStart(now);
  return [...events].sort((a, b) => a.ts - b.ts).map(ev => ({ id: ev.id, w: whenText(ev.ts, ev.hasTime, day0), n: ev.n, c: EVENT_COLOR[ev.c] }));
}

export const AGENDA_EMPTY = '予定はありません。メモに日時を書くと、ここへの追加を提案します';
