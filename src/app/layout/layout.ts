/**
 * Board/screen grid layout (仕様書 2章「グリッドとボード」). Pure function ported from prototype `layout()`.
 * Pinned widgets are placed first at [screen, col, row]; the rest flow top-left first; full-screen
 * widgets (clock, sketch) occupy one screen after their board.
 */
import { REGISTRY, type Size } from '../registry/registry';

export type Board = Readonly<{ id: string; n: string }>;
export type Pin = readonly [screen: number, col: number, row: number];

export type LayoutInput = Readonly<{
  dens: number;
  groups: readonly Board[];
  place: Readonly<Record<string, string>>;
  order: readonly string[];
  off: Readonly<Record<string, boolean>>;
  pins: Readonly<Record<string, Pin>>;
  sizes: Readonly<Record<string, Size>>;
  pgW: Readonly<Record<string, boolean>>;
}>;

export type LayoutEnv = Readonly<{ width: number; height: number; fontScale?: number; sat?: number; sab?: number }>;

export type WidgetPos = Readonly<{ page: number; c: number; r: number; w: number; h: number; gi: number; pg?: boolean }>;

export type Layout = Readonly<{
  /** CSS grid-area (+ --ww/--wh custom properties) per widget id. */
  area: Readonly<Record<string, string>>;
  ww: Readonly<Record<string, number>>;
  wh: Readonly<Record<string, number>>;
  pos: Readonly<Record<string, WidgetPos>>;
  gap: number;
  cols: number;
  rows: number;
  cw: number;
  focusIdx: number;
  boardIdx: number;
  first: readonly number[];
  empty: readonly boolean[];
  phys: readonly number[];
  pinMiss: Readonly<Record<string, boolean>>;
  total: number;
}>;

export const CELL_W = [138, 170, 212] as const;
export const CELL_H = [124, 150, 186] as const;
export const FULL_SCREEN_IDS = ['clock', 'sketch'] as const;

export function sizeOf(input: Pick<LayoutInput, 'sizes'>, id: string): Size {
  const r = REGISTRY[id];
  if (!r) return [1, 1];
  const z = input.sizes[id] ?? r.s;
  return [Math.min(r.max[0], Math.max(r.min[0], z[0])), Math.min(r.max[1], Math.max(r.min[1], z[1]))];
}

export function isFullScreen(input: Pick<LayoutInput, 'pgW' | 'off'>, id: string): boolean {
  const r = REGISTRY[id];
  return !!(r?.pg && input.pgW[id] && !input.off[id]);
}

export function gridDims(env: LayoutEnv, dens: number): { cols: number; rows: number; gap: number; cw: number } {
  const fk = env.fontScale ?? 1;
  const gap = env.width < 600 ? 10 : 14;
  const cellW = (CELL_W[dens] ?? CELL_W[1]) * fk;
  const cellH = (CELL_H[dens] ?? CELL_H[1]) * fk;
  const cols = Math.max(2, Math.min(14, Math.floor(env.width / cellW)));
  const rows = Math.max(3, Math.min(10, Math.floor((env.height - 80 - (env.sat ?? 0) - (env.sab ?? 0)) / cellH)));
  const cw = Math.max(40, (env.width - cols * gap) / cols);
  return { cols, rows, gap, cw };
}

export function computeLayout(env: LayoutEnv, s: LayoutInput): Layout {
  const { cols, rows, gap, cw } = gridDims(env, s.dens);
  const gIndex: Record<string, number> = {};
  s.groups.forEach((gr, i) => { gIndex[gr.id] = i; });
  const groupOf = (id: string): number => gIndex[s.place[id] ?? ''] ?? 0;
  const pagesBy: number[][][] = s.groups.map(() => []);
  const raw: Record<string, { p: number; c: number; r: number; w: number; h: number; gi: number }> = {};
  const pinMiss: Record<string, boolean> = {};
  const take = (grid: number[], c: number, r: number, w: number, h: number): boolean => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (grid[y * cols + x]) return false;
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) grid[y * cols + x] = 1;
    return true;
  };
  const known = (id: string) => !!REGISTRY[id];

  for (const id of s.order) {
    const pn = s.pins[id];
    if (!known(id) || s.off[id] || !pn || isFullScreen(s, id)) continue;
    const gi = groupOf(id);
    const pages = pagesBy[gi] ?? [];
    const sz = sizeOf(s, id);
    const w = Math.min(sz[0], cols), h = Math.min(sz[1], rows);
    if (pn[0] > 20 || pn[1] + w > cols || pn[2] + h > rows) { pinMiss[id] = true; continue; }
    for (let p = 0; p <= pn[0]; p++) if (!pages[p]) pages[p] = new Array<number>(cols * rows).fill(0);
    const grid = pages[pn[0]];
    if (grid && take(grid, pn[1], pn[2], w, h)) raw[id] = { p: pn[0], c: pn[1], r: pn[2], w, h, gi };
    else pinMiss[id] = true;
  }
  for (const id of s.order) {
    if (!known(id) || s.off[id] || raw[id] || isFullScreen(s, id)) continue;
    const gi = groupOf(id);
    const pages = pagesBy[gi] ?? [];
    const sz = sizeOf(s, id);
    const w = Math.min(sz[0], cols), h = Math.min(sz[1], rows);
    let placed = false;
    for (let p = 0; p < 80 && !placed; p++) {
      if (!pages[p]) pages[p] = new Array<number>(cols * rows).fill(0);
      const grid = pages[p];
      if (!grid) break;
      for (let r = 0; r <= rows - h && !placed; r++) {
        for (let c = 0; c <= cols - w; c++) {
          if (!take(grid, c, r, w, h)) continue;
          raw[id] = { p, c, r, w, h, gi };
          placed = true;
          break;
        }
      }
    }
  }

  const first: number[] = [], empty: boolean[] = [], phys: number[] = [];
  const pgPos: Record<string, WidgetPos> = {};
  let base = 0, focusIdx = -1, boardIdx = -1;
  s.groups.forEach((_gr, gi) => {
    const pgHere = FULL_SCREEN_IDS.filter(id => isFullScreen(s, id) && groupOf(id) === gi);
    const pages = pagesBy[gi] ?? [];
    first[gi] = base;
    empty[gi] = pages.length === 0 && !pgHere.length;
    const n = pages.length || (pgHere.length ? 0 : 1);
    for (let i = 0; i < n; i++) phys.push(gi);
    base += n;
    for (const id of pgHere) {
      if (id === 'clock') { focusIdx = base; phys.push(-1); } else { boardIdx = base; phys.push(-2); }
      pgPos[id] = { page: base, c: 0, r: 0, w: cols, h: rows, gi, pg: true };
      base += 1;
    }
  });

  const area: Record<string, string> = {}, ww: Record<string, number> = {}, wh: Record<string, number> = {};
  const pos: Record<string, WidgetPos> = { ...pgPos };
  for (const id of Object.keys(REGISTRY)) {
    const q = raw[id];
    const pp = pgPos[id];
    if (!q) {
      area[id] = pp ? '1 / ' + String(pp.page * cols + 1) + ' / span ' + String(rows) + ' / span ' + String(cols) : '1 / 1 / span 1 / span 1';
      continue;
    }
    const page = (first[q.gi] ?? 0) + q.p;
    pos[id] = { page, c: q.c, r: q.r, w: q.w, h: q.h, gi: q.gi };
    area[id] = String(q.r + 1) + ' / ' + String(page * cols + q.c + 1) + ' / span ' + String(q.h) + ' / span ' + String(q.w);
    ww[id] = q.w;
    wh[id] = q.h;
  }
  return { area, ww, wh, pos, gap, cols, rows, cw, focusIdx, boardIdx, first, empty, phys, pinMiss, total: Math.max(1, base) };
}
