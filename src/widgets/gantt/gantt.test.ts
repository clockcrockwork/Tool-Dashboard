import { describe, expect, it } from 'vitest';
import { ganttBars, ganttNowLeft } from './gantt';
import { GANTT_SAMPLE } from './sample';

describe('gantt', () => {
  it('bars are placed on the 8–20 h axis by lane', () => {
    const bars = ganttBars(GANTT_SAMPLE);
    expect(bars).toHaveLength(6);
    expect(bars[0]).toEqual({ n: '朝会', l: '8.333333333333332%', w: '6.25%', t: '0%', c: 'color-mix(in oklab, var(--c1) 34%, transparent)' });
    expect(bars[2]?.c).toBe('var(--fill2)');
    expect(bars[5]?.t).toBe('72%');
  });
  it('the now line follows the time and stays on the axis', () => {
    expect(ganttNowLeft(new Date(2026, 10, 19, 10, 24, 36))).toBe('calc(20.000000000000004% - 1px)');
    expect(ganttNowLeft(new Date(2026, 10, 19, 6, 0))).toBe('calc(0% - 1px)');
    expect(ganttNowLeft(new Date(2026, 10, 19, 22, 0))).toBe('calc(100% - 1px)');
  });
});
