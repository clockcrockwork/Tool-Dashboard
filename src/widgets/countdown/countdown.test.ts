import { describe, expect, it } from 'vitest';
import { countdownDays } from './countdown';

const NOW = new Date(2026, 10, 19, 10, 24, 36);

describe('countdown', () => {
  it('days until the date (年末まで 42日)', () => {
    expect(countdownDays('2026-12-31', NOW)).toBe('42');
    expect(countdownDays('2026-11-20', NOW)).toBe('1');
  });
  it('the day itself and past dates are 0', () => {
    expect(countdownDays('2026-11-19', NOW)).toBe('0');
    expect(countdownDays('2026-01-01', NOW)).toBe('0');
  });
  it('late in the evening still counts whole days', () => {
    expect(countdownDays('2026-11-20', new Date(2026, 10, 19, 23, 59, 59))).toBe('1');
  });
  it('an unreadable date shows –', () => {
    expect(countdownDays('', NOW)).toBe('–');
    expect(countdownDays('abc', NOW)).toBe('–');
  });
});
