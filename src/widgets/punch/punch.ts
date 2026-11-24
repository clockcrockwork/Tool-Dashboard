/**
 * 打刻の計算 (prototype `pSt`, `pAcc`, `pnState`, `pnWorked`, `pnLine`, `pnMain*`, `pnBreak*`, `stamp()`).
 * 勤務時間は「出勤・再開」から「休憩・退勤」までの合計に、いま勤務中ならその始まりから今までを足す（時刻から計算する）.
 */
import { fm, p2 } from '../shared/time';
import { PUNCH_MAX, type PunchKind, type Stamp } from './data';

export type PunchState = 'off' | 'in' | 'break';

const TAG: Readonly<Record<PunchKind, string>> = { in: '出', break: '休', resume: '戻', out: '退' };
/** The text written to the toast and to the time log for each kind (prototype `stamp(kind, label)`). */
export const PUNCH_LABEL: Readonly<Record<PunchKind, string>> = { in: '出勤', break: '休憩開始', resume: '休憩終了', out: '退勤' };

export function punchState(stamps: readonly Stamp[]): PunchState {
  const last = stamps[stamps.length - 1];
  return !last || last.k === 'out' ? 'off' : last.k === 'break' ? 'break' : 'in';
}

/** Worked seconds. */
export function workedSecs(stamps: readonly Stamp[], now: number): number {
  let acc = 0;
  let from: number | null = null;
  for (const p of stamps) {
    if (p.k === 'in' || p.k === 'resume') from = p.t;
    else if (from !== null) { acc += p.t - from; from = null; }
  }
  if (from !== null) acc += now - from;
  return Math.max(0, Math.floor(acc / 1000));
}

export function punchView(stamps: readonly Stamp[], now: number): {
  state: string; worked: string; line: string; mainLabel: string; mainCls: string; off: boolean; breakLabel: string;
} {
  const st = punchState(stamps);
  const s = workedSecs(stamps, now);
  return {
    state: st === 'in' ? '勤務中' : st === 'break' ? '休憩中' : stamps.length ? '退勤済み' : '未出勤',
    worked: String(Math.floor(s / 3600)) + ':' + p2(Math.floor(s / 60) % 60) + ':' + p2(s % 60),
    line: stamps.slice(-4).map(p => TAG[p.k] + ' ' + fm(p.t)).join('　') || '打刻なし',
    mainLabel: st === 'off' ? '出勤' : '退勤',
    mainCls: st === 'off' ? 'on' : '',
    off: st === 'off',
    breakLabel: st === 'break' ? '再開' : '休憩',
  };
}

/** What the main button stamps (出勤／退勤). */
export function mainKind(stamps: readonly Stamp[]): PunchKind {
  return punchState(stamps) === 'off' ? 'in' : 'out';
}

/** What the break button stamps (休憩／再開); null while off duty (the button is disabled). */
export function breakKind(stamps: readonly Stamp[]): PunchKind | null {
  const st = punchState(stamps);
  return st === 'in' ? 'break' : st === 'break' ? 'resume' : null;
}

export function addStamp(stamps: readonly Stamp[], k: PunchKind, t: number, id: number): Stamp[] {
  return [...stamps, { id, k, t }].slice(-PUNCH_MAX);
}

export function nextStampId(stamps: readonly Stamp[], now: number): number {
  return Math.max(now, ...stamps.map(x => x.id + 1));
}
