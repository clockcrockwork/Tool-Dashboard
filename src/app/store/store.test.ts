import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { Dashboard, type WidgetDataDef } from './store';
import { GLOBAL_KEY, WIDGET_KEY_PREFIX, memoryStore, sanitizeCfg, sanitizeGlobal } from './persist';
import { REGISTRY } from '../registry/registry';

type Items = { items: string[] };
const itemsDef: WidgetDataDef<Items> = {
  version: 1,
  initial: () => ({ items: ['a'] }),
  sanitize: raw => (raw && typeof raw === 'object' && Array.isArray((raw as Items).items) ? { items: (raw as Items).items.filter(x => typeof x === 'string') } : null),
};

function make(init: Record<string, string> = {}) {
  let t = 1_000_000;
  const timers: (() => void)[] = [];
  const store = memoryStore(init);
  const d = new Dashboard({
    store,
    dataDefs: { links: itemsDef as WidgetDataDef<unknown> },
    now: () => (t += 1000),
    setTimeout: fn => { timers.push(fn); return timers.length; },
  });
  return { d, store, timers };
}

describe('sanitizeGlobal (実装ガイド 5章: 知らない項目は捨て、足りない項目は既定値)', () => {
  it('returns defaults for garbage', () => {
    const g = sanitizeGlobal('nope', 5);
    expect(g.groups).toEqual([{ id: 'g0', n: 'ボード 1' }]);
    expect(g.off.clock).toBeUndefined();
    expect(g.off.sun).toBe(true);
    expect(g.since).toBe(5);
  });
  it('clamps settings and drops unknown keys', () => {
    const g = sanitizeGlobal({ gs: { glass: 400, rad: 2, theme: 'neon', acc: 9, bogus: 1 }, hacker: true }, 0);
    expect(g.gs).toMatchObject({ glass: 100, rad: 8, theme: null, acc: 4 });
    expect('bogus' in g.gs).toBe(false);
    expect('hacker' in g).toBe(false);
  });
  it('keeps new widgets unplaced for existing users (実装ガイド 6章)', () => {
    const g = sanitizeGlobal({ order: ['clock', 'todo'], off: {} }, 0);
    expect(g.off.clock).toBeUndefined();
    expect(g.off.memo).toBe(true);
    expect(g.order.slice(0, 2)).toEqual(['clock', 'todo']);
    expect(g.order).toHaveLength(Object.keys(REGISTRY).length);
  });
  it('renumbers boards and validates pins', () => {
    const g = sanitizeGlobal({ groups: [{ id: 'x', n: 'foo' }, { id: 'y' }], pins: { clock: [0, 1, 2], todo: [0, -1, 0], memo: 'x' } }, 0);
    expect(g.groups.map(b => b.n)).toEqual(['ボード 1', 'ボード 2']);
    expect(g.pins).toEqual({ clock: [0, 1, 2] });
  });
});

describe('sanitizeCfg', () => {
  it('accepts only registered fields of the right type and option', () => {
    expect(sanitizeCfg('weather', { unit: '°F', x: 1 })).toEqual({ unit: '°F' });
    expect(sanitizeCfg('weather', { unit: 'K' })).toEqual({});
    expect(sanitizeCfg('clock', { sec: 'yes', veil: true })).toEqual({ veil: true });
  });
});

describe('Dashboard store', () => {
  it('starts with the tour on first open and off once done', () => {
    expect(make().d.ui.tour).toBe(0);
    expect(make({ [GLOBAL_KEY]: JSON.stringify({ tourDone: true }) }).d.ui.tour).toBe(-1);
  });
  it('saves the global and widget sections separately', async () => {
    const { d, store } = make();
    const stop = d.start();
    d.setG('glass', 30);
    d.setCfg('clock', 'sec', false);
    d.setData('links', { items: ['x', 'y'] });
    await nextTick();
    expect(JSON.parse(store.get(GLOBAL_KEY) ?? '{}')).toMatchObject({ gs: { glass: 30 } });
    expect(JSON.parse(store.get(WIDGET_KEY_PREFIX + 'clock') ?? '{}')).toMatchObject({ v: 1, cfg: { sec: false } });
    expect(JSON.parse(store.get(WIDGET_KEY_PREFIX + 'links') ?? '{}')).toMatchObject({ data: { items: ['x', 'y'] } });
    stop();
  });
  it('restores saved sections through sanitize', () => {
    const { d } = make({ [WIDGET_KEY_PREFIX + 'links']: JSON.stringify({ v: 1, cfg: {}, data: { items: ['q', 3] } }) });
    expect(d.dataOf<Items>('links').items).toEqual(['q']);
  });
  it('undoes layout and item changes one step at a time (仕様書 7章)', async () => {
    const { d } = make();
    const stop = d.start();
    d.unplace('clock');
    await nextTick();
    expect(d.g.off.clock).toBe(true);
    expect(d.canUndo).toBe(true);
    d.undo();
    await nextTick();
    expect(d.g.off.clock).toBeUndefined();
    d.setData('links', { items: ['changed'] });
    await nextTick();
    d.undo();
    await nextTick();
    expect(d.dataOf<Items>('links').items).toEqual(['a']);
    stop();
  });
  it('offers 元に戻す on unplace and keeps action toasts for 10 seconds', () => {
    const { d } = make();
    d.unplace('todo');
    const t = d.ui.toasts.at(-1);
    expect(t?.text).toBe('TODO をボードから外しました');
    expect(t?.act?.label).toBe('元に戻す');
  });
  it('closes only the top layer on back', () => {
    const { d } = make({ [GLOBAL_KEY]: JSON.stringify({ tourDone: true }) });
    d.toggleEdit();
    d.openPanel('add', { addFrom: 'edit' });
    d.back();
    expect(d.ui.panel).toBe('none');
    expect(d.ui.edit).toBe(true);
    d.openPanel('global');
    d.openPanel('help');
    d.back();
    expect(d.ui.panel).toBe('global');
    d.back();
    d.back();
    expect(d.ui.edit).toBe(false);
  });
  it('exports and re-imports with validation', () => {
    const { d } = make();
    d.setG('acc', 2);
    const json = d.exportJson();
    const other = make().d;
    expect(other.importJson(json)).toBe(true);
    expect(other.g.gs.acc).toBe(2);
    expect(other.importJson('{"format":"other"}')).toBe(false);
  });
  it('derives glass/blur/accent variables from settings (実装ガイド 3章)', () => {
    const { d } = make();
    expect(d.rootVars()).toMatchObject({ '--blur': '21.6px', '--rad': '26px', '--a1': 'light-dark(#2f6f9f, #82b8de)' });
    d.setG('glass', 0);
    expect(d.rootVars()['--bf']).toBe('none');
  });
});
