import { describe, expect, it, vi } from 'vitest';
import { deg, stateClass, stateText, weatherTiers, weatherView } from './weather';
import { retryWeather, setWeatherState, weatherState } from './status';
import type { Dashboard } from '../../app/store/store';

const NOW = new Date(2026, 10, 19, 10, 24, 36); // Thu

describe('weatherTiers (段階表示)', () => {
  it('2×1 shows only the base tier', () => {
    expect(weatherTiers({ w: 2, h: 1 }, false)).toEqual({ hours: false, week: false });
  });
  it('縦2以上 adds 3時間ごと', () => {
    expect(weatherTiers({ w: 2, h: 2 }, false)).toEqual({ hours: true, week: false });
  });
  it('縦2以上かつ横3以上 or 縦3以上 adds 週間', () => {
    expect(weatherTiers({ w: 3, h: 2 }, false)).toEqual({ hours: true, week: true });
    expect(weatherTiers({ w: 2, h: 3 }, false)).toEqual({ hours: true, week: true });
    expect(weatherTiers({ w: 4, h: 1 }, false)).toEqual({ hours: false, week: false });
  });
  it('unplaced widgets need no tier data', () => {
    expect(weatherTiers({ w: 4, h: 3 }, true)).toEqual({ hours: false, week: false });
  });
});

describe('weatherView', () => {
  it('base tier matches the prototype sample', () => {
    const v = weatherView(NOW, false, { hours: false, week: false }, {});
    expect(v.parts.map(p => [p.l, p.a, p.t])).toEqual([['朝', '晴れ', '12°'], ['昼', 'くもり', '21°'], ['夜', '雨', '14°']]);
    expect(v.hum).toBe('58%');
    expect(v.hours).toEqual([]);
    expect(v.week).toEqual([]);
    expect([v.hoursWait, v.hoursOn, v.weekWait, v.weekOn]).toEqual([false, false, false, false]);
  });
  it('°F converts and rounds', () => {
    expect(deg(12, true)).toBe('54°');
    expect(deg(21, true)).toBe('70°');
    expect(deg(21, false)).toBe('21°');
  });
  it('a needed tier waits (skeleton) until its data is ready, and builds no cells before', () => {
    const wait = weatherView(NOW, false, { hours: true, week: true }, {});
    expect([wait.hoursWait, wait.hoursOn, wait.weekWait, wait.weekOn]).toEqual([true, false, true, false]);
    expect(wait.hours).toHaveLength(0);
    const ready = weatherView(NOW, false, { hours: true, week: true }, { hours: true, week: true });
    expect(ready.hours.map(h => h.l)).toEqual(['12', '15', '18', '21', '0', '3', '6', '9']);
    expect(ready.week.map(w => w.l)).toEqual(['今日', '金', '土', '日', '月', '火', '水']);
    expect(ready.week[0]).toMatchObject({ hi: '21°', lo: '12°' });
  });
  it('data kept after shrinking is not shown', () => {
    const v = weatherView(NOW, false, { hours: false, week: false }, { hours: true, week: true });
    expect(v.hoursOn || v.weekOn).toBe(false);
  });
});

describe('states (仕様書 3章「状態」)', () => {
  it('maps to frame classes and overlay texts', () => {
    expect(['ok', 'load', 'stale', 'empty', 'err'].map(s => stateClass(s as never))).toEqual(['', 's-load', 's-stale', 's-empty', 's-err']);
    expect(stateText('empty', NOW.getTime())).toEqual(['まだ何もありません', '接続する', '']);
    expect(stateText('err', NOW.getTime())).toEqual(['取得できませんでした', 'もう一度', '最終更新 09:42']);
    expect(stateText('ok', NOW.getTime())).toEqual(['', '', '']);
  });
  it('display-test hook and retry (読み込み中 → 通常)', () => {
    vi.useFakeTimers();
    const d = {} as Dashboard;
    setWeatherState(d, 'err');
    expect(weatherState(d)).toBe('err');
    retryWeather(d);
    expect(weatherState(d)).toBe('load');
    vi.advanceTimersByTime(1400);
    expect(weatherState(d)).toBe('ok');
    vi.useRealTimers();
  });
});
