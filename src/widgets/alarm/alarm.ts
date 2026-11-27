/**
 * アラームの計算 (prototype `alarmTimes`, `alarms` in `renderVals()`, the alarm check in `tick()`).
 * 鳴らす時刻は「その時刻の分に入ったとき」（プロトタイプと同じ）。1秒ごとに数えず、次に鳴る時刻を期限にして待つ（runner.ts）。
 * 端末のスリープやタブが裏で timer が遅れても、**その分を過ぎていれば（1分より前に過ぎた期限は）鳴らさない**。過去の分を
 * まとめて鳴らすこともしない。
 */
import type { FieldValue } from '../../app/registry/registry';
import type { AskText } from '../../app/runtime/notify';

/** The permission request when a switch is turned on (shown by the frame through the shared notification). */
export const ALARM_ASK: AskText = { title: '鳴ったら通知しますか？', text: 'このタブを見ていないときも、アラームの時刻を知らせます。' };

/** Settings fallback (prototype `alarmTimes`). */
export const ALARM_DEFAULTS: readonly [string, string] = ['07:00', '22:30'];
/** A deadline missed by this much or more is not rung (the minute has passed). */
export const ALARM_LATE_MS = 60_000;

/** The two times from the placement's settings `a1`・`a2` (prototype `alarmTimes`). */
export function alarmTimes(cfg: (key: string) => FieldValue | undefined): [string, string] {
  return [String(cfg('a1') || ALARM_DEFAULTS[0]), String(cfg('a2') || ALARM_DEFAULTS[1])];
}

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
    if (at !== null && at > prev && at <= now && now - at < ALARM_LATE_MS) out.push(i);
  });
  return out;
}

/** The next time an alarm that is on rings, after `now`; null when all are off (nothing to wait for). */
export function nextAlarmAt(times: readonly string[], on: readonly boolean[], now: number): number | null {
  let best = Infinity;
  times.forEach((hm, i) => {
    if (!on[i]) return;
    for (const off of [0, 1]) {
      const at = occurrence(hm, now, off);
      if (at !== null && at > now) { best = Math.min(best, at); return; }
    }
  });
  return best === Infinity ? null : best;
}
