/**
 * ポモドーロの実行状態（保存しない）: 置いた1個ごとの「動いているか・終わる時刻・一時停止中の残り」.
 * Dashboard の実行管理（`runtimeOf(d)`）に置くので、部品が作り直されても・一時利用を閉じても・未配置でも続き、完了は
 * runner.ts が期限で判定する。変えるたびに新しい実行 ID になる（古い完了の callback は無効）。再読み込みでは消える（プロトタイプと同じ）.
 */
import type { Dashboard } from '../../app/store/store';
import { runtimeOf } from '../../app/runtime/runtime';
import { askNotify } from '../../app/runtime/notify';
import { POMO_ASK, POMO_IDLE, pausePomo, startPomo, type PomoRun } from './pomo';

export function pomoRunOf(d: Dashboard, id: string): PomoRun {
  return runtimeOf(d).state(id, POMO_IDLE);
}

/** Returns the new run ID. */
export function setPomoRun(d: Dashboard, id: string, run: PomoRun): number {
  return runtimeOf(d).set(id, run);
}

/** The set time in seconds (setting 「集中する時間」). */
export function pomoTotal(d: Dashboard, id: string): number {
  return (Number(d.cfgOf(id, 'min')) || 25) * 60;
}

/** スタート: starts unless it runs already (an answer to the permission request may come later, or twice). */
export function pomoGo(d: Dashboard, id: string): void {
  const r = pomoRunOf(d, id);
  if (!r.on) setPomoRun(d, id, startPomo(r, pomoTotal(d, id), d.now()));
}

/**
 * スタート・一時停止 (prototype `pomoTog`): pauses a running timer; otherwise starts it, first asking for notifications
 * through the shared request when 「完了を通知」 is on and the permission is not answered (仕様書 4章「許可のお願い」).
 */
export function pomoToggle(d: Dashboard, id: string): void {
  const r = pomoRunOf(d, id);
  if (r.on) setPomoRun(d, id, pausePomo(r, d.now()));
  else askNotify(d, id, POMO_ASK, () => { pomoGo(d, id); });
}

/** リセット. */
export function pomoReset(d: Dashboard, id: string): void {
  setPomoRun(d, id, POMO_IDLE);
}
