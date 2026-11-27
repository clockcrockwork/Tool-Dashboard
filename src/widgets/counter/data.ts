/**
 * カウンターの記録 (区画 `w:counter` の data): 名前つきの行と数 (prototype `counters`). 数は0より下にしない（仕様書 3章）.
 * 削除モードは画面の一時状態なので記録に入れない（部品の中）。
 */
import type { WidgetDataDef } from '../../app/store/store';
import { isNum, isObj, isStr, pickList } from '../shared/guards';

export type CounterItem = { id: number; n: string; v: number };
export type CounterData = { items: CounterItem[] };

/** Decided here (the design has no limits): 30 rows, names of 40 characters, counts up to 999,999. */
export const COUNTER_MAX = 30;
export const COUNTER_NAME_MAX = 40;
export const COUNT_MAX = 999_999;

export function initialCounters(): CounterData {
  return { items: [{ id: 1, n: '水', v: 0 }, { id: 2, n: 'コーヒー', v: 0 }] };
}

/** A count in range (whole number, 0…999,999), or null. */
export function countOf(v: unknown): number | null {
  return isNum(v) && Number.isInteger(v) && v >= 0 && v <= COUNT_MAX ? v : null;
}

function pickItem(x: unknown): CounterItem | null {
  if (!isObj(x) || !isNum(x.id) || !isStr(x.n)) return null;
  return { id: x.id, n: x.n.slice(0, COUNTER_NAME_MAX), v: countOf(x.v) ?? 0 };
}

export const counterData: WidgetDataDef<CounterData> = {
  version: 1,
  initial: () => initialCounters(),
  sanitize: raw => {
    if (!isObj(raw)) return null;
    const items = pickList(raw.items, pickItem, COUNTER_MAX);
    if (!items) return null;
    const seen = new Set<number>();
    return { items: items.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true))) };
  },
};
