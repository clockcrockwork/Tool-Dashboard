/**
 * 次の期限に合わせた timer（p2a-followup.md 1章「基盤の作り」）. 汎用のキュー・Worker・常駐プロセスではなく、
 * 期限を key ごとに1つ持ち、いちばん早い期限に合わせた timer を1本だけ張る。
 *
 * - 期限は時刻（`now()` の値）で持つ。timer が遅れても（タブが裏・端末のスリープ）、呼ぶときの時刻を渡すので、判定は
 *   その時刻で行う（古すぎる期限を捨てるのは呼ばれる側。例: アラームは1分より前に過ぎたものを鳴らさない）。
 * - timer は最長 `MAX_WAIT_MS` ごとに張り直す（端末の時刻が変わっても期限から外れないため）。張り直しは種類の処理を呼ばない。
 * - 同じ key に期限を入れ直す・取り消すと、前の callback は呼ばれない（古い callback を無効にする）。期限が無くなれば timer を放す。
 * - `run()` は期限の来たものをすぐ呼ぶ（`visibilitychange` で戻ったときの判定し直し）。
 */
export type TimerApi = Readonly<{
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
}>;

/** The global timers, looked up at call time (so test fake timers installed later are used). */
export const GLOBAL_TIMERS: TimerApi = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => { clearTimeout(h as ReturnType<typeof setTimeout>); },
};

/** Longest single wait. Re-arming only re-reads the clock; it calls no handler. */
export const MAX_WAIT_MS = 60_000;

type Entry = { at: number; fn: (now: number) => void };

export class Scheduler {
  private readonly entries = new Map<string, Entry>();
  private handle: unknown = null;
  private readonly now: () => number;
  private readonly timers: TimerApi;

  constructor(now: () => number, timers: TimerApi = GLOBAL_TIMERS) {
    this.now = now;
    this.timers = timers;
  }

  /** Calls `fn(now)` once, at or after `at`, unless `key` is given another deadline or cancelled first. */
  at(key: string, at: number, fn: (now: number) => void): void {
    this.entries.set(key, { at, fn });
    this.arm();
  }

  cancel(key: string): void {
    if (this.entries.delete(key)) this.arm();
  }

  /** Cancels every key that starts with `prefix` (all deadlines of one placement). */
  cancelPrefix(prefix: string): void {
    let hit = false;
    for (const k of [...this.entries.keys()]) if (k.startsWith(prefix)) { this.entries.delete(k); hit = true; }
    if (hit) this.arm();
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Deadline of `key`, or null. */
  when(key: string): number | null {
    return this.entries.get(key)?.at ?? null;
  }

  get size(): number {
    return this.entries.size;
  }

  /** A timer is set (false when there is nothing to wait for). */
  get armed(): boolean {
    return this.handle !== null;
  }

  /**
   * Calls every deadline that has come, earliest first, with the current time, then re-arms. A deadline replaced or
   * cancelled by an earlier callback of the same round is not called (it is stale).
   */
  run(): void {
    const now = this.now();
    const due = [...this.entries].filter(([, e]) => e.at <= now).sort((a, b) => a[1].at - b[1].at);
    for (const [k, e] of due) {
      if (this.entries.get(k) !== e) continue;
      this.entries.delete(k);
      try {
        e.fn(now);
      } catch (err) {
        console.error(err);
      }
    }
    this.arm();
  }

  /** Releases the timer and forgets every deadline. */
  stop(): void {
    this.entries.clear();
    this.release();
  }

  private release(): void {
    if (this.handle !== null) this.timers.clearTimeout(this.handle);
    this.handle = null;
  }

  private arm(): void {
    this.release();
    let next = Infinity;
    for (const e of this.entries.values()) next = Math.min(next, e.at);
    if (next === Infinity) return;
    const wait = Math.max(0, Math.min(MAX_WAIT_MS, next - this.now()));
    this.handle = this.timers.setTimeout(() => {
      this.handle = null;
      this.run();
    }, wait);
  }
}
