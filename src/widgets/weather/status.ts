/**
 * 天気の一時状態 (保存しない): 表示テスト用の状態 (通常・読み込み中・更新中・空・失敗) と、段のデータの取りに行き.
 * Kept per Dashboard so stories and tests with several dashboards do not share it.
 * 開発用の表示テストからは `setWeatherState(d, 'err')` のように呼ぶ.
 */
import { reactive } from 'vue';
import type { Dashboard } from '../../app/store/store';
import type { Tiers, WxState } from './weather';

export type WeatherRuntime = {
  st: WxState;
  /** Tier data has arrived (段のデータ). Kept after shrinking (仕様書: 一度取ったデータは保持して構わない). */
  ready: { hours: boolean; week: boolean };
  /** Tier data was requested once. */
  req: { hours: boolean; week: boolean };
};

const runtimes = new WeakMap<Dashboard, WeatherRuntime>();

export function weatherRuntime(d: Dashboard): WeatherRuntime {
  let r = runtimes.get(d);
  if (!r) {
    r = reactive<WeatherRuntime>({ st: 'ok', ready: { hours: false, week: false }, req: { hours: false, week: false } });
    runtimes.set(d, r);
  }
  return r;
}

/** Display test hook: force one of the 5 states. */
export function setWeatherState(d: Dashboard, st: WxState): void {
  weatherRuntime(d).st = st;
}

export function weatherState(d: Dashboard): WxState {
  return weatherRuntime(d).st;
}

/** 「もう一度」「接続する」: 読み込み中 → 1.4秒後に通常 (prototype `stRetry`). */
export function retryWeather(d: Dashboard, ms = 1400): void {
  const r = weatherRuntime(d);
  r.st = 'load';
  setTimeout(() => { if (r.st === 'load') r.st = 'ok'; }, ms);
}

/** Simulated fetch of tier data the first time a tier is needed (約1.1秒の下書き → 表示). */
export function requestTiers(d: Dashboard, need: Tiers, ms = 1100): void {
  const r = weatherRuntime(d);
  for (const tier of ['hours', 'week'] as const) {
    if (!need[tier] || r.req[tier]) continue;
    r.req[tier] = true;
    setTimeout(() => { r.ready[tier] = true; }, ms);
  }
}
