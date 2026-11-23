import { describe, expect, it } from 'vitest';
import { clockParts, fullScreenArea, fullScreenMargin, secScale } from './clock';

const NOW = new Date(2026, 10, 19, 10, 24, 36);

describe('clock', () => {
  it('parts', () => {
    expect(clockParts(NOW, false, true)).toEqual({ hm: '10:24', ss: '36', dateLine: '11.19 木' });
    expect(clockParts(new Date(2026, 10, 19, 0, 5), true, false)).toEqual({ hm: '12:05', ss: '', dateLine: '11.19 木' });
  });
  it('full-screen helpers', () => {
    expect(secScale(NOW)).toBe('0.610');
    expect(fullScreenArea(1, 10, 5)).toBe('1 / 11 / span 5 / span 10');
    expect(fullScreenArea(-1, 10, 5)).toBe('1 / 1 / span 5 / span 10');
    expect(fullScreenMargin(14, 7, 66)).toBe('-14px -7px -66px');
  });
});
