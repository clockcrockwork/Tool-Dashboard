/**
 * 次の期限に合わせた timer（scheduler.ts）: 作ることと放すこと、古い callback を呼ばないこと、遅れた timer を時刻で判定すること.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_WAIT_MS, Scheduler } from './scheduler';

const T0 = new Date(2026, 10, 19, 10, 24, 36).getTime();

describe('Scheduler', () => {
  beforeEach(() => { vi.useFakeTimers({ now: T0 }); });
  afterEach(() => { vi.useRealTimers(); });

  it('one timer for the earliest deadline; released when nothing is left', () => {
    const s = new Scheduler(() => Date.now());
    const calls: string[] = [];
    expect(vi.getTimerCount()).toBe(0);
    s.at('a', T0 + 5_000, () => calls.push('a'));
    s.at('b', T0 + 2_000, () => calls.push('b'));
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2_000);
    expect(calls).toEqual(['b']);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(3_000);
    expect(calls).toEqual(['b', 'a']);
    expect(s.size).toBe(0);
    expect(s.armed).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives each callback the time it runs at, never before its deadline', () => {
    const s = new Scheduler(() => Date.now());
    const at: number[] = [];
    s.at('a', T0 + 1_234, now => at.push(now));
    vi.advanceTimersByTime(1_233);
    expect(at).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(at).toEqual([T0 + 1_234]);
  });

  it('a new deadline for the same key or a cancel makes the old callback stale (never called)', () => {
    const s = new Scheduler(() => Date.now());
    const calls: string[] = [];
    s.at('k', T0 + 1_000, () => calls.push('old'));
    s.at('k', T0 + 3_000, () => calls.push('new'));
    vi.advanceTimersByTime(2_000);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1_000);
    expect(calls).toEqual(['new']);
    s.at('x', T0 + 9_000, () => calls.push('x'));
    s.cancel('x');
    vi.advanceTimersByTime(10_000);
    expect(calls).toEqual(['new']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a callback that replaces another due deadline of the same round stops it', () => {
    const s = new Scheduler(() => Date.now());
    const calls: string[] = [];
    s.at('a', T0 + 1_000, () => { calls.push('a'); s.cancel('b'); });
    s.at('b', T0 + 1_000, () => calls.push('b'));
    vi.advanceTimersByTime(1_000);
    expect(calls).toEqual(['a']);
  });

  it('waits at most a minute at a time (re-arming calls nothing), for far deadlines and clock changes', () => {
    const s = new Scheduler(() => Date.now());
    const fn = vi.fn();
    s.at('far', T0 + 3 * 3600_000, fn);
    vi.advanceTimersByTime(MAX_WAIT_MS);
    expect(fn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    // The device clock jumps forward (sleep, manual change): the next re-arm sees it at once.
    vi.setSystemTime(T0 + 4 * 3600_000);
    vi.advanceTimersByTime(MAX_WAIT_MS);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('run() judges at once the deadlines a held-back timer missed (tab back from the background)', () => {
    const s = new Scheduler(() => Date.now());
    const fn = vi.fn();
    s.at('a', T0 + 1_000, fn);
    // The timer did not fire (throttled), but the clock went on.
    vi.setSystemTime(T0 + 90_000);
    s.run();
    expect(fn).toHaveBeenCalledWith(T0 + 90_000);
    expect(s.size).toBe(0);
  });

  it('cancelPrefix / stop forget the deadlines of one placement / all, and release the timer', () => {
    const s = new Scheduler(() => Date.now());
    s.at('pomo|', T0 + 1_000, () => {});
    s.at('alarm|', T0 + 2_000, () => {});
    s.cancelPrefix('pomo|');
    expect(s.has('pomo|')).toBe(false);
    expect(s.when('alarm|')).toBe(T0 + 2_000);
    s.stop();
    expect(s.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('an error in one callback does not stop the others', () => {
    const s = new Scheduler(() => Date.now());
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fn = vi.fn();
    s.at('a', T0 + 1_000, () => { throw new Error('x'); });
    s.at('b', T0 + 1_000, fn);
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
