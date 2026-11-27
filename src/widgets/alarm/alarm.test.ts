import { describe, expect, it } from 'vitest';
import { alarmData } from './data';
import { alarmTimes, alarmsDue, nextAlarmAt, occurrence } from './alarm';

const at = (h: number, m: number, s = 0, day = 19): number => new Date(2026, 10, day, h, m, s).getTime();

describe('alarm', () => {
  it('occurrence of HH:MM on the local day', () => {
    expect(occurrence('07:00', at(10, 24))).toBe(at(7, 0));
    expect(occurrence('07:00', at(10, 24), 1)).toBe(at(7, 0, 0, 20));
    expect(occurrence('24:00', at(10, 24))).toBeNull();
    expect(occurrence('7', at(10, 24))).toBeNull();
  });
  it('rings when the minute begins between two checks, only if on', () => {
    expect(alarmsDue(['07:00', '22:30'], [true, true], at(6, 59, 59), at(7, 0, 0))).toEqual([0]);
    expect(alarmsDue(['07:00', '22:30'], [false, true], at(6, 59, 59), at(7, 0, 0))).toEqual([]);
    expect(alarmsDue(['07:00', '07:00'], [true, true], at(6, 59, 30), at(7, 0, 20))).toEqual([0, 1]);
  });
  it('does not ring twice in the same minute, nor late after a sleep', () => {
    expect(alarmsDue(['07:00'], [true], at(7, 0, 0), at(7, 0, 30))).toEqual([]);
    expect(alarmsDue(['07:00'], [true], at(6, 50), at(7, 1, 5))).toEqual([]);
  });
  it('across midnight: 00:00 rings at the turn of the day; 23:59 is not rung late after midnight', () => {
    expect(alarmsDue(['00:00'], [true], at(23, 59, 50), at(0, 0, 0, 20))).toEqual([0]);
    expect(alarmsDue(['23:59'], [true], at(23, 58, 59), at(0, 0, 10, 20))).toEqual([]);
  });
  it('the next deadline is the next minute an alarm that is on rings; none when all are off', () => {
    expect(nextAlarmAt(['10:25'], [true], at(10, 24, 36))).toBe(at(10, 25));
    expect(nextAlarmAt(['07:00', '22:30'], [true, true], at(10, 24, 36))).toBe(at(22, 30));
    expect(nextAlarmAt(['07:00', '22:30'], [true, false], at(10, 24, 36))).toBe(at(7, 0, 0, 20));
    // At the very minute it rang: the next one is tomorrow's.
    expect(nextAlarmAt(['07:00'], [true], at(7, 0, 0))).toBe(at(7, 0, 0, 20));
    expect(nextAlarmAt(['07:00', '22:30'], [false, false], at(10, 24))).toBeNull();
    expect(nextAlarmAt(['xx'], [true], at(10, 24))).toBeNull();
  });
  it('times come from the settings a1・a2, with the prototype defaults', () => {
    const cfg: Record<string, string> = { a1: '06:30' };
    expect(alarmTimes(k => cfg[k])).toEqual(['06:30', '22:30']);
    expect(alarmTimes(() => undefined)).toEqual(['07:00', '22:30']);
  });
  it('record: the prototype default, broken entries off, unknown fields dropped', () => {
    expect(alarmData.initial(0)).toEqual({ on: [true, false] });
    expect(alarmData.sanitize({ on: [false, true], ringing: true }, 0)).toEqual({ on: [false, true] });
    expect(alarmData.sanitize({ on: ['yes'] }, 0)).toEqual({ on: [false, false] });
    expect(alarmData.sanitize({ on: 'x' }, 0)).toBeNull();
    expect(alarmData.sanitize(null, 0)).toBeNull();
  });
});
