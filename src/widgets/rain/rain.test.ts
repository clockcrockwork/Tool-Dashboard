import { describe, expect, it } from 'vitest';
import { FAIR_D, UMBRELLA_D, rainView } from './rain';
import { RAIN_SETS, rainSample } from './sample';

describe('rainView (傘の見出し・補足・棒)', () => {
  it('あとで降る', () => {
    const v = rainView(rainSample('あとで降る'), 10);
    expect(v.head).toBe('傘がいります');
    expect(v.sub).toBe('約3時間後、13時ごろに降り始め・18時ごろに止む');
    expect(v.label).toBe('傘がいります。約3時間後、13時ごろに降り始め・18時ごろに止む');
    expect(v.icon).toBe(UMBRELLA_D);
    expect(v.bars).toHaveLength(12);
    expect(v.bars[0]).toEqual({ h: '3px', c: 'var(--fill2)' });
    expect(v.bars[5]).toEqual({ h: '100%', c: 'var(--c1)' });
    expect(v.bars[3]).toEqual({ h: '30%', c: 'var(--c1)' });
  });
  it('いま雨', () => {
    const v = rainView(rainSample('いま雨'), 10);
    expect(v.head).toBe('いま雨が降っています');
    expect(v.sub).toBe('あと約4時間、14時ごろに止む');
  });
  it('降らない', () => {
    const v = rainView(rainSample('降らない'), 10);
    expect(v.head).toBe('傘はいりません');
    expect(v.sub).toBe('この先12時間は降らない見込み');
    expect(v.icon).toBe(FAIR_D);
    expect(v.bars.every(b => b.h === '3px')).toBe(true);
  });
  it('0.1mm is not rain; rain that does not stop; hours wrap past midnight', () => {
    expect(rainView([0.1, 0, 0], 23).head).toBe('傘はいりません');
    expect(rainView(Array<number>(12).fill(1), 23).sub).toBe('12時間以上続く見込み');
    expect(rainView([0, 0, 1, 1], 23).sub).toBe('約2時間後、1時ごろに降り始め');
  });
  it('unknown sample falls back to あとで降る', () => {
    expect(rainSample('???')).toBe(RAIN_SETS['あとで降る']);
    expect(rainSample(3)).toBe(RAIN_SETS['あとで降る']);
  });
});
