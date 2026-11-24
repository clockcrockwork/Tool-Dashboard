/** タイムログの計算 (prototype `addLog`, `logs`, `logMarks`, `dayNow`, `logPhrases`, `none.timelog`). */
import { dayPos, dayStart, fm } from '../shared/time';
import { LOG_MAX, LOG_TEXT_MAX, type LogItem } from './data';

/** 入力補助の帯の定型の言葉（押すとその場で記録、仕様書 6章）. */
export const LOG_PHRASES = ['作業', '会議', '休憩', '移動', '完了'] as const;

/** Adds `text` at `t` with row `id` at the end; empty text is ignored; keeps the newest 40. */
export function addLog(logs: readonly LogItem[], text: string, t: number, id: number): LogItem[] | null {
  const x = text.trim().slice(0, LOG_TEXT_MAX);
  if (!x) return null;
  return [...logs, { id, t, x }].slice(-LOG_MAX);
}

/**
 * Takes back one addition (打刻からの追加の「元に戻す」): removes row `id` and puts back the rows the limit pushed out by it
 * (`dropped`, at the old end where they were). Other rows added or kept since stay; the limit still applies.
 */
export function undoAddLog(logs: readonly LogItem[], id: number, dropped: readonly LogItem[] = []): LogItem[] {
  const rest = logs.filter(x => x.id !== id);
  const back = dropped.filter(x => !rest.some(y => y.id === x.id));
  return [...back, ...rest].slice(-LOG_MAX);
}

/** Rows shown, newest first (the list is drawn bottom-up with column-reverse, like the prototype). */
export function logRows(logs: readonly LogItem[], sec: boolean): { id: number; t: string; x: string }[] {
  return logs.slice().reverse().map(l => ({ id: l.id, t: fm(l.t, sec), x: l.x }));
}

/** Marks of today's rows on the 0–24 h bar. */
export function logMarks(logs: readonly LogItem[], now: number): string[] {
  const day0 = dayStart(now);
  return logs.filter(l => l.t >= day0).map(l => dayPos(l.t, day0));
}

export function dayNowPos(now: number): string {
  return dayPos(now, dayStart(now));
}

/** A row ID not used yet: the time, or one past the largest ID when rows were added within the same millisecond. */
export function nextLogId(logs: readonly LogItem[], now: number): number {
  return Math.max(now, ...logs.map(x => x.id + 1));
}
