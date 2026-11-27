/**
 * Dashboard の実行管理（p2a-followup.md 1章「実行状態と予定の管理は Dashboard が持つ」）.
 *
 * - **実行状態**: 置いた1個（配置 ID）ごとに1つ。値と実行 ID（`rid`、変えるたびに新しい番号）を持つ。Dashboard ごとに
 *   メモリにだけ持ち、cfg / data に入れない（実装ガイド 6章。再読み込みで消える）。部品が作り直されても（置き場所・大きさの
 *   変更、前面表示、一時利用を閉じる・開き直す、画面の移動）同じ配置 ID の状態を読むので、続きから見える。
 * - **種類ごとの処理（`Runner`）**: 期限を待つ種類（アラームの見張り、ポモドーロの完了）が登録する。Dashboard が動いている間、
 *   その種類の配置ごとに1回 `start` を呼ぶ（View の mount と関係なく、未配置でも）。処理の無い種類は何も動かさない。
 *   配置が並びから消えたら（読み込み・元に戻す）その処理を止め、期限を取り消す。
 * - **期限**: `Scheduler`（次の期限に合わせた timer 1本）。タブが裏から戻ったら（`visibilitychange`）期限の来たものを
 *   すぐ判定し直す。古い期限・古い callback を捨てるのは、期限を入れ直す（同じ key）か実行 ID を見比べて行う。
 * - **担当のタブ**: `OwnerLock`（P3 で Web Locks）。知らせ（音・通知）の前に `owns()` を見る。今は常に担当。
 */
import { effectScope, reactive, shallowReactive, watch, type EffectScope } from 'vue';
import type { Dashboard } from '../store/store';
import { kindOf } from '../registry/instances';
import { Scheduler } from './scheduler';
import { THIS_TAB, type OwnerLock } from './owner';
import { notify, type NotifyMsg, type NotifySent } from './notify';

/** Whether the page (tab) is being looked at; replaceable in tests. */
export type PageVisibility = Readonly<{ hidden: () => boolean; onChange: (fn: () => void) => () => void }>;

export const DOCUMENT_PAGE: PageVisibility = {
  hidden: () => typeof document !== 'undefined' && document.hidden,
  onChange: (fn) => {
    if (typeof document === 'undefined') return () => {};
    document.addEventListener('visibilitychange', fn);
    return () => { document.removeEventListener('visibilitychange', fn); };
  },
};

/** What a kind's handler gets for one placement. */
export type RunCtx = Readonly<{
  d: Dashboard;
  /** Placement ID. */
  id: string;
  kind: string;
  /** Calls `fn(now)` once at or after `at` (replaces this placement's deadline named `sub`). */
  at: (at: number, fn: (now: number) => void, sub?: string) => void;
  cancel: (sub?: string) => void;
  /** This tab is in charge of `task` (P3 Web Locks; always true now). Check it before ringing or notifying. */
  owns: (task: string) => boolean;
  /** The shared notification (`notify.ts`) for this placement. */
  notify: (msg: NotifyMsg) => NotifySent;
}>;

/**
 * A kind's handler. `start` runs once per placement inside its own effect scope while the Dashboard runs: it may use
 * `watch` (use `flush: 'sync'` so a change of settings re-plans at once) and `onScopeDispose`. Deadlines set through the
 * context are cancelled when the scope stops.
 */
export type Runner = Readonly<{ start: (ctx: RunCtx) => void }>;

/**
 * 要求実行（登録の `run: 'request'`: スクリプト・画像変換・翻訳・AI の生成）の取り決めだけ（P2 の各分類・P4 で作る）.
 * 明示した Run で `set(id, { phase: 'run', … })` して実行 ID を得る。終了・失敗・取消・上限で `phase` を変えて止める。
 * 上限は `at(開始の時刻 + 上限, …)` の期限で、取消・やり直しは実行 ID が変わるので、古い実行の結果（遅れて届いた応答）は
 * 実行 ID を見比べて捨てる。表示・配置の変化（mount・置き場所・画面）で Run しない。時刻・イベントの監視のうち接続で始まるもの
 * （受け渡しの受信）は、接続の設定を `watch` する `Runner` で表す。
 */
export type RequestPhase = 'run' | 'done' | 'fail' | 'cancel' | 'limit';

export type RuntimeOptions = Readonly<{ owner?: OwnerLock; page?: PageVisibility }>;

type Slot = Readonly<{ rid: number; v: unknown }>;

export class Runtime {
  readonly sched: Scheduler;
  /** The tab is in front (follows `visibilitychange` while started). Views stop fine redrawing while false. */
  readonly page = reactive({ shown: true });
  private readonly d: Dashboard;
  private readonly slots = shallowReactive<Record<string, Slot>>({});
  private seq = 0;
  private owner: OwnerLock = THIS_TAB;
  private stopFn: (() => void) | null = null;
  private readonly scopes = new Map<string, EffectScope>();

  constructor(d: Dashboard) {
    this.d = d;
    this.sched = new Scheduler(() => d.now());
  }

  // ---------- 実行状態 ----------
  /** The run state of a placement, or `fallback` when none was set. */
  state<T>(id: string, fallback: T): T {
    const s = this.slots[id];
    return s ? (s.v as T) : fallback;
  }
  /** The run ID of the placement's current state (0: none). A new ID with every `set`. */
  rid(id: string): number {
    return this.slots[id]?.rid ?? 0;
  }
  /** Replaces the run state; returns its new run ID (callbacks holding an older ID are stale). */
  set(id: string, v: unknown): number {
    const rid = ++this.seq;
    this.slots[id] = { rid, v };
    return rid;
  }
  // ---------- 動かす ----------
  get running(): boolean {
    return this.stopFn !== null;
  }
  /** Placements whose handler is started. */
  started(): string[] {
    return [...this.scopes.keys()];
  }

  /**
   * Starts the handlers of `runners` (by kind) for every placement in the order, and keeps following the order. Call
   * once when the Dashboard starts (`DashboardRoot`); returns the stop (releases every timer and listener).
   */
  start(runners: Readonly<Record<string, Runner>>, opts: RuntimeOptions = {}): () => void {
    if (this.stopFn) return this.stopFn;
    this.owner = opts.owner ?? THIS_TAB;
    const page = opts.page ?? DOCUMENT_PAGE;
    this.page.shown = !page.hidden();
    const begin = (id: string): void => {
      const r = runners[kindOf(id)];
      if (!r || this.scopes.has(id)) return;
      const sc = effectScope(true);
      this.scopes.set(id, sc);
      sc.run(() => { r.start(this.ctx(id)); });
    };
    const end = (id: string): void => {
      this.scopes.get(id)?.stop();
      this.scopes.delete(id);
      this.sched.cancelPrefix(id + '|');
    };
    const root = effectScope(true);
    root.run(() => {
      watch(() => this.d.g.order.filter(id => !!runners[kindOf(id)]), (ids) => {
        for (const id of [...this.scopes.keys()]) if (!ids.includes(id)) end(id);
        for (const id of ids) begin(id);
      }, { immediate: true, flush: 'sync' });
    });
    // A tab coming back from the background: deadlines whose timer was held back are judged now, by the clock.
    const offPage = page.onChange(() => {
      this.page.shown = !page.hidden();
      if (this.page.shown) this.sched.run();
    });
    const offOwner = this.owner.onChange(() => { this.sched.run(); });
    this.stopFn = () => {
      root.stop();
      for (const id of [...this.scopes.keys()]) end(id);
      offPage();
      offOwner();
      this.sched.stop();
      this.stopFn = null;
    };
    return this.stopFn;
  }

  private ctx(id: string): RunCtx {
    const key = (sub = ''): string => id + '|' + sub;
    return {
      d: this.d, id, kind: kindOf(id),
      at: (at, fn, sub) => { this.sched.at(key(sub), at, fn); },
      cancel: (sub) => { this.sched.cancel(key(sub)); },
      owns: task => this.owner.owns(task),
      notify: msg => notify(this.d, id, msg),
    };
  }
}

const runtimes = new WeakMap<Dashboard, Runtime>();

/** The Dashboard's runtime (created on first use; handlers run only after `startRuntime`). */
export function runtimeOf(d: Dashboard): Runtime {
  let r = runtimes.get(d);
  if (!r) {
    r = new Runtime(d);
    runtimes.set(d, r);
  }
  return r;
}

export function startRuntime(d: Dashboard, runners: Readonly<Record<string, Runner>>, opts?: RuntimeOptions): () => void {
  return runtimeOf(d).start(runners, opts);
}
