import { describe, expect, it } from 'vitest';
import { alarmData } from './data';
import { ALARM_RECHECK_MS, alarmsDue, nextCheckIn, occurrence } from './alarm';

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
  it('waits until the next alarm, at most a minute; nothing to wait for when all are off', () => {
    expect(nextCheckIn(['10:25'], [true], at(10, 24, 36))).toBe(24_000 + 20);
    expect(nextCheckIn(['07:00', '22:30'], [true, true], at(10, 24, 36))).toBe(ALARM_RECHECK_MS);
    expect(nextCheckIn(['07:00'], [true], at(7, 0, 0))).toBe(ALARM_RECHECK_MS);
    expect(nextCheckIn(['07:00', '22:30'], [false, false], at(10, 24))).toBeNull();
  });
  it('record: the prototype default, broken entries off, unknown fields dropped', () => {
    expect(alarmData.initial(0)).toEqual({ on: [true, false] });
    expect(alarmData.sanitize({ on: [false, true], ringing: true }, 0)).toEqual({ on: [false, true] });
    expect(alarmData.sanitize({ on: ['yes'] }, 0)).toEqual({ on: [false, false] });
    expect(alarmData.sanitize({ on: 'x' }, 0)).toBeNull();
    expect(alarmData.sanitize(null, 0)).toBeNull();
  });
});
