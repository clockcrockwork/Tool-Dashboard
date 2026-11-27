/**
 * 外部の情報の取得と5つの状態（RSS・GitHub PR・今日は何の日で共通。仕様書 3章「状態」、review #7）: 代表 fixture —
 * 起動直後は取りに行かない、表示中だけ取得・更新、表示していない画面、取るものが変わる、古い応答を捨てる、unmount、もう一度.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { Dashboard } from '../../app/store/store';
import { memoryStore } from '../../app/store/persist';
import { externalSource, sampleAdapter, type SourceAdapter } from './source';

const FETCH = 1000;
const REFRESH = 60_000;

function make(board: 'g0' | 'g1' = 'g0'): Dashboard {
  const d = new Dashboard({ store: memoryStore(), dataDefs: {}, now: () => Date.now(), setTimeout: () => 0 });
  d.ui.tour = -1;
  d.g.groups = [{ id: 'g0', n: 'ボード 1' }, { id: 'g1', n: 'ボード 2' }];
  d.g.off = { ...d.g.off, rss: false };
  d.g.place = { ...d.g.place, rss: board };
  return d;
}
function counting(ignoreAbort = false): SourceAdapter<string> & { calls: string[] } {
  const calls: string[] = [];
  const base = sampleAdapter((k: string) => 'v:' + k, FETCH);
  return {
    calls,
    fetch: (k, signal) => {
      calls.push(k);
      if (!ignoreAbort) return base.fetch(k, signal);
      return new Promise<string>(resolve => { setTimeout(() => { resolve('late:' + k); }, FETCH); });
    },
  };
}
const src = (refreshMs: number | null = REFRESH) => externalSource<string>({ initial: k => 'init:' + k, adapter: () => sampleAdapter(k => 'v:' + k, FETCH), refreshMs, empty: v => v === 'v:none' });
function mount<T>(fn: () => T): { v: T; unmount: () => void } {
  const scope = effectScope();
  const v = scope.run(fn) as T;
  return { v, unmount: () => { scope.stop(); } };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 19, 10, 24, 36)); });
afterEach(() => { vi.useRealTimers(); });

describe('表示中だけ取得・更新する', () => {
  it('起動直後は見本が届いていて取りに行かない。状態は通常', async () => {
    const s = src();
    const d = make();
    const a = counting();
    const { v } = mount(() => s.use(d, 'rss', () => 'k', { adapter: a }));
    await vi.advanceTimersByTimeAsync(FETCH * 3);
    expect(a.calls).toEqual([]);
    expect(v.val).toBe('init:k');
    expect(s.state(d)).toBe('ok');
  });

  it('古くなったら「更新中」を経て差し替える（表示中だけ）', async () => {
    const s = src();
    const d = make();
    const a = counting();
    const { v } = mount(() => s.use(d, 'rss', () => 'k', { adapter: a }));
    await vi.advanceTimersByTimeAsync(REFRESH);
    expect(a.calls).toEqual(['k']);
    expect(s.state(d)).toBe('stale');
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(v.val).toBe('v:k');
    expect(s.state(d)).toBe('ok');
  });

  it('表示していない画面では更新しない。表示されたときに古ければ取り直す', async () => {
    const s = src();
    const d = make('g1');
    const a = counting();
    mount(() => s.use(d, 'rss', () => 'k', { adapter: a }));
    await vi.advanceTimersByTimeAsync(REFRESH * 3);
    expect(a.calls).toEqual([]);
    d.g.place = { ...d.g.place, rss: 'g0' };
    await nextTick();
    expect(a.calls).toEqual(['k']);
  });

  it('未配置なら取らない。前面表示（一時利用）では取る', async () => {
    const s = src();
    const d = make();
    d.g.off = { ...d.g.off, rss: true };
    const a = counting();
    mount(() => s.use(d, 'rss', () => 'k', { adapter: a }));
    await vi.advanceTimersByTimeAsync(REFRESH * 2);
    expect(a.calls).toEqual([]);
    Object.assign(d.ui, { temp: 'rss', big: 'rss' });
    await nextTick();
    expect(a.calls).toEqual(['k']);
  });

  it('取るものが変わったら表示中は取り直し、届くまでは前の内容を出しておく', async () => {
    const s = src(null);
    const d = make();
    const a = counting();
    const key = ref('11-18');
    const { v } = mount(() => s.use(d, 'rss', () => key.value, { adapter: a }));
    key.value = '11-19';
    await nextTick();
    expect(a.calls).toEqual(['11-19']);
    expect(v).toMatchObject({ key: '11-18', val: 'init:11-18' });
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(v).toMatchObject({ key: '11-19', val: 'v:11-19' });
  });

  it('refresh が null（P4 まで）なら見本を取り直さない', async () => {
    const s = src(null);
    const d = make();
    const a = counting();
    mount(() => s.use(d, 'rss', () => 'k', { adapter: a }));
    await vi.advanceTimersByTimeAsync(REFRESH * 10);
    expect(a.calls).toEqual([]);
  });
});

describe('止める・古い応答・unmount', () => {
  it('取得中に画面を移ると止め、遅れて届いた応答は捨てる', async () => {
    const s = src();
    const d = make();
    const a = counting(true);
    const { v } = mount(() => s.use(d, 'rss', () => 'k', { adapter: a }));
    await vi.advanceTimersByTimeAsync(REFRESH);
    expect(s.state(d)).toBe('stale');
    d.g.place = { ...d.g.place, rss: 'g1' };
    await nextTick();
    expect(s.state(d)).toBe('ok');
    await vi.advanceTimersByTimeAsync(FETCH);
    expect(v.val).toBe('init:k');
  });

  it('unmount で timer と取得を止める（そのあと何も取りに行かない）', async () => {
    const s = src();
    const d = make();
    const a = counting();
    const { unmount } = mount(() => s.use(d, 'rss', () => 'k', { adapter: a }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(REFRESH * 3);
    expect(a.calls).toEqual([]);
  });

  it('同じ配置の内容は部品が作り直されても残る（runtime。保存はしない）', async () => {
    const s = src();
    const d = make();
    const first = mount(() => s.use(d, 'rss', () => 'k', { adapter: counting() }));
    await vi.advanceTimersByTimeAsync(REFRESH + FETCH);
    first.unmount();
    const second = mount(() => s.use(d, 'rss', () => 'k', { adapter: counting() }));
    expect(second.v.val).toBe('v:k');
  });
});

describe('5つの状態', () => {
  it('表示テストで決めた状態（失敗）は、更新で上書きしない', async () => {
    const s = src();
    const d = make();
    s.setState(d, 'err');
    mount(() => s.use(d, 'rss', () => 'k', { adapter: counting() }));
    await vi.advanceTimersByTimeAsync(REFRESH + FETCH);
    expect(s.state(d)).toBe('err');
  });
  it('もう一度: 読み込み中 → 届いたら通常。空の内容なら空、失敗なら失敗', async () => {
    const s = src();
    const d = make();
    s.setState(d, 'err');
    s.retry(d, 'rss', 'k', { adapter: sampleAdapter(k => 'v:' + k, 1400) });
    expect(s.state(d)).toBe('load');
    await vi.advanceTimersByTimeAsync(1400);
    expect(s.state(d)).toBe('ok');
    expect(s.place(d, 'rss', 'k').val).toBe('v:k');
    s.retry(d, 'rss', 'none', { adapter: sampleAdapter(() => 'v:none', 10) });
    await vi.advanceTimersByTimeAsync(10);
    expect(s.state(d)).toBe('empty');
    s.retry(d, 'rss', 'k', { adapter: { fetch: () => Promise.reject(new Error('net')) } });
    await vi.advanceTimersByTimeAsync(0);
    expect(s.state(d)).toBe('err');
  });
  it('状態は Dashboard ごと（ストーリーやテストの2つの Dashboard で混ざらない）', () => {
    const s = src();
    const a = make(), b = make();
    s.setState(a, 'empty');
    expect(s.state(b)).toBe('ok');
  });
});
