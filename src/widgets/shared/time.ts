/**
 * 時間の分類（P2a）で共通の小さな計算と、表示中だけ進む時計.
 *
 * 時刻は `d.ui.t`（1秒ごと）か `d.now()` から取る（開発フロー 4章「時刻・乱数」）。経過や残りは、始めた時刻・終わる時刻から
 * 計算し、1秒ごとに数えない（実装ガイド 8章「見えていないときの処理」）。
 */
import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { Dashboard } from '../../app/store/store';
import { isShown } from '../../app/store/visibility';
import { runtimeOf } from '../../app/runtime/runtime';

export const p2 = (n: number): string => String(n).padStart(2, '0');

/** `HH:MM`, or `HH:MM:SS` with `sec` (prototype `fm`). */
export function fm(t: number, sec = false): string {
  const d = new Date(t);
  return p2(d.getHours()) + ':' + p2(d.getMinutes()) + (sec ? ':' + p2(d.getSeconds()) : '');
}

/** `MM:SS` from seconds (prototype `mmss`); minutes go past 99 as they are. */
export function mmss(n: number): string {
  return p2(Math.floor(n / 60)) + ':' + p2(n % 60);
}

/** Start of the local day of `t`. */
export function dayStart(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** `calc(42.13% - 1px)`: a mark at `t` on a 0–24 h bar (prototype `logMarks`, `dayNow`). */
export function dayPos(t: number, day0: number): string {
  return 'calc(' + ((t - day0) / 864e5 * 100).toFixed(2) + '% - 1px)';
}

/** The placement is shown and the tab is in front (the runtime follows `visibilitychange`). */
export function drawnNow(d: Dashboard, id: string): boolean {
  return isShown(d, id) && runtimeOf(d).page.shown;
}

/**
 * The 1-second clock (`d.ui.t`) as one placement sees it: it follows the tick only while the placement is shown
 * (`isShown`: the current screen, the front view or temporary use) and the tab is in front, and keeps its last value
 * otherwise, so a widget on another screen, unplaced or in a background tab is not redrawn every second
 * (仕様書 3章「段階表示」, review #7). When it is shown again the value catches up at once.
 */
export function useShownNow(d: Dashboard, id: string): ComputedRef<number> {
  let last = d.ui.t;
  return computed(() => {
    if (drawnNow(d, id)) last = d.ui.t;
    return last;
  });
}

/**
 * A fine redraw clock (ストップウォッチの 0.1 秒): an interval runs only while `active()` and the placement is drawn
 * (`drawnNow`); otherwise no timer exists. The value is set to the current time whenever that changes, and may be set by
 * the caller (after an operation). Released with the component (or effect scope).
 */
export function useFaceClock(d: Dashboard, id: string, active: () => boolean, ms: number): Ref<number> {
  const at = ref(d.now());
  let iv: ReturnType<typeof setInterval> | undefined;
  const stop = (): void => {
    if (iv !== undefined) clearInterval(iv);
    iv = undefined;
  };
  watch(() => active() && drawnNow(d, id), (on) => {
    stop();
    at.value = d.now();
    if (on) iv = setInterval(() => { at.value = d.now(); }, ms);
  }, { immediate: true, flush: 'sync' });
  onScopeDispose(stop);
  return at;
}
