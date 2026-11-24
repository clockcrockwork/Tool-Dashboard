import { describe, expect, it } from 'vitest';
import { SW_IDLE, elapsed, lapRows, lapSw, swText, toggleSw } from './stopwatch';

const T = 5_000_000;

describe('stopwatch', () => {
  it('text MM:SS.t', () => {
    expect(swText(0)).toBe('00:00.0');
    expect(swText(61_234)).toBe('01:01.2');
    expect(swText(6_000_000)).toBe('100:00.0');
    expect(swText(-5)).toBe('00:00.0');
  });
  it('elapsed is base + (now − start) while running; just started reads 00:00.0', () => {
    const s = toggleSw(SW_IDLE, T);
    expect(s.run).toBe(true);
    expect(swText(elapsed(s, T))).toBe('00:00.0');
    expect(elapsed(s, T + 2_500)).toBe(2_500);
    const stopped = toggleSw(s, T + 2_500);
    expect(stopped).toEqual({ run: false, base: 2_500, start: T, laps: [] });
    expect(elapsed(stopped, T + 99_999)).toBe(2_500);
    expect(elapsed(toggleSw(stopped, T + 10_000), T + 11_000)).toBe(3_500);
  });
  it('laps: none at 0, numbered, newest 3 first', () => {
    expect(lapSw(SW_IDLE, T)).toBe(SW_IDLE);
    let s = toggleSw(SW_IDLE, T);
    for (let i = 1; i <= 4; i++) s = lapSw(s, T + i * 1000);
    expect(lapRows(s)).toEqual([{ n: 'L4', t: '00:04.0' }, { n: 'L3', t: '00:03.0' }, { n: 'L2', t: '00:02.0' }]);
  });
});
