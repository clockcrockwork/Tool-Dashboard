import { describe, expect, it } from 'vitest';
import { POMO_IDLE, pausePomo, pomoFinished, pomoLeft, pomoView, startPomo } from './pomo';

const T = 1_000_000;

describe('pomo', () => {
  it('idle shows the full time and an empty-free ring (25:00)', () => {
    expect(pomoView(POMO_IDLE, 1500, T)).toEqual({ time: '25:00', dash: '263.89 263.89', d: 'M8 5.5v13l11-6.5z' });
  });
  it('counts from the end time, not by ticks (a late tick does not lose time)', () => {
    const run = startPomo(POMO_IDLE, 1500, T);
    expect(run).toEqual({ on: true, endAt: T + 1_500_000, left: null });
    expect(pomoLeft(run, 1500, T)).toBe(1500);
    expect(pomoLeft(run, 1500, T + 999)).toBe(1500);
    expect(pomoLeft(run, 1500, T + 1000)).toBe(1499);
    expect(pomoLeft(run, 1500, T + 600_000)).toBe(900);
    expect(pomoView(run, 1500, T + 600_000).time).toBe('15:00');
    expect(pomoView(run, 1500, T).d).toBe('M8 5v14M16 5v14');
  });
  it('pause keeps the rest, start continues from it', () => {
    const run = startPomo(POMO_IDLE, 1500, T);
    const paused = pausePomo(run, T + 60_500);
    expect(paused).toEqual({ on: false, endAt: null, left: 1440 });
    expect(pomoLeft(paused, 1500, T + 999_999)).toBe(1440);
    const again = startPomo(paused, 1500, T + 100_000);
    expect(again.endAt).toBe(T + 100_000 + 1_440_000);
  });
  it('finishes at the end time; shown never below 0 or above the setting', () => {
    const run = startPomo(POMO_IDLE, 300, T);
    expect(pomoFinished(run, T + 299_999)).toBe(false);
    expect(pomoFinished(run, T + 300_000)).toBe(true);
    expect(pomoLeft(run, 300, T + 400_000)).toBe(0);
    expect(pomoLeft(startPomo(POMO_IDLE, 1500, T), 300, T)).toBe(300);
    expect(pomoFinished(POMO_IDLE, T)).toBe(false);
  });
  it('pausing an idle timer changes nothing', () => {
    expect(pausePomo(POMO_IDLE, T)).toBe(POMO_IDLE);
  });
});
