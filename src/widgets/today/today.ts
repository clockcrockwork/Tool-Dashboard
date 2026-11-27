/**
 * 今日は何の日 (today) — 文字だけで伝える型（仕様書 3章: 左に大きな手がかり、右に本文と補足）. プロトタイプ `renderVals()` の
 * `tdDay`・`tdMonth`・`tdName` を移した。日付は端末の日付。記念日が無い日は「記念日データ未設定」。
 */
export const TODAY_NONE = '記念日データ未設定';

/** `11-17`: the month and day of `t` (local time). The key of the content to fetch. */
export function todayKey(t: number): string {
  const d = new Date(t);
  return String(d.getMonth() + 1) + '-' + String(d.getDate());
}

export type TodayView = { day: string; month: string; name: string };

/** The day shown with its content (`key` is the day the content is for, so the date and the name always match). */
export function todayView(key: string, name: string | null): TodayView {
  const [m, day] = key.split('-');
  return { day: day ?? '', month: (m ?? '') + '月', name: name || TODAY_NONE };
}
