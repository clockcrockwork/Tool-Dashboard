/**
 * アラームの計算 (prototype `alarmTimes`, `alarms` in `renderVals()`, the alarm check in `tick()`).
 * 鳴らす時刻は「その時刻の分に入ったとき」（プロトタイプと同じ）。1秒ごとに数えず、次に鳴る時刻まで待つ（最長1分ごとに確かめ直す。
 * 端末のスリープで timer が遅れても、分を過ぎていれば鳴らさない）。
 */

/** Settings fallback (prototype `alarmTimes`). */
export const ALARM_DEFAULTS: readonly [string, string] = ['07:00', '22:30'];
/** Longest wait between checks (a sleeping device or a throttled tab can delay timers). */
export const ALARM_RECHECK_MS = 60_000;

/** Today's (the local day of `t`) occurrence of `HH:MM`, or null when the text is not a time. */
export function occurrence(hm: string, t: number, dayOffset = 0): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, h, mi).getTime();
}

/**
 * Indexes of the alarms that ring between two checks: on, and its minute began after `prev` and at or before `now`, and
 * we are still inside that minute (a check that comes later than that — sleep, closed lid — does not ring a stale alarm).
 */
export function alarmsDue(times: readonly string[], on: readonly boolean[], prev: number, now: number): number[] {
  const out: number[] = [];
  times.forEach((hm, i) => {
    if (!on[i]) return;
    // Only today's occurrence can qualify: yesterday's latest (23:59) is a minute or more before any time after midnight.
    const at = occurrence(hm, now);
    if (at !== null && at > prev && at <= now && now - at < 60_000) out.push(i);
  });
  return out;
}

/** Wait before the next check: until the next alarm minute (a little after it), at most a minute; null when all are off. */
export function nextCheckIn(times: readonly string[], on: readonly boolean[], now: number): number | null {
  let best = Infinity;
  times.forEach((hm, i) => {
    if (!on[i]) return;
    for (const off of [0, 1]) {
      const at = occurrence(hm, now, off);
      if (at !== null && at > now) { best = Math.min(best, at - now); return; }
    }
  });
  if (best === Infinity) return null;
  return Math.min(ALARM_RECHECK_MS, best + 20);
}
