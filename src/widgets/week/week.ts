/**
 * 週間カレンダーの計算 (prototype `week` in `renderVals()`): 今日を含む1週間（週の始まりは設定）、今日の印、日本の祝日
 * （`--hol`・下線・読み上げで祝日名）。点は見本（`sample.ts`）。
 */
import { jpHoliday } from '../month/holiday';
import { DOWS } from '../month/month';
import { WEEK_DOTS_SAMPLE } from './sample';

export type WeekDay = { dow: string; d: number; cls: string; dots: string; hol: boolean; hn: string };

/** The 7 days of the week of `now`, starting on Sunday (`sun`) or Monday. */
export function weekDays(now: Date, sun: boolean): WeekDay[] {
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const first = new Date(y, m, today - (sun ? now.getDay() : (now.getDay() + 6) % 7));
  const out: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    const hn = jpHoliday(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const isToday = d.getFullYear() === y && d.getMonth() === m && d.getDate() === today;
    out.push({
      dow: DOWS[d.getDay()] ?? '',
      d: d.getDate(),
      cls: (isToday ? 'on' : '') + (hn ? ' hol' : ''),
      dots: WEEK_DOTS_SAMPLE[(d.getDay() + 6) % 7] ?? '',
      hol: !!hn,
      hn: '、' + hn,
    });
  }
  return out;
}
