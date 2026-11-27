/**
 * タイムスケジュールの見本 (prototype `ganttSrc`). プロトタイプは今日の時間帯を固定の見本で描く（予定などとはつながっていない）。
 * どこから時間帯を取るか（予定・タイムログなど）は未決定なので、見本のまま分けておく。
 */
export type GanttTint = 'a1' | 'a2' | 'n';
export type GanttBlock = Readonly<{ n: string; s: number; e: number; lane: number; c: GanttTint }>;

export const GANTT_SAMPLE: readonly GanttBlock[] = [
  { n: '朝会', s: 9, e: 9.75, lane: 0, c: 'a1' },
  { n: '実装', s: 10, e: 12.5, lane: 1, c: 'a1' },
  { n: '昼', s: 12.5, e: 13.5, lane: 0, c: 'n' },
  { n: 'レビュー', s: 14, e: 15.25, lane: 0, c: 'a2' },
  { n: '執筆', s: 15.5, e: 18, lane: 1, c: 'a1' },
  { n: '運動', s: 18.5, e: 19.75, lane: 2, c: 'a2' },
];
