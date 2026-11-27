/**
 * 月間カレンダーの計算 (prototype `monthCells`, `monthDow`, `monthLabel`, `monthHol` in `renderVals()`).
 * 祝日は `--hol` と下線（CSS `.td.hol`）、読み上げで祝日名（`.vh`）。見出しに今月の次の祝日（今日を含む）。
 */
import { jpHoliday } from './holiday';

/** 曜日の名前 (prototype `dows`, Sunday first). */
export const DOWS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export type DayCell = { d: number | ''; cls: string; hol: boolean; hn: string };

const p2 = (n: number): string => String(n).padStart(2, '0');

/** `2026.11`. */
export function monthLabel(now: Date): string {
  return String(now.getFullYear()) + '.' + p2(now.getMonth() + 1);
}

/** The 7 weekday labels, starting on Sunday (`sun`) or Monday. */
export function weekdayLabels(sun: boolean): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map(i => DOWS[(i + (sun ? 0 : 1)) % 7] ?? '');
}

/** Leading blanks, then one cell per day of the month of `now` (today `on`, holidays `hol`). */
export function monthCells(now: Date, sun: boolean): DayCell[] {
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const firstDow = new Date(y, m, 1).getDay();
  const lead = sun ? firstDow : (firstDow + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const out: DayCell[] = [];
  for (let i = 0; i < lead; i++) out.push({ d: '', cls: '', hol: false, hn: '' });
  for (let d = 1; d <= dim; d++) {
    const hn = jpHoliday(y, m + 1, d);
    out.push({ d, cls: (d === today ? 'on' : '') + (hn ? ' hol' : ''), hol: !!hn, hn: '、' + hn });
  }
  return out;
}

/** The next holiday of this month from today on: 「今日 勤労感謝の日」「23日 勤労感謝の日」, or '' when none is left. */
export function nextHolidayText(now: Date): string {
  const y = now.getFullYear(), m = now.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  for (let d = now.getDate(); d <= dim; d++) {
    const hn = jpHoliday(y, m + 1, d);
    if (hn) return (d === now.getDate() ? '今日 ' : String(d) + '日 ') + hn;
  }
  return '';
}
