import { describe, expect, it } from 'vitest';
import { GLOBAL_VERSION, SECTION_VERSION, parseGlobalSection, parseWidgetSection, sanitizeCfg, sanitizeGlobal } from './persist';
import { TX_MAX, checkField, isRealDate } from './validate';
import { REGISTRY } from '../registry/registry';
import type { WidgetDataDef } from './types';

type Items = { items: string[] };
const v2Def: WidgetDataDef<Items> = {
  version: 2,
  initial: () => ({ items: [] }),
  sanitize: raw => (raw && typeof raw === 'object' && Array.isArray((raw as Items).items) ? { items: (raw as Items).items.filter(x => typeof x === 'string') } : null),
  // v1 stored a bare array.
  migrate: (raw, from) => (from === 1 && Array.isArray(raw) ? { items: raw as unknown[] } : null),
};

describe('固有設定の検証 (実装ガイド 4章「固有設定の型」) — one rule for UI, restore and import', () => {
  it('st / rg: min, max and step; out of range falls back to the default', () => {
    expect(checkField('memo', 'size', 16)).toBe(16);
    expect(checkField('memo', 'size', 1_000_000)).toBeUndefined();
    expect(checkField('memo', 'size', 11)).toBeUndefined();
    expect(checkField('pomo', 'min', -1)).toBeUndefined();
    expect(checkField('pomo', 'min', 25)).toBe(25);
    expect(checkField('pomo', 'min', 27)).toBeUndefined(); // step 5
    expect(checkField('imgconv', 'q', 80)).toBe(80);
    expect(checkField('imgconv', 'q', 39)).toBeUndefined();
    expect(checkField('imgconv', 'q', 80.5)).toBeUndefined();
    expect(checkField('memo', 'size', Number.NaN)).toBeUndefined();
    expect(checkField('memo', 'size', '14')).toBeUndefined();
  });
  it('tm is HH:MM, dt is a real YYYY-MM-DD date', () => {
    expect(checkField('alarm', 'a1', '07:30')).toBe('07:30');
    for (const bad of ['7:30', '24:00', '07:60', '', '07:30:00']) expect(checkField('alarm', 'a1', bad)).toBeUndefined();
    expect(checkField('countdown', 'date', '2026-12-31')).toBe('2026-12-31');
    expect(checkField('countdown', 'date', '2028-02-29')).toBe('2028-02-29');
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-01', '20261231', '']) expect(checkField('countdown', 'date', bad)).toBeUndefined();
    expect(isRealDate('2026-02-29')).toBe(false);
  });
  it('tx has a length limit; tg / sg / veil keep their types and options', () => {
    expect(checkField('search', 'url', 'x'.repeat(TX_MAX))).toBe('x'.repeat(TX_MAX));
    expect(checkField('search', 'url', 'x'.repeat(TX_MAX + 1))).toBeUndefined();
    expect(checkField('clock', 'sec', 'yes')).toBeUndefined();
    expect(checkField('weather', 'unit', 'K')).toBeUndefined();
    expect(checkField('todo', 'veil', 1)).toBeUndefined();
    expect(checkField('todo', 'veil', false)).toBe(false);
    expect(checkField('todo', 'nope', true)).toBeUndefined();
  });
  it('sanitizeCfg drops invalid values per item (placement IDs use their kind)', () => {
    expect(sanitizeCfg('memo#2', { size: 1_000_000, bar: false, count: 'x', veil: 'no', junk: 1 })).toEqual({ bar: false });
    expect(sanitizeCfg('pomo', { min: -1, notify: false })).toEqual({ notify: false });
    expect(sanitizeCfg('alarm', { a1: '25:00', a2: '06:15' })).toEqual({ a2: '06:15' });
  });
});

describe('全体の検証 (型・値域・重複・参照切れ・不正な数値)', () => {
  it('never throws on values that are not numbers and falls back to defaults', () => {
    const g = sanitizeGlobal({ gs: { glass: { valueOf: 1 }, rad: [30], acc: '3', dens: null, wheel: 'yes', theme: 5 } }, 0);
    expect(g.gs).toMatchObject({ glass: 60, rad: 26, acc: 0, dens: 1, wheel: true, theme: null });
  });
  it('removes duplicate boards and placements', () => {
    const g = sanitizeGlobal({
      groups: [{ id: 'a' }, { id: 'a' }, { id: 'b' }, { id: '' }, { id: 3 }],
      order: ['todo', 'clock', 'todo', 'links#2', 'links#2', 'search#2', 'stretch'],
    }, 0);
    expect(g.groups).toEqual([{ id: 'a', n: 'ボード 1' }, { id: 'b', n: 'ボード 2' }]);
    expect(g.order.slice(0, 3)).toEqual(['todo', 'clock', 'links#2']);
    expect(new Set(g.order).size).toBe(g.order.length);
    expect(g.order).not.toContain('search#2');
    expect(g.order).not.toContain('stretch');
    expect(g.order).toContain('links');
  });
  it('points placements at existing boards (first board otherwise) and drops unknown placement keys', () => {
    const g = sanitizeGlobal({
      groups: [{ id: 'g0' }, { id: 'g5' }],
      order: ['clock', 'todo', 'links#2'],
      place: { clock: 'g5', todo: 'gone', 'links#2': 'g5', 'links#9': 'g5' },
      off: { 'links#9': true, todo: true },
      sizes: { clock: [3, 1], 'links#9': [2, 1], todo: [0, 1] },
      pins: { clock: [0, 1, 0], 'links#9': [0, 0, 0] },
      lockSz: { clock: true, 'links#9': true },
      pgW: { clock: true, todo: true, 'links#9': true },
      gs: { home: 'gone' },
    }, 0);
    expect(g.place.clock).toBe('g5');
    expect(g.place.todo).toBe('g0');
    expect(g.place['links#2']).toBe('g5');
    expect('links#9' in g.place).toBe(false);
    expect(Object.values(g.place).every(b => b === 'g0' || b === 'g5')).toBe(true);
    expect(g.off).toMatchObject({ todo: true });
    expect('links#9' in g.off).toBe(false);
    expect(g.sizes).toEqual({ clock: [3, 1] });
    expect(g.pins).toEqual({ clock: [0, 1, 0] });
    expect(g.lockSz).toEqual({ clock: true });
    expect(g.pgW).toEqual({ clock: true }); // todo cannot go full-screen (pg: false)
    expect(g.gs.home).toBe('');
  });
  it('keeps every registered kind in the order', () => {
    const g = sanitizeGlobal({ order: [] }, 0);
    expect(new Set(g.order)).toEqual(new Set(Object.keys(REGISTRY)));
  });
});

describe('区画の版 (実装ガイド 5章・7.5)', () => {
  it('reads a global section without v as version 1, refuses newer and broken ones', () => {
    expect(parseGlobalSection({ tourDone: true }, 0)).toMatchObject({ ok: true, value: { tourDone: true } });
    expect(parseGlobalSection({ v: GLOBAL_VERSION, tourDone: true }, 0).ok).toBe(true);
    expect(parseGlobalSection({ v: GLOBAL_VERSION + 1 }, 0)).toEqual({ ok: false, reason: 'future' });
    expect(parseGlobalSection({ v: 0 }, 0)).toEqual({ ok: false, reason: 'broken' });
    expect(parseGlobalSection({ v: '1' }, 0)).toEqual({ ok: false, reason: 'broken' });
    expect(parseGlobalSection([1], 0)).toEqual({ ok: false, reason: 'broken' });
  });
  it('checks the section shape (v) and the record version (dv) per kind', () => {
    const cur = { v: SECTION_VERSION, dv: 2, cfg: {}, data: { items: ['a', 1] } };
    expect(parseWidgetSection('links', cur, v2Def as WidgetDataDef<unknown>, 0)).toEqual({ ok: true, value: { cfg: {}, data: { items: ['a'] } } });
    expect(parseWidgetSection('links', { ...cur, v: SECTION_VERSION + 1 }, v2Def as WidgetDataDef<unknown>, 0)).toEqual({ ok: false, reason: 'future' });
    expect(parseWidgetSection('links', { ...cur, dv: 3 }, v2Def as WidgetDataDef<unknown>, 0)).toEqual({ ok: false, reason: 'future' });
    expect(parseWidgetSection('links', { cfg: {} }, v2Def as WidgetDataDef<unknown>, 0)).toEqual({ ok: false, reason: 'broken' });
    expect(parseWidgetSection('links', { ...cur, data: 'garbage' }, v2Def as WidgetDataDef<unknown>, 0)).toEqual({ ok: false, reason: 'broken' });
  });
  it('moves an older record with migrate, and refuses when migrate fails or is missing', () => {
    expect(parseWidgetSection('links', { v: 1, dv: 1, cfg: {}, data: ['x'] }, v2Def as WidgetDataDef<unknown>, 0)).toEqual({ ok: true, value: { cfg: {}, data: { items: ['x'] } } });
    // no dv = written when every record was version 1
    expect(parseWidgetSection('links', { v: 1, cfg: {}, data: ['y'] }, v2Def as WidgetDataDef<unknown>, 0)).toMatchObject({ ok: true, value: { data: { items: ['y'] } } });
    expect(parseWidgetSection('links', { v: 1, dv: 1, cfg: {}, data: { not: 'an array' } }, v2Def as WidgetDataDef<unknown>, 0)).toEqual({ ok: false, reason: 'migrate' });
    const noMigrate: WidgetDataDef<Items> = { version: 2, initial: v2Def.initial, sanitize: v2Def.sanitize };
    expect(parseWidgetSection('links', { v: 1, dv: 1, cfg: {}, data: ['x'] }, noMigrate as WidgetDataDef<unknown>, 0)).toEqual({ ok: false, reason: 'migrate' });
    const throwing: WidgetDataDef<Items> = { ...v2Def, migrate: () => { throw new Error('boom'); } };
    expect(parseWidgetSection('links', { v: 1, dv: 1, cfg: {}, data: ['x'] }, throwing as WidgetDataDef<unknown>, 0)).toEqual({ ok: false, reason: 'migrate' });
  });
  it('treats records of a kind this build keeps no records for as newer', () => {
    expect(parseWidgetSection('clock', { v: 1, cfg: { sec: false } }, undefined, 0)).toEqual({ ok: true, value: { cfg: { sec: false }, data: undefined } });
    expect(parseWidgetSection('clock', { v: 1, dv: 1, cfg: {}, data: { a: 1 } }, undefined, 0)).toEqual({ ok: false, reason: 'future' });
  });
});
