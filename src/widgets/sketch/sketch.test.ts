import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { Dashboard } from '../../app/store/store';
import { memoryStore } from '../../app/store/persist';
import { WIDGET_DATA } from '../index';
import { PATH_KEYS, PEN_DEFAULT, STROKES_MAX, penTools, pointOf, strokePaths } from './sketch';
import { clearPad, clearWithUndo, ensurePad, padOf, setPen, strokeEnd, strokeMove, strokeStart, undoStroke } from './status';

const T0 = new Date(2026, 10, 19, 10, 24, 36).getTime();
const make = (store = memoryStore()): Dashboard => new Dashboard({ store, dataDefs: WIDGET_DATA });

beforeEach(() => { vi.useFakeTimers({ now: T0 }); });
afterEach(() => { vi.useRealTimers(); });

describe('スケッチの計算 (prototype penTools / pd)', () => {
  it('9 paths start at M0 0; a stroke joins its points, a single point draws a dot', () => {
    const p = strokePaths([{ k: 't1', p: ['1.0 2.0', '3.0 4.0'] }, { k: 'b2', p: ['5.0 6.0'] }, { k: 'zz', p: ['0 0'] }]);
    expect(Object.keys(p)).toEqual([...PATH_KEYS]);
    expect(p.t1).toBe('M0 0 M1.0 2.0 L3.0 4.0');
    expect(p.b2).toBe('M0 0 M5.0 6.0 l0.01 0');
    expect(p.a0).toBe('M0 0');
  });
  it('the bar: 3 widths in the pen colour, then 3 colours (default 普通の線・黒)', () => {
    const t = penTools(PEN_DEFAULT);
    expect(t.map(x => x.label)).toEqual(['細い線', '普通の線', '太い線', '黒のペン', '青のペン', 'オレンジのペン']);
    expect(t.filter(x => x.on).map(x => x.label)).toEqual(['普通の線', '黒のペン']);
    expect(penTools({ c: 'b', w: 2 }).slice(0, 3).map(x => x.bg)).toEqual(['var(--c2)', 'var(--c2)', 'var(--c2)']);
    expect(t[5]?.pen).toEqual({ c: 'b', w: 1 });
  });
  it('points are relative to the surface, one decimal', () => {
    expect(pointOf(110.04, 52.55, { left: 100, top: 50 })).toBe('10.0 2.5');
  });
});

describe('スケッチの線（保存しない、通常・前面表示・全画面で同じ線）', () => {
  it('draw, undo, clear with 元に戻す', () => {
    const d = make();
    setPen(d, 'sketch', { c: 'a', w: 2 });
    strokeStart(d, 'sketch', '1 1');
    strokeMove(d, 'sketch', '2 2');
    strokeEnd(d, 'sketch');
    strokeMove(d, 'sketch', '9 9');
    strokeStart(d, 'sketch', '3 3');
    strokeEnd(d, 'sketch');
    expect(padOf(d, 'sketch').strokes).toEqual([{ k: 'a2', p: ['1 1', '2 2'] }, { k: 'a2', p: ['3 3'] }]);
    undoStroke(d, 'sketch');
    expect(padOf(d, 'sketch').strokes).toHaveLength(1);
    clearWithUndo(d, 'sketch');
    expect(padOf(d, 'sketch').strokes).toEqual([]);
    expect(d.ui.toasts.map(t => t.text)).toEqual(['スケッチを消去しました']);
    strokeStart(d, 'sketch', '7 7');
    d.ui.toasts[0]?.act?.fn();
    expect(padOf(d, 'sketch').strokes.map(s => s.p[0])).toEqual(['1 1', '7 7']);
    expect(clearPad(make(), 'sketch')).toBeNull();
  });
  it('the same pad is read by every view of the placement; placements do not mix', () => {
    const d = make();
    const a = ensurePad(d, 'sketch');
    strokeStart(d, 'sketch', '1 1');
    expect(ensurePad(d, 'sketch')).toBe(a);
    expect(padOf(d, 'sketch').strokes).toHaveLength(1);
    expect(padOf(d, 'sketch#2').strokes).toHaveLength(0);
  });
  it('keeps at most STROKES_MAX strokes', () => {
    const d = make();
    for (let i = 0; i < STROKES_MAX + 5; i++) strokeStart(d, 'sketch', String(i) + ' 0');
    expect(padOf(d, 'sketch').strokes).toHaveLength(STROKES_MAX);
    expect(padOf(d, 'sketch').strokes[0]?.p[0]).toBe('5 0');
  });
  it('drawing writes nothing to the saved sections, and a reload starts empty', async () => {
    const store = memoryStore();
    const d = make(store);
    const stop = d.start();
    await nextTick();
    const before = store.keys().map(k => [k, store.get(k)]);
    strokeStart(d, 'sketch', '1 1');
    strokeMove(d, 'sketch', '2 2');
    setPen(d, 'sketch', { c: 'b', w: 0 });
    await nextTick();
    expect(store.keys().map(k => [k, store.get(k)])).toEqual(before);
    expect(WIDGET_DATA.sketch).toBeUndefined();
    expect(padOf(make(store), 'sketch').strokes).toEqual([]);
    stop();
  });
});
