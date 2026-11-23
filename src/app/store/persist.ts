/**
 * Persistence (実装ガイド 5章・6章・7.5). Saved as sections instead of the prototype's single `lgdash.v1` blob:
 *  - `lgd.v1:global`  … boards, placement, order, sizes, unplaced, global settings (区画「全体」)
 *  - `lgd.v1:w:<id>`  … one section per placed widget: `{ v, cfg, data }`
 * Unknown keys are dropped, missing keys fall back to defaults; sections carry a version for migrations.
 * Large records (images, chat, tables) move to IndexedDB in P2 through the same `SectionStore` port.
 */
import { REGISTRY, type Size } from '../registry/registry';
import { defaultGlobal, defaultPlace, defaultSettings, renumber } from './defaults';
import type { GlobalSection, WidgetCfg } from './types';
import type { Pin } from '../layout/layout';

export const GLOBAL_KEY = 'lgd.v1:global';
export const WIDGET_KEY_PREFIX = 'lgd.v1:w:';
export const SECTION_VERSION = 1;

export interface SectionStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export function memoryStore(init: Record<string, string> = {}): SectionStore {
  const m = new Map(Object.entries(init));
  return {
    get: k => m.get(k) ?? null,
    set: (k, v) => { m.set(k, v); },
    remove: k => { m.delete(k); },
    keys: () => [...m.keys()],
  };
}

export function localStore(): SectionStore {
  const ls = window.localStorage;
  return {
    get: k => ls.getItem(k),
    set: (k, v) => { ls.setItem(k, v); },
    remove: k => { ls.removeItem(k); },
    keys: () => Array.from({ length: ls.length }, (_v, i) => ls.key(i)).filter((k): k is string => k !== null),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isSize = (v: unknown): v is Size => Array.isArray(v) && v.length === 2 && v.every(n => Number.isInteger(n) && (n as number) > 0);

/** Validates a global section; port of prototype `sane()` for layout/global keys. */
export function sanitizeGlobal(raw: unknown, now: number): GlobalSection {
  const d = defaultGlobal(now);
  if (!isObj(raw)) return d;
  const ids = Object.keys(REGISTRY);
  const out: GlobalSection = { ...d };
  if (isObj(raw.gs)) {
    const def = defaultSettings();
    const src = raw.gs;
    const gs = { ...def };
    for (const k of Object.keys(def) as (keyof typeof def)[]) if (k in src) (gs as Record<string, unknown>)[k] = src[k];
    if (gs.theme !== 'light' && gs.theme !== 'dark') gs.theme = null;
    for (const [k, lo, hi] of [['acc', 0, 4], ['glass', 0, 100], ['rad', 8, 36], ['dens', 0, 2]] as const) {
      const v = Number(gs[k]);
      gs[k] = Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : defaultSettings()[k];
    }
    for (const k of ['wheel', 'autoq', 'keys1', 'veil'] as const) gs[k] = !!gs[k];
    gs.home = typeof gs.home === 'string' ? gs.home : '';
    out.gs = gs;
  }
  if (Array.isArray(raw.groups) && raw.groups.length && raw.groups.every(g => isObj(g) && typeof g.id === 'string')) {
    out.groups = renumber((raw.groups as { id: string }[]).map(g => ({ id: g.id, n: '' })));
    if (isObj(raw.place)) {
      const place = { ...defaultPlace() };
      for (const [k, v] of Object.entries(raw.place)) if (typeof v === 'string') place[k] = v;
      out.place = place;
    }
  }
  if (Array.isArray(raw.order)) {
    const kept = raw.order.filter((id): id is string => typeof id === 'string' && ids.includes(id));
    out.order = kept.concat(ids.filter(id => !kept.includes(id)));
    // Widgets added in a newer version stay unplaced (実装ガイド 6章).
    if (isObj(raw.off)) {
      const off: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(raw.off)) if (v === true) off[k] = true;
      for (const id of ids) if (!kept.includes(id)) off[id] = true;
      out.off = off;
    }
    out.seenW = Array.isArray(raw.seenW) ? raw.seenW.filter((x): x is string => typeof x === 'string') : kept.slice();
  }
  if (isObj(raw.sizes)) {
    const sizes: Record<string, Size> = {};
    for (const [k, v] of Object.entries(raw.sizes)) if (isSize(v)) sizes[k] = v;
    out.sizes = sizes;
  }
  if (isObj(raw.pins)) {
    const pins: Record<string, Pin> = {};
    for (const [k, v] of Object.entries(raw.pins)) {
      if (Array.isArray(v) && v.length === 3 && v.every(n => Number.isInteger(n) && (n as number) >= 0)) pins[k] = v as unknown as Pin;
    }
    out.pins = pins;
  }
  for (const key of ['lockSz', 'pgW'] as const) {
    const v = raw[key];
    if (isObj(v)) {
      const o: Record<string, boolean> = {};
      for (const [k, b] of Object.entries(v)) if (b === true) o[k] = true;
      out[key] = o;
    }
  }
  if (Array.isArray(raw.catHist)) out.catHist = raw.catHist.filter((x): x is string => typeof x === 'string').slice(0, 5);
  for (const key of ['lastExp', 'since', 'nagAt'] as const) if (typeof raw[key] === 'number') out[key] = raw[key];
  if (typeof raw.tourDone === 'boolean') out.tourDone = raw.tourDone;
  if (isObj(raw.dsO)) {
    const o: Record<string, boolean> = {};
    for (const [k, b] of Object.entries(raw.dsO)) o[k] = !!b;
    out.dsO = o;
  }
  return out;
}

export function sanitizeCfg(id: string, raw: unknown): WidgetCfg {
  const def = REGISTRY[id];
  const out: WidgetCfg = {};
  if (!def || !isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'veil') { if (typeof v === 'boolean') out[k] = v; continue; }
    const f = def.f.find(x => x.k === k);
    if (!f || typeof v !== typeof f.d) continue;
    if (f.t === 'sg' && f.o && !f.o.includes(String(v))) continue;
    out[k] = v as WidgetCfg[string];
  }
  return out;
}

export type WidgetSectionRaw = { v: number; cfg?: unknown; data?: unknown };

export function readSection(store: SectionStore, id: string): WidgetSectionRaw | null {
  try {
    const raw = store.get(WIDGET_KEY_PREFIX + id);
    if (!raw) return null;
    const o: unknown = JSON.parse(raw);
    return isObj(o) && typeof o.v === 'number' ? { v: o.v, cfg: o.cfg, data: o.data } : null;
  } catch {
    return null;
  }
}

export function readGlobal(store: SectionStore): unknown {
  try {
    const raw = store.get(GLOBAL_KEY);
    return raw ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}
