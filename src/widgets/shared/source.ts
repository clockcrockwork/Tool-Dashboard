/**
 * 外部の情報の取得と5つの状態（RSS・GitHub PR・今日は何の日で共通）. 天気（`weather/status.ts`）の仕組みを、段の無い1つの取得に
 * 縮めたもの（仕様書 3章「状態」「段階表示」、実装ガイド 8章、review #7）。保存しない（Dashboard ごとの runtime）。
 *
 *  - 状態（通常・読み込み中・更新中・空・失敗）は Dashboard ごとに1つ（プロトタイプの `demo` と同じく、開発用の表示テストが
 *    `setState(d, 'err')` で決める）。共通の枠が登録の `states` に合わせて覆いを出す。
 *  - 取得・更新は**表示中のとき**（`isShown`）だけ。見本は起動したときから届いている（プロトタイプと同じく、始めに読み込み中を
 *    出さない）。表示されたときに古ければ（登録の `refresh.every`。P4 まで null＝見本を取り直さない）取り直し、「更新中」を経て
 *    差し替える。取るものが変わった（`key`。今日は何の日の日付）ときも、表示中なら取り直す。それまでは前の内容を出しておく。
 *  - 表示されなくなった・部品が外れた（unmount）時点で取得と timer を止め、そのあとに届いた古い応答は捨てる。
 *  - 「もう一度」「接続する」は読み込み中を経て取り直す（プロトタイプ `stRetry`）。
 *
 * P2c の外部の情報の種類（RSS・GitHub PR・今日は何の日）で共通の部品なので `src/widgets/shared/` に置く。
 */
import { onScopeDispose, reactive, watch } from 'vue';
import type { Dashboard } from '../../app/store/store';
import { isShown } from '../../app/store/visibility';
import type { WxState } from '../weather/weather';

export type SourceState = WxState;

/** 取得の境界（P4 で実際の取得先に差し替える）. Rejects when aborted or failed. */
export type SourceAdapter<T> = Readonly<{ fetch: (key: string, signal: AbortSignal) => Promise<T> }>;

/** 見本の取得: `ms` 後に見本が届く（接続の点で見本と示す。実際に取得できたとは扱わない）. */
export function sampleAdapter<T>(get: (key: string) => T, ms = 1100): SourceAdapter<T> {
  return {
    fetch: (key, signal) => new Promise<T>((resolve, reject) => {
      const abort = (): void => { reject(new DOMException('Aborted', 'AbortError')); };
      if (signal.aborted) { abort(); return; }
      const t = setTimeout(() => { resolve(get(key)); }, ms);
      signal.addEventListener('abort', () => { clearTimeout(t); abort(); }, { once: true });
    }),
  };
}

/** One placement's content: what it is for (`key`), the value, when it arrived, and whether a fetch is running. */
export type SourcePlace<T> = { key: string; val: T; at: number; busy: boolean };
export type SourceRuntime<T> = { st: SourceState; places: Record<string, SourcePlace<T>> };

export type SourceOpts<T> = Readonly<{ adapter?: SourceAdapter<T>; refreshMs?: number | null }>;

export type Source<T> = Readonly<{
  runtime: (d: Dashboard) => SourceRuntime<T>;
  /** The content of a placement (the sample for `key` from the start). */
  place: (d: Dashboard, id: string, key: string) => SourcePlace<T>;
  state: (d: Dashboard) => SourceState;
  /** Display test hook: force one of the 5 states. */
  setState: (d: Dashboard, st: SourceState) => void;
  /** 「もう一度」「接続する」: 読み込み中 → 届いたら通常（失敗なら失敗）. */
  retry: (d: Dashboard, id: string, key: string, opts?: SourceOpts<T>) => void;
  /**
   * Fetches and refreshes one placement while it is shown; stops when the current effect scope ends (the widget's unmount).
   * `key` says what to fetch (it may change). Returns the placement's content.
   */
  use: (d: Dashboard, id: string, key: () => string, opts?: SourceOpts<T>) => SourcePlace<T>;
}>;

export type SourceDef<T> = Readonly<{
  /** The sample for `key` (there from the start; P4: the last saved content or nothing). */
  initial: (key: string) => T;
  /** Default adapter (the sample). */
  adapter: () => SourceAdapter<T>;
  /** Freshness (ms); null: not refreshed until P4 sets the interval (registry `refresh.every`). */
  refreshMs: number | null;
  /** The value is empty (→ 空). */
  empty?: (v: T) => boolean;
}>;

export function externalSource<T>(def: SourceDef<T>): Source<T> {
  const runtimes = new WeakMap<Dashboard, SourceRuntime<T>>();
  const runtime = (d: Dashboard): SourceRuntime<T> => {
    let r = runtimes.get(d);
    if (!r) {
      const init: SourceRuntime<T> = { st: 'ok', places: {} };
      r = reactive(init);
      runtimes.set(d, r);
    }
    return r;
  };
  const place = (d: Dashboard, id: string, key: string): SourcePlace<T> => {
    const r = runtime(d);
    let p = r.places[id];
    if (!p) {
      r.places[id] = { key, val: def.initial(key), at: d.now(), busy: false };
      p = r.places[id];
    }
    return p;
  };
  /** After a fetch: the state it settles in (a state forced by the display test is kept). */
  const settle = (r: SourceRuntime<T>, val: T): void => {
    if (r.st === 'load' || r.st === 'stale') r.st = def.empty?.(val) ? 'empty' : 'ok';
  };

  const retry = (d: Dashboard, id: string, key: string, opts: SourceOpts<T> = {}): void => {
    const r = runtime(d);
    const p = place(d, id, key);
    r.st = 'load';
    const adapter = opts.adapter ?? def.adapter();
    adapter.fetch(key, new AbortController().signal).then((val) => {
      if (r.st !== 'load') return;
      Object.assign(p, { key, val, at: d.now() });
      settle(r, val);
    }, () => {
      if (r.st === 'load') r.st = 'err';
    });
  };

  const use = (d: Dashboard, id: string, key: () => string, opts: SourceOpts<T> = {}): SourcePlace<T> => {
    const adapter = opts.adapter ?? def.adapter();
    const refreshMs = opts.refreshMs === undefined ? def.refreshMs : opts.refreshMs;
    const r = runtime(d);
    const p = place(d, id, key());
    let running: { ac: AbortController; key: string } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const endStale = (): void => { if (r.st === 'stale') r.st = 'ok'; };
    const cancel = (): void => {
      if (!running) return;
      const ac = running.ac;
      running = null;
      ac.abort();
      p.busy = false;
      endStale();
    };
    const start = (k: string): void => {
      if (running?.key === k) return;
      cancel();
      const run = { ac: new AbortController(), key: k };
      running = run;
      p.busy = true;
      // 取り直す間は「更新中」（前の内容を薄く残す）. 表示テストで決めた状態（失敗など）は上書きしない.
      if (r.st === 'ok') r.st = 'stale';
      adapter.fetch(k, run.ac.signal).then((val) => {
        // 古い応答（止めた後・表示されなくなった後・取るものが変わった後に届いたもの）は捨てる.
        if (stopped || running !== run || !isShown(d, id) || key() !== k) return;
        running = null;
        Object.assign(p, { key: k, val, at: d.now(), busy: false });
        settle(r, val);
        sync();
      }, () => {
        if (running !== run) return;
        running = null;
        p.busy = false;
        if (r.st === 'stale') r.st = 'err';
      });
    };
    function sync(): void {
      if (stopped) return;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      if (!isShown(d, id)) { cancel(); return; }
      const k = key();
      if (p.key !== k) { start(k); return; }
      if (running) return;
      if (refreshMs === null) return;
      const left = p.at + refreshMs - d.now();
      if (left <= 0) start(k);
      else timer = setTimeout(() => { timer = null; sync(); }, left);
    }

    watch(() => [isShown(d, id), key()] as const, sync, { immediate: true, flush: 'sync' });
    onScopeDispose(() => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      cancel();
    });
    return p;
  };

  return {
    runtime, place, retry, use,
    state: d => runtime(d).st,
    setState: (d, st) => { runtime(d).st = st; },
  };
}
