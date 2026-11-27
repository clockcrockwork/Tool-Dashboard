/**
 * スケッチの計算 (prototype `penTools`, `pd`/`bd`, `padPt`, `padH` in `renderVals()`): 線の太さ3種・色3種、線ごとの点の並びから
 * 9本の path（色×太さ）を作る。点は描いた面の左上からの px（`"12.5 30.0"`）。通常・前面表示・全画面で同じ線を使う。
 */

export type PenColor = 't' | 'a' | 'b';
export type PenWidth = 0 | 1 | 2;
export type Pen = Readonly<{ c: PenColor; w: PenWidth }>;
export type Stroke = { k: string; p: string[] };

export const PEN_DEFAULT: Pen = { c: 't', w: 1 };
export const PEN_COLORS: readonly (readonly [PenColor, string, string])[] = [['t', 'var(--text)', '黒'], ['a', 'var(--c1)', '青'], ['b', 'var(--c2)', 'オレンジ']];
const PEN_WIDTHS: readonly (readonly [string, string])[] = [['細い線', '5px'], ['普通の線', '9px'], ['太い線', '15px']];
/** Path keys in drawing order (`t0` … `b2`): stroke width 2・4・9 px per colour. */
export const PATH_KEYS: readonly string[] = PEN_COLORS.flatMap(([c]) => [0, 1, 2].map(w => c + String(w)));
export const STROKE_W: readonly number[] = [2, 4, 9];
/** Strokes kept (the oldest are dropped first): enough for a page of handwriting. Decided here. */
export const STROKES_MAX = 2000;
export const POINTS_MAX = 5000;

export type PenTool = { key: string; label: string; s: string; bg: string; on: boolean; pen: Pen };

/** The 6 buttons of the bar: 3 widths in the current colour, then 3 colours. */
export function penTools(pen: Pen): PenTool[] {
  const bg = (PEN_COLORS.find(x => x[0] === pen.c) ?? PEN_COLORS[0] ?? ['t', 'var(--text)', ''])[1];
  const widths = PEN_WIDTHS.map(([label, s], i) => ({ key: 'w' + String(i), label, s, bg, on: pen.w === i, pen: { c: pen.c, w: i as PenWidth } }));
  const colors = PEN_COLORS.map(([c, v, n]) => ({ key: 'c' + c, label: n + 'のペン', s: '18px', bg: v, on: pen.c === c, pen: { c, w: pen.w } }));
  return [...widths, ...colors];
}

/** The 9 path `d` strings (prototype `pd`): `M0 0` then ` M` + points joined by ` L`; a single point draws a dot. */
export function strokePaths(strokes: readonly Stroke[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of PATH_KEYS) out[k] = 'M0 0';
  for (const st of strokes) {
    if (out[st.k] === undefined) continue;
    out[st.k] += ' M' + st.p.join(' L') + (st.p.length < 2 ? ' l0.01 0' : '');
  }
  return out;
}

/** A point of a pointer event on the drawing surface (prototype `padPt`). */
export function pointOf(clientX: number, clientY: number, r: Readonly<{ left: number; top: number }>): string {
  return (clientX - r.left).toFixed(1) + ' ' + (clientY - r.top).toFixed(1);
}
