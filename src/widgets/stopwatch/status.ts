/**
 * ストップウォッチの実行状態（保存しない。プロトタイプと同じく再読み込みで消える）. Dashboard の実行管理（`runtimeOf(d)`）に
 * 置いた1個ごとに持つので、部品が作り直されても・見えなくても・未配置でも、経過の基準（止めていた分の合計と始めた時刻）を
 * 持ち続ける。経過は始めた時刻から計算できるので、期限の処理（runner）は持たず、見えない間は時を刻まない.
 */
import type { Dashboard } from '../../app/store/store';
import { runtimeOf } from '../../app/runtime/runtime';
import { SW_IDLE, type SwRun } from './stopwatch';

export function swOf(d: Dashboard, id: string): SwRun {
  return runtimeOf(d).state(id, SW_IDLE);
}

export function setSw(d: Dashboard, id: string, s: SwRun): void {
  runtimeOf(d).set(id, s);
}
