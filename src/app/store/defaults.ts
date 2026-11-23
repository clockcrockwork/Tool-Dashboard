/** Initial state (仕様書 2章「はじめて開いたとき」). Ported from prototype `GS()`, `starter()`, `defOff()`, `defGroups()`, `defPlace()`. */
import { DEFAULT_ORDER, REGISTRY, STARTER } from '../registry/registry';
import type { Board } from '../layout/layout';
import type { GlobalSection, GlobalSettings, UiState } from './types';

export function defaultSettings(): GlobalSettings {
  return { theme: null, acc: 0, glass: 60, rad: 26, dens: 1, wheel: true, autoq: true, keys1: true, home: '', veil: false };
}

export function defaultOff(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const id of Object.keys(REGISTRY)) if (!STARTER.includes(id)) out[id] = true;
  return out;
}

export function defaultGroups(): Board[] {
  return [{ id: 'g0', n: 'ボード 1' }];
}

/** Default boards used by 「すべて並べる」 (display test only). */
export function fullGroups(): Board[] {
  return ['g0', 'g1', 'g2', 'g3'].map((id, i) => ({ id, n: 'ボード ' + String(i + 1) }));
}

export function defaultPlace(): Record<string, string> {
  const m: Record<string, string> = {
    g0: 'clock weather rain sun gantt todo agenda music month habit pomo week links share today alarm',
    g1: 'bar github calc split tax table rss color memo pie donut',
    g2: 'search heat slides clip convert stopwatch world sketch pass line meter countdown translate chat script imgconv',
    g3: 'timelog punch mixer counter recorder quote dice toast',
  };
  const out: Record<string, string> = {};
  for (const [gid, ids] of Object.entries(m)) for (const id of ids.split(' ')) out[id] = gid;
  return out;
}

export function defaultGlobal(now: number): GlobalSection {
  return {
    gs: defaultSettings(),
    groups: defaultGroups(),
    place: defaultPlace(),
    order: [...DEFAULT_ORDER],
    sizes: {},
    off: defaultOff(),
    pins: {},
    lockSz: {},
    pgW: {},
    catHist: [],
    seenW: Object.keys(REGISTRY),
    lastExp: 0,
    since: now,
    nagAt: 0,
    tourDone: false,
    dsO: { look: true, layout: true },
  };
}

export function defaultUi(now: number): UiState {
  return {
    t: now, page: 0, edit: false, panel: 'none', sel: null, addFrom: 'none', devFrom: 'none', tgt: null, ret: null,
    temp: null, big: null, dlg: null, toasts: [], tour: 0, peek: {}, flash: null, catQ: '', mn: null, mnQ: '',
    online: true, upd: false, updLater: false,
  };
}

export const ACCENTS: readonly (readonly [light: string, dark: string, name: string])[] = [
  ['#2f6f9f', '#82b8de', 'ブルー'], ['#1f7a6c', '#6fcbb9', 'ティール'], ['#6a58b8', '#b3a6ee', 'バイオレット'], ['#b0486e', '#eda0bb', 'ローズ'], ['#4a5565', '#c3ccd8', 'スレート'],
];

/** Boards are always renumbered 「ボード 1」… (仕様書 2章). */
export function renumber(groups: readonly Board[]): Board[] {
  return groups.map((g, i) => (g.n === 'ボード ' + String(i + 1) ? g : { ...g, n: 'ボード ' + String(i + 1) }));
}
