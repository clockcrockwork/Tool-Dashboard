/** タイムスケジュールの計算 (prototype `gantt`, `nowLeft` in `renderVals()`). 8時から20時の12時間を横に並べる. */
import type { GanttBlock, GanttTint } from './sample';

export const GANTT_FROM = 8;
export const GANTT_HOURS = 12;

const TINT: Readonly<Record<GanttTint, string>> = {
  a1: 'color-mix(in oklab, var(--c1) 34%, transparent)',
  a2: 'color-mix(in oklab, var(--c2) 40%, transparent)',
  n: 'var(--fill2)',
};

export type GanttBar = { n: string; l: string; w: string; t: string; c: string };

export function ganttBars(src: readonly GanttBlock[]): GanttBar[] {
  return src.map(b => ({
    n: b.n,
    l: String((b.s - GANTT_FROM) / GANTT_HOURS * 100) + '%',
    w: String((b.e - b.s) / GANTT_HOURS * 100) + '%',
    t: String(b.lane * 36) + '%',
    c: TINT[b.c],
  }));
}

/** Left of the now line; held at the edges before 8:00 and after 20:00. */
export function ganttNowLeft(now: Date): string {
  const hourF = now.getHours() + now.getMinutes() / 60;
  return 'calc(' + String(Math.max(0, Math.min(1, (hourF - GANTT_FROM) / GANTT_HOURS)) * 100) + '% - 1px)';
}
