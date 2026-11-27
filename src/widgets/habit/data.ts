/**
 * ハビットの記録 (区画 `w:habit` の data). 項目 = 名前・アイコン・画像・達成 (仕様書 6章「項目の編集とアイコン」).
 * 項目の編集は設定シートの共通の仕組み（`src/app/store/sheets.ts` の `itemsOf`・`setItems`・`addItem`・`patchItem`・`removeItem`）が
 * `{ items }` を読み書きする。ハビットの項目は共通の元に戻す履歴に入る（仕様書 7章、store の HIST_DATA_KINDS）。
 * Initial data = prototype `habitItems`.
 */
import type { WidgetDataDef } from '../../app/store/store';
import { isBool, isNum, isObj, isStr, pickList } from '../shared/guards';

export type HabitItem = { id: number; label: string; ic: string; on: boolean; img?: string };
export type HabitData = { items: HabitItem[] };

/** Same limits as クイックリンク (items, 96px image data URLs). */
export const HABIT_MAX = 24;
export const HABIT_LABEL_MAX = 40;
export const HABIT_IMG_MAX = 200_000;

export function initialHabits(): HabitData {
  return {
    items: [
      { id: 1, label: '水を飲む', ic: 'drop', on: true },
      { id: 2, label: '読書', ic: 'book', on: false },
      { id: 3, label: '運動', ic: 'pulse', on: false },
      { id: 4, label: '早寝', ic: 'moon', on: false },
    ],
  };
}

/** An item the sheet added has no `on` yet: it counts as not achieved. Unknown fields (the sheet's `url: ''`) are dropped. */
function pickItem(x: unknown): HabitItem | null {
  if (!isObj(x) || !isNum(x.id) || !isStr(x.label) || !isStr(x.ic)) return null;
  if (x.on !== undefined && !isBool(x.on)) return null;
  const it: HabitItem = { id: x.id, label: x.label.slice(0, HABIT_LABEL_MAX), ic: x.ic, on: x.on === true };
  if (isStr(x.img) && x.img.startsWith('data:image/') && x.img.length <= HABIT_IMG_MAX) it.img = x.img;
  return it;
}

export const habitData: WidgetDataDef<HabitData> = {
  version: 1,
  initial: () => initialHabits(),
  sanitize: raw => {
    if (!isObj(raw)) return null;
    const items = pickList(raw.items, pickItem, HABIT_MAX);
    if (!items) return null;
    const seen = new Set<number>();
    return { items: items.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true))) };
  },
  // The settings sheet may leave fields of other item lists (`url`) on an item; only the habit's own are written.
  toSaved: d => ({ items: d.items.map(x => pickItem(x)).filter((x): x is HabitItem => x !== null) }),
};
