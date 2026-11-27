import { describe, expect, it } from 'vitest';
import { monthCells, monthLabel, nextHolidayText, weekdayLabels } from './month';

const NOW = new Date(2026, 10, 19, 10, 24, 36);

describe('月間カレンダー (prototype monthCells / monthHol)', () => {
  it('見出しは 2026.11、今月の次の祝日は「23日 勤労感謝の日」', () => {
    expect(monthLabel(NOW)).toBe('2026.11');
    expect(nextHolidayText(NOW)).toBe('23日 勤労感謝の日');
    expect(nextHolidayText(new Date(2026, 10, 23))).toBe('今日 勤労感謝の日');
    expect(nextHolidayText(new Date(2026, 10, 24))).toBe('');
  });
  it('週の始まり（月・日）で曜日の並びと先頭の空きが変わる（2026/11/1 は日曜）', () => {
    expect(weekdayLabels(false)).toEqual(['月', '火', '水', '木', '金', '土', '日']);
    expect(weekdayLabels(true)).toEqual(['日', '月', '火', '水', '木', '金', '土']);
    const mon = monthCells(NOW, false);
    expect(mon.slice(0, 6).every(c => c.d === '')).toBe(true);
    expect(mon[6]?.d).toBe(1);
    expect(mon).toHaveLength(6 + 30);
    expect(monthCells(NOW, true)[0]?.d).toBe(1);
  });
  it('今日は on、祝日は hol と読み上げの名前', () => {
    const cells = monthCells(NOW, false).filter(c => c.d !== '');
    expect(cells[18]).toEqual({ d: 19, cls: 'on', hol: false, hn: '、' });
    expect(cells[2]).toEqual({ d: 3, cls: ' hol', hol: true, hn: '、文化の日' });
    expect(cells[22]).toEqual({ d: 23, cls: ' hol', hol: true, hn: '、勤労感謝の日' });
    expect(monthCells(new Date(2026, 10, 23), false).find(c => c.d === 23)?.cls).toBe('on hol');
  });
  it('うるう年の2月', () => {
    expect(monthCells(new Date(2028, 1, 10), true).filter(c => c.d !== '')).toHaveLength(29);
  });
});
