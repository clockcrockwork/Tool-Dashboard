/**
 * タイムログの記録 (区画 `w:timelog` の data, prototype `logs`). 古い順に並べ、上限40件（仕様書 3章）で古いものから落とす.
 * 行に ID を持たせる（プロトタイプは時刻と文だけ）: 打刻から足した行を、その行だけ「元に戻す」で消すため（review #3）.
 */
import type { WidgetDataDef } from '../../app/store/store';
import { isNum, isObj, isStr } from '../shared/guards';
import { dayStart } from '../shared/time';

export type LogItem = { id: number; t: number; x: string };
export type TimelogData = { logs: LogItem[] };

export const LOG_MAX = 40;
/** Longest text kept for one row (the input has no limit in the prototype; this keeps a pasted page out of the record). */
export const LOG_TEXT_MAX = 200;

/** Prototype sample: 作業開始 3時間前・レビュー対応 95分前・休憩 25分前（今日の0時より前にはしない）. */
export function initialLogs(now: number): TimelogData {
  const day0 = dayStart(now);
  const src: readonly (readonly [number, string])[] = [[180, '作業開始'], [95, 'レビュー対応'], [25, '休憩']];
  return { logs: src.map(([m, x], i) => ({ id: i + 1, t: Math.max(day0, now - m * 60000), x })) };
}

function pickLog(v: unknown): LogItem | null {
  if (!isObj(v) || !isNum(v.id) || !isNum(v.t) || v.t < 0 || !isStr(v.x)) return null;
  const x = v.x.trim().slice(0, LOG_TEXT_MAX);
  return x ? { id: v.id, t: v.t, x } : null;
}

export const timelogData: WidgetDataDef<TimelogData> = {
  version: 1,
  initial: now => initialLogs(now),
  sanitize: raw => {
    if (!isObj(raw) || !Array.isArray(raw.logs)) return null;
    const seen = new Set<number>();
    const logs: LogItem[] = [];
    for (const v of raw.logs as unknown[]) {
      const it = pickLog(v);
      if (!it || seen.has(it.id)) continue;
      seen.add(it.id);
      logs.push(it);
    }
    // The newest are kept (the list grows at the end).
    return { logs: logs.slice(-LOG_MAX) };
  },
};
