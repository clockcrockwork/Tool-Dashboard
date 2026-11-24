/**
 * ポモドーロの一時状態（保存しない）: 置いた1個ごとの「動いているか・終わる時刻・一時停止中の残り」.
 * Dashboard ごとに持つので、部品が作り直されても（大きさの変更・前面表示など）続きから動く。再読み込みでは消える（プロトタイプと同じ）.
 */
import { reactive } from 'vue';
import type { Dashboard } from '../../app/store/store';
import { POMO_IDLE, type PomoRun } from './pomo';

const runtimes = new WeakMap<Dashboard, Record<string, PomoRun>>();

export function pomoRuns(d: Dashboard): Record<string, PomoRun> {
  let r = runtimes.get(d);
  if (!r) {
    r = reactive<Record<string, PomoRun>>({});
    runtimes.set(d, r);
  }
  return r;
}

export function pomoRunOf(d: Dashboard, id: string): PomoRun {
  return pomoRuns(d)[id] ?? POMO_IDLE;
}

export function setPomoRun(d: Dashboard, id: string, run: PomoRun): void {
  pomoRuns(d)[id] = run;
}

/**
 * 許可のお願いの表示（prototype `pmAsk.pomo` と、そのときの許否）: null 出さない, 'ask' 「終わったら通知しますか？」,
 * 'no' 「通知を出せません」。保存しない。
 */
export type PomoAsk = 'ask' | 'no' | null;
const asks = new WeakMap<Dashboard, Record<string, PomoAsk>>();

function askMap(d: Dashboard): Record<string, PomoAsk> {
  let r = asks.get(d);
  if (!r) {
    r = reactive<Record<string, PomoAsk>>({});
    asks.set(d, r);
  }
  return r;
}

export function pomoAskOf(d: Dashboard, id: string): PomoAsk {
  return askMap(d)[id] ?? null;
}

export function setPomoAsk(d: Dashboard, id: string, v: PomoAsk): void {
  askMap(d)[id] = v;
}
