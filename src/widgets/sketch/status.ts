/**
 * スケッチの線とペン（保存しない）. 実装ガイド 6章の「保存するもの」にスケッチの線は無く、プロトタイプも保存しない（`this._strokes`）。
 * 置いた1個ごとに Dashboard の実行管理（`runtimeOf(d)`）にメモリだけで持つので、通常・前面表示・全画面（仕様書 2章「スケッチの絵は
 * 全画面にしても残る」）・置き場所の変更・一時利用を閉じる・開き直すで同じ線が見える。再読み込みで消える。
 *
 * 線は描いている間に点を足すので、線の並びは1つの reactive な入れ物（`Pad`）を最初に作って中身を変える（`ensurePad`）。
 * 部品の setup で `ensurePad` を呼び、描画（computed）の中では `padOf` で読むだけにする。
 */
import { reactive } from 'vue';
import type { Dashboard } from '../../app/store/store';
import { runtimeOf } from '../../app/runtime/runtime';
import { PEN_DEFAULT, POINTS_MAX, STROKES_MAX, type Pen, type Stroke } from './sketch';

export type Pad = { strokes: Stroke[]; pen: Pen; drawing: boolean };

const isPad = (v: unknown): v is Pad => !!v && typeof v === 'object' && Array.isArray((v as Pad).strokes);

/** The placement's pad (created once, then changed in place). Call from a component's setup or an operation. */
export function ensurePad(d: Dashboard, id: string): Pad {
  const rt = runtimeOf(d);
  const cur = rt.state<unknown>(id, null);
  if (isPad(cur)) return cur;
  const pad = reactive<Pad>({ strokes: [], pen: PEN_DEFAULT, drawing: false });
  rt.set(id, pad);
  return pad;
}

/** Reads the pad without creating it (an empty one when none exists yet). */
export function padOf(d: Dashboard, id: string): Pad {
  const cur = runtimeOf(d).state<unknown>(id, null);
  return isPad(cur) ? cur : { strokes: [], pen: PEN_DEFAULT, drawing: false };
}

export function setPen(d: Dashboard, id: string, pen: Pen): void {
  ensurePad(d, id).pen = pen;
}

/** Starts a stroke at `pt` with the current pen. */
export function strokeStart(d: Dashboard, id: string, pt: string): void {
  const pad = ensurePad(d, id);
  pad.strokes.push({ k: pad.pen.c + String(pad.pen.w), p: [pt] });
  if (pad.strokes.length > STROKES_MAX) pad.strokes.splice(0, pad.strokes.length - STROKES_MAX);
  pad.drawing = true;
}

/** Adds a point to the stroke being drawn (ignored when not drawing). */
export function strokeMove(d: Dashboard, id: string, pt: string): void {
  const pad = ensurePad(d, id);
  const last = pad.strokes[pad.strokes.length - 1];
  if (!pad.drawing || !last || last.p.length >= POINTS_MAX) return;
  last.p.push(pt);
}

export function strokeEnd(d: Dashboard, id: string): void {
  ensurePad(d, id).drawing = false;
}

/** 1つ戻す. */
export function undoStroke(d: Dashboard, id: string): void {
  const pad = ensurePad(d, id);
  pad.drawing = false;
  pad.strokes.pop();
}

/** すべて消去: returns what was cleared (for 「元に戻す」), or null when nothing was drawn. */
export function clearPad(d: Dashboard, id: string): Stroke[] | null {
  const pad = ensurePad(d, id);
  pad.drawing = false;
  if (!pad.strokes.length) return null;
  return pad.strokes.splice(0, pad.strokes.length);
}

/** 「元に戻す」 of すべて消去: the cleared strokes come back under what was drawn since. */
export function restoreStrokes(d: Dashboard, id: string, cleared: readonly Stroke[]): void {
  const pad = ensurePad(d, id);
  pad.strokes.unshift(...cleared);
  if (pad.strokes.length > STROKES_MAX) pad.strokes.splice(0, pad.strokes.length - STROKES_MAX);
}

/** すべて消去 with a 「元に戻す」 toast (消す操作に元に戻す、実装ガイド 4章の確認表). */
export function clearWithUndo(d: Dashboard, id: string): void {
  const cleared = clearPad(d, id);
  if (!cleared) return;
  d.toast('スケッチを消去しました', 'info', { label: '元に戻す', fn: () => { restoreStrokes(d, id, cleared); } });
}
