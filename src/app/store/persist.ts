/**
 * Persistence (実装ガイド 5章・6章・7.5). Saved as sections instead of the prototype's single `lgdash.v1` blob:
 *  - `lgd.v1:global`        … 区画「全体」 `{ v, gs, groups, place, order, sizes, off, pins, lockSz, pgW, … }`
 *  - `lgd.v1:w:<配置ID>`     … one section per placement (`w:links`, `w:links#2`): `{ v, dv, cfg, data }`
 *
 * 版 (versions):
 *  - `GLOBAL_VERSION` is the shape of the global section (`v`). A global section without `v` was written before the
 *    field existed and is read as version 1.
 *  - `SECTION_VERSION` is the shape of a widget section (`v`). `dv` is the version of the kind's record
 *    (`WidgetDataDef.version`); a section without `dv` is read as version 1 (every record was version 1 then), or 0
 *    for kinds without records.
 *  - A section that is broken (not JSON, not an object, bad version numbers, a record `sanitize` rejects), or written
 *    by a newer build (a version above ours), or an older record without a working `migrate`, is **locked**: the
 *    dashboard uses defaults in memory but never writes that key, so the saved bytes stay for a newer build.
 *  - Within a supported version, unknown items are dropped and missing items fall back to defaults (per item).
 *
 * 書き込み (writes): the store keeps, per key, the serialization it last read or wrote (its baseline) and writes a
 * section only when its serialization differs. Two tabs changing *different* sections therefore keep both changes.
 * Two tabs changing the *same* section at the same time: the last write wins. Reflecting other tabs' changes
 * (storage event) and choosing one tab for shared jobs (Web Locks) are P3 (実装ガイド 7.3); until then only
 * "a change never overwrites another section" is guaranteed.
 *
 * Large records (images, chat, tables) move to IndexedDB in P2/P3 behind the same section model.
 */
import { REGISTRY, type Size } from '../registry/registry';
import { isInstanceId, kindOf } from '../registry/instances';
import { defaultGlobal, defaultPlace, defaultSettings, renumber } from './defaults';
import { checkField, sectionHeader } from './validate';
import type { GlobalSection, GlobalSettings, WidgetCfg, WidgetDataDef } from './types';
import type { Board, Pin } from '../layout/layout';

export const GLOBAL_KEY = 'lgd.v1:global';
export const WIDGET_KEY_PREFIX = 'lgd.v1:w:';
/** Shape of the global section (`v`). */
export const GLOBAL_VERSION = 1;
/** Shape of a widget section `{ v, dv, cfg, data }` (`v`). */
export const SECTION_VERSION = 1;
/** Export envelope `{ format, v, global, widgets }`. */
export const EXPORT_FORMAT = 'lgd-dashboard';
export const EXPORT_VERSION = 1;

export const widgetKey = (id: string): string => WIDGET_KEY_PREFIX + id;

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
const isPin = (v: unknown): v is Pin => Array.isArray(v) && v.length === 3 && v.every(n => Number.isInteger(n) && (n as number) >= 0);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function sanitizeSettings(raw: unknown, boards: ReadonlySet<string>): GlobalSettings {
  const gs = defaultSettings();
  if (!isObj(raw)) return gs;
  if (raw.theme === 'light' || raw.theme === 'dark') gs.theme = raw.theme;
  for (const [k, lo, hi] of [['acc', 0, 4], ['glass', 0, 100], ['rad', 8, 36], ['dens', 0, 2]] as const) {
    const v = raw[k];
    if (finite(v)) gs[k] = Math.min(hi, Math.max(lo, Math.round(v)));
  }
  for (const k of ['wheel', 'autoq', 'keys1', 'veil'] as const) if (typeof raw[k] === 'boolean') gs[k] = raw[k];
  // ホーム: '' (= first board) or an existing board.
  if (typeof raw.home === 'string' && boards.has(raw.home)) gs.home = raw.home;
  return gs;
}

/**
 * Validates a global section per item (port of prototype `sane()` plus the checks of 実装ガイド 5章). Never throws.
 * Board IDs and placement IDs are de-duplicated; references to unknown boards fall back to the first board, and
 * entries for placement IDs this build does not know are dropped.
 */
export function sanitizeGlobal(raw: unknown, now: number): GlobalSection {
  const d = defaultGlobal(now);
  if (!isObj(raw)) return d;
  const out: GlobalSection = { ...d };

  if (Array.isArray(raw.groups)) {
    const seen = new Set<string>();
    const groups: Board[] = [];
    for (const g of raw.groups) {
      if (!isObj(g) || typeof g.id !== 'string' || !g.id || seen.has(g.id)) continue;
      seen.add(g.id);
      groups.push({ id: g.id, n: '' });
    }
    if (groups.length) out.groups = renumber(groups);
  }
  const boards = new Set(out.groups.map(g => g.id));
  const firstBoard = out.groups[0]?.id ?? 'g0';

  out.gs = sanitizeSettings(raw.gs, boards);

  const kinds = Object.keys(REGISTRY);
  let kept: string[] | null = null;
  if (Array.isArray(raw.order)) {
    kept = [...new Set(raw.order.filter((id): id is string => isInstanceId(id)))];
    const has = new Set(kept);
    out.order = kept.concat(kinds.filter(k => !has.has(k)));
    // Kinds added in a newer version stay unplaced (実装ガイド 6章).
    if (isObj(raw.off)) {
      const off: Record<string, boolean> = {};
      for (const id of kept) if (raw.off[id] === true) off[id] = true;
      for (const k of kinds) if (!has.has(k)) off[k] = true;
      out.off = off;
    }
    out.seenW = Array.isArray(raw.seenW) ? raw.seenW.filter((x): x is string => typeof x === 'string') : kept.filter(id => id in REGISTRY);
  } else if (Array.isArray(raw.seenW)) {
    out.seenW = raw.seenW.filter((x): x is string => typeof x === 'string');
  }
  const ids = new Set(out.order);
  const mine = (k: string): boolean => ids.has(k);

  // 置き場所: every placement points at an existing board (saved → default → first board).
  const rawPlace = isObj(raw.place) ? raw.place : {};
  const defPlace = defaultPlace();
  const place: Record<string, string> = {};
  for (const id of out.order) {
    const v = rawPlace[id];
    const dv = defPlace[kindOf(id)];
    place[id] = typeof v === 'string' && boards.has(v) ? v : dv !== undefined && boards.has(dv) ? dv : firstBoard;
  }
  out.place = place;

  const off: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(out.off)) if (v && mine(k)) off[k] = true;
  out.off = off;

  if (isObj(raw.sizes)) {
    const sizes: Record<string, Size> = {};
    for (const [k, v] of Object.entries(raw.sizes)) if (mine(k) && isSize(v)) sizes[k] = v;
    out.sizes = sizes;
  }
  if (isObj(raw.pins)) {
    const pins: Record<string, Pin> = {};
    for (const [k, v] of Object.entries(raw.pins)) if (mine(k) && isPin(v)) pins[k] = v;
    out.pins = pins;
  }
  if (isObj(raw.lockSz)) {
    const o: Record<string, boolean> = {};
    for (const [k, b] of Object.entries(raw.lockSz)) if (mine(k) && b === true) o[k] = true;
    out.lockSz = o;
  }
  if (isObj(raw.pgW)) {
    const o: Record<string, boolean> = {};
    for (const [k, b] of Object.entries(raw.pgW)) if (mine(k) && b === true && REGISTRY[kindOf(k)]?.pg) o[k] = true;
    out.pgW = o;
  }
  if (Array.isArray(raw.catHist)) out.catHist = raw.catHist.filter((x): x is string => typeof x === 'string').slice(0, 5);
  for (const key of ['lastExp', 'since', 'nagAt'] as const) { const v = raw[key]; if (finite(v)) out[key] = v; }
  if (typeof raw.tourDone === 'boolean') out.tourDone = raw.tourDone;
  if (isObj(raw.dsO)) {
    const o: Record<string, boolean> = {};
    for (const [k, b] of Object.entries(raw.dsO)) if (typeof b === 'boolean') o[k] = b;
    out.dsO = o;
  }
  return out;
}

/** Keeps the settings that are valid for the kind (`id` may be a placement ID). Same rules as `Dashboard.setCfg`. */
export function sanitizeCfg(id: string, raw: unknown): WidgetCfg {
  const kind = kindOf(id);
  const out: WidgetCfg = {};
  if (!REGISTRY[kind] || !isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const ok = checkField(kind, k, v);
    if (ok !== undefined) out[k] = ok;
  }
  return out;
}

// ---------------------------------------------------------------- reading sections

/** Why a section is not used: newer build (`future`), unreadable (`broken`), or an older record that cannot be moved. */
export type LockReason = 'future' | 'broken' | 'migrate';
export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: LockReason };

/** A global section (saved or imported) → validated global state. */
export function parseGlobalSection(raw: unknown, now: number): Parsed<GlobalSection> {
  const h = sectionHeader.safeParse(raw);
  if (!h.success) return { ok: false, reason: 'broken' };
  const v = h.data.v ?? 1;
  if (v < 1) return { ok: false, reason: 'broken' };
  if (v > GLOBAL_VERSION) return { ok: false, reason: 'future' };
  return { ok: true, value: sanitizeGlobal(raw, now) };
}

export type WidgetSection = { cfg: WidgetCfg; data: unknown };

/**
 * A widget section (saved or imported) of placement `id` → validated `{ cfg, data }`.
 * `data` is undefined for kinds without a record definition.
 */
export function parseWidgetSection(id: string, raw: unknown, def: WidgetDataDef<unknown> | undefined, now: number): Parsed<WidgetSection> {
  const h = sectionHeader.safeParse(raw);
  if (!h.success || !isObj(raw) || h.data.v === undefined || h.data.v < 1) return { ok: false, reason: 'broken' };
  if (h.data.v > SECTION_VERSION) return { ok: false, reason: 'future' };
  const cur = def?.version ?? 0;
  const dv = h.data.dv ?? (def ? 1 : 0);
  if (dv > cur) return { ok: false, reason: 'future' };
  const cfg = sanitizeCfg(id, raw.cfg);
  if (!def) return { ok: true, value: { cfg, data: undefined } };
  if (raw.data === undefined) return { ok: true, value: { cfg, data: def.initial(now) } };
  let src: unknown = raw.data;
  if (dv < cur) {
    if (!def.migrate) return { ok: false, reason: 'migrate' };
    try { src = def.migrate(raw.data, dv); } catch { return { ok: false, reason: 'migrate' }; }
    if (src === null || src === undefined) return { ok: false, reason: 'migrate' };
  }
  let data: unknown;
  try { data = def.sanitize(src, now); } catch { data = null; }
  if (data === null) return { ok: false, reason: dv < cur ? 'migrate' : 'broken' };
  return { ok: true, value: { cfg, data } };
}

/** Result of reading one key: absent, usable, or locked (kept as is; never written). */
export type Read<T> = { state: 'missing' } | { state: 'ok'; value: T } | { state: 'locked'; reason: LockReason; raw: unknown };

function readKey<T>(store: SectionStore, key: string, parse: (raw: unknown) => Parsed<T>): Read<T> {
  let text: string | null;
  try { text = store.get(key); } catch { return { state: 'missing' }; }
  if (text === null || text === '') return { state: 'missing' };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { state: 'locked', reason: 'broken', raw: undefined }; }
  const p = parse(raw);
  return p.ok ? { state: 'ok', value: p.value } : { state: 'locked', reason: p.reason, raw };
}

export function readGlobal(store: SectionStore, now: number): Read<GlobalSection> {
  return readKey(store, GLOBAL_KEY, raw => parseGlobalSection(raw, now));
}

export function readWidget(store: SectionStore, id: string, def: WidgetDataDef<unknown> | undefined, now: number): Read<WidgetSection> {
  return readKey(store, widgetKey(id), raw => parseWidgetSection(id, raw, def, now));
}
