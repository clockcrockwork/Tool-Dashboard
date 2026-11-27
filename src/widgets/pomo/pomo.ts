/**
 * ポモドーロの計算 (prototype `pomoOn`, `pomoLeft`, `pomoTog`, `pomoTime`, `pomoDash`, the countdown in `tick()`).
 * プロトタイプは1秒ごとに残りを1減らすが、本実装は**終わる時刻**を持って残りを計算する（実装ガイド 8章）。
 * 一時停止中は残りの秒数を持つ。どちらも保存しない（実装ガイド 6章: 再生中かどうか・画面の一時状態）.
 */
import { mmss } from '../shared/time';
import type { AskText } from '../../app/runtime/notify';

/** The permission request (prototype `pq.pomo`), shown by the frame through the shared notification. */
export const POMO_ASK: AskText = { title: '終わったら通知しますか？', text: 'このタブを見ていないときも、集中の時間が終わったことを知らせます。', go: 'このまま始める' };

/** `on`: running until `endAt`; paused: `left` seconds remain (null = the full time, like the prototype's null). */
export type PomoRun = Readonly<{ on: boolean; endAt: number | null; left: number | null }>;

export const POMO_IDLE: PomoRun = { on: false, endAt: null, left: null };
/** Circumference of the ring (r = 42). */
export const POMO_RING = 263.89;
export const PLAY_D = 'M8 5.5v13l11-6.5z';
export const PAUSE_D = 'M8 5v14M16 5v14';

/** Seconds shown: never above the set time (the setting may have been shortened while running), never below 0. */
export function pomoLeft(run: PomoRun, totalSec: number, now: number): number {
  const raw = run.on && run.endAt !== null ? Math.ceil((run.endAt - now) / 1000) : (run.left ?? totalSec);
  return Math.max(0, Math.min(raw, totalSec));
}

export function startPomo(run: PomoRun, totalSec: number, now: number): PomoRun {
  return { on: true, endAt: now + (run.left ?? totalSec) * 1000, left: null };
}

export function pausePomo(run: PomoRun, now: number): PomoRun {
  if (!run.on || run.endAt === null) return run;
  return { on: false, endAt: null, left: Math.max(0, Math.ceil((run.endAt - now) / 1000)) };
}

export function pomoFinished(run: PomoRun, now: number): boolean {
  return run.on && run.endAt !== null && now >= run.endAt;
}

export function pomoView(run: PomoRun, totalSec: number, now: number): { time: string; dash: string; d: string } {
  const left = pomoLeft(run, totalSec, now);
  return {
    time: mmss(left),
    dash: String(left / totalSec * POMO_RING) + ' ' + String(POMO_RING),
    d: run.on ? PAUSE_D : PLAY_D,
  };
}
