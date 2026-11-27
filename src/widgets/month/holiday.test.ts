import { describe, expect, it } from 'vitest';
import { EQUINOX_FIRST, EQUINOX_LAST, baseHoliday, equinoxDay, holidaysOf, jpHoliday } from './holiday';

const list = (y: number): string[] => holidaysOf(y).map(([m, d, n]) => String(m) + '/' + String(d) + ' ' + n);

describe('日本の祝日 (実装ガイド 8章、prototype jpHol)', () => {
  it('2026: 振替休日（5/6）と国民の休日（9/22）を含む', () => {
    expect(list(2026)).toEqual([
      '1/1 元日', '1/12 成人の日', '2/11 建国記念の日', '2/23 天皇誕生日', '3/20 春分の日', '4/29 昭和の日', '5/3 憲法記念日',
      '5/4 みどりの日', '5/5 こどもの日', '5/6 振替休日', '7/20 海の日', '8/11 山の日', '9/21 敬老の日', '9/22 国民の休日',
      '9/23 秋分の日', '10/12 スポーツの日', '11/3 文化の日', '11/23 勤労感謝の日',
    ]);
  });
  it('2025: 日曜の祝日の翌日（2/24・5/6・11/24）が振替休日', () => {
    expect(list(2025)).toEqual([
      '1/1 元日', '1/13 成人の日', '2/11 建国記念の日', '2/23 天皇誕生日', '2/24 振替休日', '3/20 春分の日', '4/29 昭和の日',
      '5/3 憲法記念日', '5/4 みどりの日', '5/5 こどもの日', '5/6 振替休日', '7/21 海の日', '8/11 山の日', '9/15 敬老の日',
      '9/23 秋分の日', '10/13 スポーツの日', '11/3 文化の日', '11/23 勤労感謝の日', '11/24 振替休日',
    ]);
  });
  it('2020・2021: 東京大会の特例（海の日・スポーツの日・山の日の移動。2021/8/8 は日曜で 8/9 が振替休日）', () => {
    const y20 = list(2020);
    expect(y20).toEqual(expect.arrayContaining(['7/23 海の日', '7/24 スポーツの日', '8/10 山の日', '9/22 秋分の日']));
    expect(y20.filter(x => /^(7\/20|8\/11|10\/12) /.test(x))).toEqual([]);
    const y21 = list(2021);
    expect(y21).toEqual(expect.arrayContaining(['7/22 海の日', '7/23 スポーツの日', '8/8 山の日', '8/9 振替休日']));
    expect(y21.filter(x => /^(7\/19|8\/11|10\/11) /.test(x))).toEqual([]);
  });
  it('春分・秋分の日は計算式（国立天文台の発表と合う年を確かめる）。式が合う 1980〜2099年の外は出さない', () => {
    expect([2027, 2028, 2030].map(y => [equinoxDay(y, 'spring'), equinoxDay(y, 'autumn')])).toEqual([[21, 23], [20, 22], [20, 23]]);
    expect(equinoxDay(EQUINOX_LAST, 'spring')).not.toBeNull();
    expect(equinoxDay(EQUINOX_LAST + 1, 'spring')).toBeNull();
    expect(equinoxDay(EQUINOX_FIRST - 1, 'autumn')).toBeNull();
    expect(list(2100).some(x => x.includes('分の日'))).toBe(false);
    expect(list(2100)).toContain('1/1 元日');
  });
  it('2032: 敬老の日（9/20）と秋分の日（9/22）にはさまれた 9/21 が国民の休日', () => {
    expect(jpHoliday(2032, 9, 20)).toBe('敬老の日');
    expect(jpHoliday(2032, 9, 21)).toBe('国民の休日');
    expect(jpHoliday(2032, 9, 22)).toBe('秋分の日');
  });
  it('祝日でない日・存在しない日は空', () => {
    expect(jpHoliday(2026, 11, 19)).toBe('');
    expect(jpHoliday(2026, 2, 30)).toBe('');
    expect(jpHoliday(2026, 13, 1)).toBe('');
    expect(baseHoliday(2026, 5, 6)).toBe('');
  });
});
