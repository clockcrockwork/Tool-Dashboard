/**
 * ストップウォッチの計算 (prototype `swRun`, `swBase`, `swStart`, `laps`, `sw()`, `swToggle`, `swLap`, `swReset`).
 * 経過は「止めていた分の合計（base）＋ 始めた時刻からの差」で出し、数え上げない（実装ガイド 8章）。保存しない.
 */
import { mmss } from '../shared/time';

export type Lap = Readonly<{ n: number; ms: number }>;
export type SwRun = Readonly<{ run: boolean; base: number; start: number; laps: readonly Lap[] }>;

export const SW_IDLE: SwRun = { run: false, base: 0, start: 0, laps: [] };
export const PLAY_D = 'M8 5.5v13l11-6.5z';
export const PAUSE_D = 'M8 5v14M16 5v14';

/** `MM:SS.t` (prototype `sw`). */
export function swText(ms: number): string {
  const v = Math.max(0, ms);
  return mmss(Math.floor(v / 1000)) + '.' + String(Math.floor((v % 1000) / 100));
}

export function elapsed(s: SwRun, now: number): number {
  return s.base + (s.run ? Math.max(0, now - s.start) : 0);
}

export function toggleSw(s: SwRun, now: number): SwRun {
  return s.run ? { ...s, run: false, base: elapsed(s, now) } : { ...s, run: true, start: now };
}

/** Adds a lap at the current time; nothing before the first start. */
export function lapSw(s: SwRun, now: number): SwRun {
  const ms = elapsed(s, now);
  return ms > 0 ? { ...s, laps: [...s.laps, { n: s.laps.length + 1, ms }] } : s;
}

/** The newest 3 laps, newest first. */
export function lapRows(s: SwRun): { n: string; t: string }[] {
  return s.laps.slice(-3).reverse().map(l => ({ n: 'L' + String(l.n), t: swText(l.ms) }));
}
