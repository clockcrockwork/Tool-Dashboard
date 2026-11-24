import { describe, expect, it } from 'vitest';
import { worldRows, zoneTime } from './world';

// 2026-11-19 10:24:36 JST = 01:24:36 UTC (London GMT, New York EST).
const NOW = new Date(Date.UTC(2026, 10, 19, 1, 24, 36));

describe('world', () => {
  it('rows in the prototype order', () => {
    expect(worldRows(NOW)).toEqual([
      { n: '東京', t: '10:24' },
      { n: 'ロンドン', t: '01:24' },
      { n: 'ニューヨーク', t: '20:24' },
    ]);
  });
  it('summer time follows the zone', () => {
    expect(zoneTime(new Date(Date.UTC(2026, 6, 1, 1, 0)), 'Europe/London')).toBe('02:00');
  });
  it('an unknown zone shows --:--', () => {
    expect(zoneTime(NOW, 'Nowhere/Nothing')).toBe('--:--');
  });
});
