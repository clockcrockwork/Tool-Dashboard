/**
 * ストップウォッチの一時状態（保存しない。プロトタイプと同じく再読み込みで消える）. Dashboard ごと・置いた1個ごとに持つので、
 * 部品が作り直されても（大きさの変更・前面表示）計測は続く.
 */
import { reactive } from 'vue';
import type { Dashboard } from '../../app/store/store';
import { SW_IDLE, type SwRun } from './stopwatch';

const runtimes = new WeakMap<Dashboard, Record<string, SwRun>>();

function runs(d: Dashboard): Record<string, SwRun> {
  let r = runtimes.get(d);
  if (!r) {
    r = reactive<Record<string, SwRun>>({});
    runtimes.set(d, r);
  }
  return r;
}

export function swOf(d: Dashboard, id: string): SwRun {
  return runs(d)[id] ?? SW_IDLE;
}

export function setSw(d: Dashboard, id: string, s: SwRun): void {
  runs(d)[id] = s;
}
