import { describe, expect, it } from 'vitest';
import { computeLayout, gridDims, type LayoutInput } from './layout';
import { defaultGlobal } from '../store/defaults';

const base = (): LayoutInput => {
  const g = defaultGlobal(0);
  return { dens: g.gs.dens, groups: g.groups, place: g.place, order: g.order, off: g.off, pins: g.pins, sizes: g.sizes, pgW: g.pgW };
};

describe('grid dimensions (仕様書 2章)', () => {
  it('derives columns and rows from the target cell size', () => {
    expect(gridDims({ width: 1440, height: 900 }, 1)).toMatchObject({ cols: 8, rows: 5, gap: 14 });
    expect(gridDims({ width: 390, height: 844 }, 1)).toMatchObject({ cols: 2, rows: 5, gap: 10 });
    expect(gridDims({ width: 1440, height: 900 }, 0)).toMatchObject({ cols: 10, rows: 6 });
    expect(gridDims({ width: 1440, height: 900 }, 2)).toMatchObject({ cols: 6, rows: 4 });
  });
  it('clamps to 2..14 columns and 3..10 rows', () => {
    expect(gridDims({ width: 100, height: 100 }, 1)).toMatchObject({ cols: 2, rows: 3 });
    expect(gridDims({ width: 5000, height: 5000 }, 0)).toMatchObject({ cols: 14, rows: 10 });
  });
  it('shrinks cell counts when the root font size grows (WCAG 1.4.4)', () => {
    expect(gridDims({ width: 1440, height: 900, fontScale: 1.25 }, 1)).toMatchObject({ cols: 6, rows: 4 });
  });
});

describe('initial board (はじめて開いたとき)', () => {
  it('places the 7 starter widgets top-left first on one screen', () => {
    const L = computeLayout({ width: 1440, height: 900 }, base());
    expect(L.total).toBe(1);
    expect(L.pos.clock).toMatchObject({ page: 0, c: 0, r: 0, w: 2, h: 1 });
    expect(L.pos.weather).toMatchObject({ c: 2, r: 0, w: 2, h: 1 });
    expect(L.pos.rain).toMatchObject({ c: 4, r: 0 });
    expect(L.pos.todo).toMatchObject({ c: 6, r: 0, w: 2, h: 2 });
    expect(L.pos.links).toMatchObject({ c: 0, r: 1 });
    expect(L.pos.memo).toMatchObject({ c: 2, r: 1, w: 2, h: 2 });
    expect(L.pos.search).toMatchObject({ c: 4, r: 2, w: 3, h: 1 });
    expect(L.pos.sun).toBeUndefined();
  });
  it('spreads one board over several screens on a phone', () => {
    const L = computeLayout({ width: 390, height: 844 }, base());
    expect(L.total).toBeGreaterThan(1);
    expect(L.phys.every(gi => gi === 0)).toBe(true);
    expect(L.area.search).toContain('span 2');
  });
});

describe('pins, locks and full-screen (仕様書 2章)', () => {
  it('places pinned widgets first at their saved cell', () => {
    const s = { ...base(), pins: { search: [0, 0, 0] as const } };
    const L = computeLayout({ width: 1440, height: 900 }, s);
    expect(L.pos.search).toMatchObject({ c: 0, r: 0 });
    expect(L.pos.clock).toMatchObject({ c: 3, r: 0 });
  });
  it('keeps the saved pin and reflows when it does not fit', () => {
    const s = { ...base(), pins: { todo: [0, 7, 0] as const } };
    const L = computeLayout({ width: 1440, height: 900 }, s);
    expect(L.pinMiss.todo).toBe(true);
    expect(L.pos.todo).toBeDefined();
  });
  it('gives a full-screen clock its own screen after the board', () => {
    const s = { ...base(), pgW: { clock: true } };
    const L = computeLayout({ width: 1440, height: 900 }, s);
    expect(L.total).toBe(2);
    expect(L.fullScreens).toEqual([{ id: 'clock', page: 1, gi: 0 }]);
    expect(L.full).toEqual([null, 'clock']);
    expect(L.pos.clock).toMatchObject({ page: 1, pg: true, w: 8, h: 5 });
  });
  it('clamps saved sizes to the registry limits', () => {
    const s = { ...base(), sizes: { clock: [9, 9] as const } };
    const L = computeLayout({ width: 1440, height: 900 }, s);
    expect(L.pos.clock).toMatchObject({ w: 4, h: 3 });
  });
  it('shows an empty board with the add button area', () => {
    const s = { ...base(), groups: [...base().groups, { id: 'g9', n: 'ボード 2' }] };
    const L = computeLayout({ width: 1440, height: 900 }, s);
    expect(L.empty).toEqual([false, true]);
    expect(L.total).toBe(2);
  });
});
