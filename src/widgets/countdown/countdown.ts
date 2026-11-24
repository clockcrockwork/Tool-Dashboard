/** カウントダウンの計算 (prototype `cdp`, `cdN`, `cdDays` in `renderVals()`). */

/**
 * Days from today (local) to `date` (`YYYY-MM-DD`, the `dt` setting): 「–」 when it cannot be read, 0 on and after the day.
 * Counted between local midnights, so summer-time shifts do not change the result.
 */
export function countdownDays(date: string, now: Date): string {
  const p = date.split('-').map(Number);
  const target = new Date(p[0] ?? NaN, (p[1] ?? NaN) - 1, p[2] ?? NaN).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const n = Math.ceil((target - today) / 864e5);
  return Number.isNaN(n) ? '–' : String(Math.max(0, n));
}
