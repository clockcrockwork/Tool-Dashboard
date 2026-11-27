/**
 * 日本の祝日（実装ガイド 8章「カレンダー: 日本の祝日」: 振替休日・国民の休日を含む。春分・秋分は計算式で 2099年まで）.
 * Prototype: Main.dc.html `jpHol(y, m, d)`. 月間・週間カレンダーが使う純粋な計算（時刻・乱数を使わない）。
 *
 * - 決まりは今の「国民の祝日に関する法律」（2020年からの形: 天皇誕生日 2/23、体育の日→スポーツの日）。2020年と2021年の
 *   東京オリンピック・パラリンピックの特例（海の日・スポーツの日・山の日の移動）を入れる。2019年以前の改正・特例（即位の日など）は
 *   再現しない（その年もいまの決まりで数える）。
 * - 春分・秋分の日は近似式 `floor(20.8431 + 0.242194 (Y-1980) - floor((Y-1980)/4))`（秋分は 23.2488）。式が合うのは 1980〜2099年
 *   なので、その外の年は春分・秋分の日を出さない（ほかの祝日は出す）。
 * - 振替休日: 祝日が日曜なら、その後の最初の祝日でない日（2007年からの決まり）。
 * - 国民の休日: 前日と翌日が祝日（振替休日を除く）で、その日が祝日でも日曜でもない日。
 */

/** Years where the equinox formula holds (the spec: 2099年まで). */
export const EQUINOX_FIRST = 1980;
export const EQUINOX_LAST = 2099;

const FIXED: Readonly<Record<string, string>> = {
  '1-1': '元日', '2-11': '建国記念の日', '2-23': '天皇誕生日', '4-29': '昭和の日', '5-3': '憲法記念日', '5-4': 'みどりの日',
  '5-5': 'こどもの日', '8-11': '山の日', '11-3': '文化の日', '11-23': '勤労感謝の日',
};

/** 2020・2021年の特例（東京大会）: moved days, by year. The usual day of each moved holiday is not a holiday that year. */
const MOVED: Readonly<Record<number, Readonly<Record<string, string>>>> = {
  2020: { '7-23': '海の日', '7-24': 'スポーツの日', '8-10': '山の日' },
  2021: { '7-22': '海の日', '7-23': 'スポーツの日', '8-8': '山の日' },
};

/** Day of March (春分) or September (秋分) of year `y`, or null outside 1980–2099. */
export function equinoxDay(y: number, which: 'spring' | 'autumn'): number | null {
  if (!Number.isInteger(y) || y < EQUINOX_FIRST || y > EQUINOX_LAST) return null;
  const q = Math.floor((y - 1980) / 4);
  const base = which === 'spring' ? 20.8431 : 23.2488;
  return Math.floor(base + 0.242194 * (y - 1980) - q);
}

/** 国民の祝日 (no substitute or citizens' holidays) of `y-m-d` (`m` is 1–12), or ''. */
export function baseHoliday(y: number, m: number, d: number): string {
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return '';
  const key = String(m) + '-' + String(d);
  const moved = MOVED[y];
  if (moved) {
    if (moved[key]) return moved[key];
    // The usual days of the moved holidays (海の日・スポーツの日・山の日) are working days in those years.
    if (key === '8-11') return '';
  }
  const fx = FIXED[key];
  if (fx) return fx;
  const w = dt.getDay();
  const nth = Math.floor((d - 1) / 7) + 1;
  if (w === 1 && m === 1 && nth === 2) return '成人の日';
  if (w === 1 && m === 7 && nth === 3) return moved ? '' : '海の日';
  if (w === 1 && m === 9 && nth === 3) return '敬老の日';
  if (w === 1 && m === 10 && nth === 2) return moved ? '' : 'スポーツの日';
  if (m === 3 && d === equinoxDay(y, 'spring')) return '春分の日';
  if (m === 9 && d === equinoxDay(y, 'autumn')) return '秋分の日';
  return '';
}

const at = (y: number, m: number, d: number): Date => new Date(y, m - 1, d);
const baseOf = (dt: Date): string => baseHoliday(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());

/** The holiday name of `y-m-d` (`m` is 1–12): a 国民の祝日, 振替休日 or 国民の休日; '' for other days and invalid dates. */
export function jpHoliday(y: number, m: number, d: number): string {
  const n = baseHoliday(y, m, d);
  if (n) return n;
  const dt = at(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return '';
  // 振替休日: the run of holidays just before this day starts on (or contains) a Sunday.
  for (let k = 1; k < 7; k++) {
    const p = at(y, m, d - k);
    if (!baseOf(p)) break;
    if (p.getDay() === 0) return '振替休日';
  }
  // 国民の休日: between two holidays (not on a Sunday).
  if (dt.getDay() !== 0 && baseOf(at(y, m, d - 1)) && baseOf(at(y, m, d + 1))) return '国民の休日';
  return '';
}

/** Every holiday of year `y` as `[month, day, name]`, in date order. */
export function holidaysOf(y: number): [number, number, string][] {
  const out: [number, number, string][] = [];
  for (let m = 1; m <= 12; m++) {
    const dim = new Date(y, m, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const n = jpHoliday(y, m, d);
      if (n) out.push([m, d, n]);
    }
  }
  return out;
}
