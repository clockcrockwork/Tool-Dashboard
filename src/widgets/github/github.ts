/**
 * GitHub PR (github) — 状態アイコン付きの行（仕様書 3章）. プロトタイプはマークアップに4行を直接書いているので、その行を
 * 番号・題名・状態のデータにし、状態ごとの印（色・形）を表にした。
 */
export type PrState = 'Open' | 'Review' | 'Draft' | 'Merged';
export type Pr = Readonly<{ n: number; t: string; st: PrState }>;

/** The line icon of a state: circles (cx, cy), the path, its colour and whether the line is dashed (下書き). */
export type PrIcon = Readonly<{ circles: readonly (readonly [number, number])[]; d: string; style: string }>;

const BRANCH: readonly (readonly [number, number])[] = [[7, 6], [7, 18], [17, 18]];
export const PR_ICON: Readonly<Record<PrState, PrIcon>> = {
  Open: { circles: BRANCH, d: 'M7 8v8M17 16v-6a3 3 0 0 0-3-3h-2', style: 'color: var(--a1)' },
  Review: { circles: [], d: 'M12 4l9 16H3zM12 10v4.5M12 17.4v.2', style: 'color: var(--a2)' },
  Draft: { circles: BRANCH, d: 'M7 8v8M17 16v-6a3 3 0 0 0-3-3h-2', style: 'color: var(--mut); stroke-dasharray: 2.5 2.5' },
  Merged: { circles: [[7, 6], [7, 18], [17, 12]], d: 'M7 8v8M7 8c0 3 3 4 8 4', style: 'color: var(--mut)' },
};

export type PrRow = { key: number; num: string; t: string; st: PrState; icon: PrIcon };

export function prRows(prs: readonly Pr[]): PrRow[] {
  return prs.map(p => ({ key: p.n, num: '#' + String(p.n), t: p.t, st: p.st, icon: PR_ICON[p.st] }));
}
