import { describe, expect, it } from 'vitest';
import { weekDays } from './week';
import { WEEK_DOTS_SAMPLE } from './sample';

describe('週間カレンダー (prototype week)', () => {
  it('今日を含む1週間。月曜はじまり・日曜はじまり', () => {
    const now = new Date(2026, 10, 19, 10, 24, 36);
    const mon = weekDays(now, false);
    expect(mon.map(x => x.dow + x.d)).toEqual(['月16', '火17', '水18', '木19', '金20', '土21', '日22']);
    expect(mon.map(x => x.cls)).toEqual(['', '', '', 'on', '', '', '']);
    expect(weekDays(now, true).map(x => x.d)).toEqual([15, 16, 17, 18, 19, 20, 21]);
  });
  it('点は曜日ごとの見本（月曜から）', () => {
    expect(weekDays(new Date(2026, 10, 19), false).map(x => x.dots)).toEqual([...WEEK_DOTS_SAMPLE]);
    expect(weekDays(new Date(2026, 10, 19), true)[0]?.dots).toBe(WEEK_DOTS_SAMPLE[6]);
  });
  it('祝日は hol と読み上げの名前。月・年をまたぐ週', () => {
    const gw = weekDays(new Date(2026, 4, 6), false);
    expect(gw.filter(x => x.hol).map(x => String(x.d) + x.hn)).toEqual(['4、みどりの日', '5、こどもの日', '6、振替休日']);
    expect(gw.find(x => x.d === 6)?.cls).toBe('on hol');
    const ny = weekDays(new Date(2026, 11, 31), false);
    expect(ny.map(x => x.d)).toEqual([28, 29, 30, 31, 1, 2, 3]);
    expect(ny.find(x => x.d === 1)?.hn).toBe('、元日');
    // 去年の同じ日付は今日にしない
    expect(weekDays(new Date(2027, 0, 1), false).filter(x => x.cls.includes('on')).map(x => x.d)).toEqual([1]);
  });
});
