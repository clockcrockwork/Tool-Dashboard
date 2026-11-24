/**
 * 天気の段の取得と更新 (仕様書 3章「段階表示」, review #7): 表示中だけ取りに行き・更新する。代表 fixture —
 * 小→大→小、表示していない画面、再表示、古い応答、unmount.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { Dashboard } from '../../app/store/store';
import { memoryStore } from '../../app/store/persist';
import type { Size } from '../../app/registry/registry';
import { sampleAdapter, type WeatherAdapter, type WxTier } from './adapter';
import { WX_REFRESH_MS, setWeatherState, useWeatherTiers, weatherState } from './status';
import { weatherTiers, weatherView } from './weather';

const FETCH = 1000;

function make(board: 'g0' | 'g1' = 'g0', size: Size = [2, 1]): Dashboard {
  const d = new Dashboard({ store: memoryStore(), dataDefs: {}, now: () => Date.now(), setTimeout: () => 0 });
  d.ui.tour = -1;
  d.g.groups = [{ id: 'g0', n: 'ボード 1' }, { id: 'g1', n: 'ボード 2' }];
  d.g.off = { ...d.g.off, weather: false };
  d.g.place = { ...d.g.place, weather: board };
  d.setSize('weather', size);
  return d;
}

/** Same as the widget: tiers from the assigned cells, none when unplaced. */
const tiersOf = (d: Dashboard) => () => {
  const pos = d.layout.value.pos.weather;
  return weatherTiers(pos ? { w: pos.w, h: pos.h } : { w: 2, h: 1 }, !!d.g.off.weather);
};

/** Records each fetch. `ignoreAbort`: a slow source that answers even after being stopped. */
function counting(ignoreAbort = false): WeatherAdapter & { calls: WxTier[] } {
  const calls: WxTier[] = [];
  const base = sampleAdapter(FETCH);
  return {
    calls,
    fetchTier: (tier, signal) => {
      calls.push(tier);
      if (!ignoreAbort) return base.fetchTier(tier, signal);
      return new Promise<void>(resolve => { setTimeout(resolve, FETCH); });
    },
  };
}

function mount(d: Dashboard, adapter: WeatherAdapter) {
  const scope = effectScope();
  const place = scope.run(() => useWeatherTiers(d, 'weather', tiersOf(d), { adapter }));
  if (!place) throw new Error('no place');
  return { place, unmount: () => { scope.stop(); } };
}

const n = (calls: readonly WxTier[], t: WxTier): number => calls.filter(x => x === t).length;
const page = (d: Dashboard): number => d.layout.value.pos.weather?.page ?? -1;

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 19, 10, 24, 36)); });
afterEach(() => { vi.useRealTimers(); });

describe('天気の段: 表示中だけ取得・更新する', () => {
  it('起動直後（ホームの 2×1）は何も取りに行かず、状態は通常のまま', async () => {
    const d = make();
    const a = counting();
    const { place } = mount(d, a);
    await vi.advanceTimersByTimeAsync(FETCH * 3);
    expect(a.calls).toEqual([]);
    expect(weatherState(d)).toBe('ok');
    expect(place.ready).toEqual({ hours: false, week: false });
  });

  it('小→大→小: 段が初めて要るときに取り、小さくしてもデータは残し、出ていない段は更新しない', async () => {
    const d = make();
    const a = counting();
    const { place } = mount(d, a);
    d.setSize('weather', [2, 2]);
    expect(a.calls).toEqual(['hours']);
    expect(weatherView(new Date(), false, tiersOf(d)(), place.ready).hoursWait).toBe(true);
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(place.ready).toEqual({ hours: true, week: false });
    d.setSize('weather', [3, 2]);
    expect(a.calls).toEqual(['hours', 'week']);
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(place.ready).toEqual({ hours: true, week: true });

    d.setSize('weather', [2, 1]);
    expect(place.ready).toEqual({ hours: true, week: true }); // 保持
    await vi.advanceTimersByTimeAsync(WX_REFRESH_MS * 2);
    expect(n(a.calls, 'hours')).toBe(1); // 出ていない段は更新しない
    expect(n(a.calls, 'week')).toBe(1);
    expect(n(a.calls, 'base')).toBeGreaterThan(0); // 表示中の基本の段は更新する

    d.setSize('weather', [2, 2]); // 再び大きく: 古いので取り直す（その間も前のデータを出す）
    expect(n(a.calls, 'hours')).toBe(2);
    expect(weatherView(new Date(), false, tiersOf(d)(), place.ready).hoursOn).toBe(true);
    expect(n(a.calls, 'week')).toBe(1);
  });

  it('表示していない画面では基本の段も更新せず、表示されたら古いものを「更新中」を経て取り直す', async () => {
    const d = make('g1', [2, 2]);
    expect(page(d)).toBeGreaterThan(0);
    const a = counting();
    const { place } = mount(d, a);
    await vi.advanceTimersByTimeAsync(WX_REFRESH_MS * 2);
    expect(a.calls).toEqual([]);
    expect(place.ready).toEqual({ hours: false, week: false });

    d.go(page(d));
    expect(a.calls.slice().sort()).toEqual(['base', 'hours']);
    expect(weatherState(d)).toBe('stale');
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(weatherState(d)).toBe('ok');
    expect(place.ready.hours).toBe(true);

    d.go(0);
    await vi.advanceTimersByTimeAsync(WX_REFRESH_MS * 2);
    expect(a.calls).toHaveLength(2);
  });

  it('再表示: 新しいうちは取り直さない。表示中に古くなったら取り直す', async () => {
    const d = make('g0', [2, 2]);
    const a = counting();
    mount(d, a);
    await vi.advanceTimersByTimeAsync(FETCH);
    d.go(1);
    await vi.advanceTimersByTimeAsync(60_000);
    d.go(0);
    expect(a.calls).toEqual(['hours']);
    await vi.advanceTimersByTimeAsync(WX_REFRESH_MS);
    expect(n(a.calls, 'hours')).toBe(2);
    expect(n(a.calls, 'base')).toBe(1);
  });

  it('前面表示・一時利用は表示中として扱う', async () => {
    const d = make('g1', [2, 2]);
    const a = counting();
    mount(d, a);
    d.ui.big = 'weather';
    expect(a.calls).toEqual(['hours']);
    d.ui.big = null;
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(n(a.calls, 'hours')).toBe(1);
  });

  it('表示テストで決めた状態（失敗）は、基本の段の更新で上書きしない', async () => {
    const d = make('g1');
    const a = counting();
    mount(d, a);
    setWeatherState(d, 'err');
    await vi.advanceTimersByTimeAsync(WX_REFRESH_MS);
    d.go(page(d));
    expect(a.calls).toEqual(['base']);
    expect(weatherState(d)).toBe('err');
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(weatherState(d)).toBe('err');
  });
});

describe('天気の段: 古い応答と unmount', () => {
  it('段が消えた後に届いた応答は捨てる', async () => {
    const d = make();
    const a = counting(true);
    const { place } = mount(d, a);
    d.setSize('weather', [2, 2]);
    await vi.advanceTimersByTimeAsync(FETCH / 2);
    d.setSize('weather', [2, 1]);
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(place.ready.hours).toBe(false);
    expect(place.busy.hours).toBe(false);
  });

  it('配置が外された後に届いた応答は捨てる', async () => {
    const d = make('g0', [2, 2]);
    const a = counting(true);
    const { place } = mount(d, a);
    expect(a.calls).toEqual(['hours']);
    d.g.off = { ...d.g.off, weather: true };
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(place.ready.hours).toBe(false);
  });

  it('画面を離れて戻ったとき、先に届いた古い応答は捨て、新しい取得の応答だけを使う', async () => {
    const d = make('g0', [2, 2]);
    const a = counting(true);
    const { place } = mount(d, a);
    await vi.advanceTimersByTimeAsync(300);
    d.go(1);
    await vi.advanceTimersByTimeAsync(300);
    d.go(0);
    expect(a.calls).toEqual(['hours', 'hours']);
    await vi.advanceTimersByTimeAsync(400); // 1本目（止めたもの）が届く
    expect(place.ready.hours).toBe(false);
    expect(place.busy.hours).toBe(true);
    await vi.advanceTimersByTimeAsync(600); // 2本目が届く
    expect(place.ready.hours).toBe(true);
  });

  it('unmount で取得と更新の timer を止め、そのあとは何も変えない', async () => {
    const d = make('g0', [2, 2]);
    const a = counting();
    const { place, unmount } = mount(d, a);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(place.busy.hours).toBe(false);
    await vi.advanceTimersByTimeAsync(WX_REFRESH_MS * 2);
    expect(place.ready.hours).toBe(false);
    expect(a.calls).toEqual(['hours']);
    d.setSize('weather', [3, 3]);
    expect(a.calls).toEqual(['hours']);
  });

  it('一度取った段は部品を付け直しても残る（保存はしない一時状態）', async () => {
    const d = make('g0', [2, 2]);
    const a = counting();
    const first = mount(d, a);
    await vi.advanceTimersByTimeAsync(FETCH);
    first.unmount();
    const again = mount(d, a);
    expect(again.place.ready.hours).toBe(true);
    expect(a.calls).toEqual(['hours']);
  });
});
