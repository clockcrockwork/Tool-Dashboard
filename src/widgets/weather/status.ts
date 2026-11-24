/**
 * 天気の一時状態 (保存しない): 表示テスト用の状態 (通常・読み込み中・更新中・空・失敗) と、段のデータの取得と更新.
 * Kept per Dashboard so stories and tests with several dashboards do not share it.
 * 開発用の表示テストからは `setWeatherState(d, 'err')` のように呼ぶ.
 *
 * 段の取得と更新 (仕様書 3章「段階表示」、実装ガイド 8章, review #7) — P2 で外部の情報を使うウィジェットの見本:
 *  - 取得・更新は**表示中のとき**（`isShown`: 今の画面・前面表示・一時利用）だけ。未配置・表示中でない画面では基本の段も更新しない。
 *  - 段のデータは、その段が出ていて初めて必要になったときに取りに行く。一度取ったデータは段が消えても保持するが、出ていない段は更新しない。
 *  - 表示されたときに古ければ（`WX_REFRESH_MS` 以上前）取り直す。基本の段は「更新中」の状態を経て差し替える。
 *  - 表示されなくなった・段が消えた・配置が外れた時点で取得を止め、そのあとに届いた古い応答は捨てる。
 *  - 部品が外れたら（unmount、`useWeatherTiers` の scope の終わり）timer と取得を止める。
 * 寿命の区別: 表示（段の要素は出ている間だけ）・取得（表示中で必要な間だけ）・データ（runtime に残る。保存はしない）。
 */
import { onScopeDispose, reactive, watch } from 'vue';
import type { Dashboard } from '../../app/store/store';
import { isShown } from '../../app/store/visibility';
import { sampleAdapter, type WeatherAdapter, type WxTier } from './adapter';
import type { Tiers, WxState } from './weather';

/** Data older than this is refreshed when (and only while) it is shown. */
export const WX_REFRESH_MS = 30 * 60_000;

/** One placement's tier data: arrival time per tier (0 = none yet) and whether a fetch is running. */
export type WeatherPlace = {
  /** Tier data has arrived (段のデータ). Kept after shrinking (仕様書: 一度取ったデータは保持して構わない). */
  ready: { hours: boolean; week: boolean };
  at: Record<WxTier, number>;
  busy: Record<WxTier, boolean>;
};

export type WeatherRuntime = {
  st: WxState;
  /** Per placement ID. */
  places: Record<string, WeatherPlace>;
};

const runtimes = new WeakMap<Dashboard, WeatherRuntime>();

export function weatherRuntime(d: Dashboard): WeatherRuntime {
  let r = runtimes.get(d);
  if (!r) {
    r = reactive<WeatherRuntime>({ st: 'ok', places: {} });
    runtimes.set(d, r);
  }
  return r;
}

/**
 * The tier state of one placement. The base tier counts as arrived when first asked for (the sample's 朝・昼・夜 are
 * there from the start, as in the prototype: no loading state on start).
 */
export function weatherPlace(d: Dashboard, id: string): WeatherPlace {
  const r = weatherRuntime(d);
  let p = r.places[id];
  if (!p) {
    r.places[id] = { ready: { hours: false, week: false }, at: { base: d.now(), hours: 0, week: 0 }, busy: { base: false, hours: false, week: false } };
    p = r.places[id];
  }
  return p;
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

export type WeatherTierOptions = Readonly<{
  adapter?: WeatherAdapter;
  refreshMs?: number;
}>;

const TIERS: readonly WxTier[] = ['base', 'hours', 'week'];

/**
 * Starts fetching and refreshing one placement's tiers while it is shown; stops when the current effect scope ends
 * (the widget's unmount). `tiers` gives the tiers its size shows. Returns the placement's tier state.
 */
export function useWeatherTiers(d: Dashboard, id: string, tiers: () => Tiers, opts: WeatherTierOptions = {}): WeatherPlace {
  const adapter = opts.adapter ?? sampleAdapter();
  const refreshMs = opts.refreshMs ?? WX_REFRESH_MS;
  const rt = weatherRuntime(d);
  const place = weatherPlace(d, id);
  /** The running fetch per tier; a response is used only while it is still the current one. */
  const running = new Map<WxTier, AbortController>();
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const wanted = (): Record<WxTier, boolean> => {
    const shown = isShown(d, id);
    const t = tiers();
    return { base: shown, hours: shown && t.hours, week: shown && t.week };
  };
  const endStale = (): void => { if (rt.st === 'stale') rt.st = 'ok'; };
  const cancel = (tier: WxTier): void => {
    const ac = running.get(tier);
    if (!ac) return;
    running.delete(tier);
    ac.abort();
    place.busy[tier] = false;
    if (tier === 'base') endStale();
  };
  const start = (tier: WxTier): void => {
    if (running.has(tier)) return;
    const ac = new AbortController();
    running.set(tier, ac);
    place.busy[tier] = true;
    // 基本の段を取り直す間は「更新中」. 表示テストで決めた状態（失敗など）は上書きしない.
    if (tier === 'base' && rt.st === 'ok') rt.st = 'stale';
    adapter.fetchTier(tier, ac.signal).then(() => {
      // 古い応答（止めた後・段が消えた後・配置が外れた後に届いたもの）は捨てる.
      if (stopped || running.get(tier) !== ac || !wanted()[tier]) return;
      running.delete(tier);
      place.busy[tier] = false;
      place.at[tier] = d.now();
      if (tier !== 'base') place.ready[tier] = true;
      else endStale();
      sync();
    }, () => {
      if (running.get(tier) !== ac) return;
      running.delete(tier);
      place.busy[tier] = false;
      if (tier === 'base') endStale();
    });
  };
  /** Starts what is needed now, stops what is no longer shown, and schedules the next refresh check. */
  function sync(): void {
    if (stopped) return;
    if (refreshTimer !== null) { clearTimeout(refreshTimer); refreshTimer = null; }
    const want = wanted();
    const now = d.now();
    let next = Infinity;
    for (const tier of TIERS) {
      if (!want[tier]) { cancel(tier); continue; }
      const at = place.at[tier];
      if (!at || now - at >= refreshMs) start(tier);
      else next = Math.min(next, at + refreshMs - now);
    }
    if (next !== Infinity) refreshTimer = setTimeout(() => { refreshTimer = null; sync(); }, next);
  }

  watch(() => { const w = wanted(); return String(w.base) + String(w.hours) + String(w.week); }, sync, { immediate: true, flush: 'sync' });
  onScopeDispose(() => {
    stopped = true;
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    for (const tier of [...running.keys()]) cancel(tier);
  });
  return place;
}
