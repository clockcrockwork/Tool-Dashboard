/**
 * Data gates for review items #1 (versions, import), #2 (write only changed sections) and #5 (kind vs placement IDs).
 * Non-UI fixtures: a Dashboard over an in-memory SectionStore, checked through the saved bytes.
 */
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Dashboard, IMPORT_REASONS, type WidgetDataDef } from './store';
import { GLOBAL_KEY, memoryStore, widgetKey, type SectionStore } from './persist';
import { computeLayout } from '../layout/layout';
import { REGISTRY } from '../registry/registry';

type Items = { items: string[] };
type Memo = { text: string };
const itemsDef: WidgetDataDef<Items> = {
  version: 1,
  initial: () => ({ items: ['a'] }),
  sanitize: raw => (raw && typeof raw === 'object' && Array.isArray((raw as Items).items) ? { items: (raw as Items).items.filter(x => typeof x === 'string') } : null),
};
const memoDef: WidgetDataDef<Memo> = {
  version: 1,
  initial: () => ({ text: '# メモ' }),
  sanitize: raw => (raw && typeof raw === 'object' && typeof (raw as Memo).text === 'string' ? { text: (raw as Memo).text } : null),
};
const DEFS = { links: itemsDef, memo: memoDef } as Readonly<Record<string, WidgetDataDef<unknown>>>;

function make(store: SectionStore = memoryStore(), defs = DEFS) {
  let t = 1_000_000;
  const d = new Dashboard({ store, dataDefs: defs, now: () => (t += 1000), setTimeout: () => 0 });
  return { d, store };
}
/** All saved bytes, for "nothing changed" checks. */
const bytes = (s: SectionStore): Record<string, string | null> => Object.fromEntries(s.keys().sort().map(k => [k, s.get(k)]));
/** A store that records which keys were written. */
function spied(init: Record<string, string> = {}) {
  const inner = memoryStore(init);
  const writes: string[] = [];
  let fail = 0;
  const store: SectionStore = {
    ...inner,
    set: (k, v) => {
      if (fail > 0) { fail--; throw new DOMException('quota', 'QuotaExceededError'); }
      writes.push(k);
      inner.set(k, v);
    },
  };
  return { store, writes, failNext: (n = 1) => { fail = n; } };
}

// ---------------------------------------------------------------- #5
describe('#5 種類 ID と配置 ID', () => {
  it('adds a second placement only for multi kinds (multi: false is refused)', () => {
    const { d } = make();
    expect(d.addInstance('links')).toBe('links#2');
    expect(d.addInstance('links')).toBe('links#3');
    expect(d.addInstance('search')).toBeNull();
    expect(d.addInstance('stretch')).toBeNull();
    expect(d.g.order.filter(id => id.startsWith('search'))).toEqual(['search']);
    expect(d.g.order).toContain('links#2');
    expect(d.g.off['links#2']).toBeUndefined();
  });
  it('keeps settings and records of two placements of one kind apart, through save, export and import', async () => {
    const { d, store } = make();
    const stop = d.start();
    const id2 = d.addInstance('links');
    expect(id2).toBe('links#2');
    d.setData('links', { items: ['first'] });
    d.setData('links#2', { items: ['second'] });
    d.setCfg('links#2', 'veil', true);
    await nextTick();
    stop();
    expect(JSON.parse(store.get(widgetKey('links')) ?? '{}')).toEqual({ v: 1, dv: 1, cfg: {}, data: { items: ['first'] } });
    expect(JSON.parse(store.get(widgetKey('links#2')) ?? '{}')).toEqual({ v: 1, dv: 1, cfg: { veil: true }, data: { items: ['second'] } });

    // Restore from the saved sections.
    const back = make(store).d;
    expect(back.g.order).toContain('links#2');
    expect(back.dataOf<Items>('links').items).toEqual(['first']);
    expect(back.dataOf<Items>('links#2').items).toEqual(['second']);
    expect(back.veilOf('links')).toBe(false);
    expect(back.veilOf('links#2')).toBe(true);

    // Export → import into a fresh dashboard.
    const json = d.exportJson();
    const env = JSON.parse(json) as { widgets: Record<string, unknown> };
    expect(Object.keys(env.widgets)).toEqual(expect.arrayContaining(['links', 'links#2']));
    const other = make().d;
    expect(other.importJson(json)).toEqual({ ok: true });
    expect(other.dataOf<Items>('links').items).toEqual(['first']);
    expect(other.dataOf<Items>('links#2').items).toEqual(['second']);
    expect(other.cfg['links#2']).toEqual({ veil: true });
    expect(other.cfg.links).toEqual({});
  });
  it('puts only the full-screen placement on its own screen (pg is per kind, pgW per placement)', () => {
    const { d } = make();
    const c2 = d.addInstance('clock');
    expect(c2).toBe('clock#2');
    d.g.pgW = { 'clock#2': true };
    const L = d.layout.value;
    expect(L.fullScreens).toEqual([{ id: 'clock#2', page: 1, gi: 0 }]);
    expect(L.full).toEqual([null, 'clock#2']);
    expect(L.pos['clock#2']).toMatchObject({ page: 1, pg: true });
    expect(L.pos.clock).toMatchObject({ page: 0, w: 2, h: 1 });
    expect(L.pos.clock?.pg).toBeUndefined();
    expect(d.screenLabel(1, 'の')).toBe('時計');
    // A kind without pg cannot be full-screen even if pgW says so.
    const L2 = computeLayout({ width: 1440, height: 900 }, { ...d.g, dens: 1, pgW: { todo: true } });
    expect(L2.fullScreens).toEqual([]);
  });
  it('has no per-kind branch in the layout or the shell root (adding a kind needs no Shell change)', () => {
    // Code only: comments may name kinds as examples.
    const code = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '');
    const files = ['../layout/layout.ts', '../shell/DashboardRoot.vue'].map(f => code(readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8')));
    for (const src of files) {
      for (const kind of Object.keys(REGISTRY)) {
        expect(src, kind).not.toMatch(new RegExp('[\'"`]' + kind + '[\'"`#]'));
        expect(src, kind).not.toMatch(new RegExp('\\.' + kind + '\\b(?!\\()'));
      }
      expect(src).not.toMatch(/FULL_SCREEN_IDS|focusIdx|boardIdx/);
    }
  });
});

// ---------------------------------------------------------------- #1
describe('#1 版と読み込み', () => {
  it('round-trips a supported export and fills missing items with defaults', () => {
    const { d } = make();
    d.setG('acc', 3);
    d.setData('memo', { text: 'hello' });
    const other = make().d;
    expect(other.importJson(d.exportJson())).toEqual({ ok: true });
    expect(other.g.gs.acc).toBe(3);
    expect(other.dataOf<Memo>('memo').text).toBe('hello');
    const sparse = make().d;
    sparse.setData('memo', { text: 'before' });
    const r = sparse.importJson(JSON.stringify({ format: 'lgd-dashboard', v: 1, global: { v: 1, gs: { acc: 2 }, junk: 1 }, widgets: { links: { v: 1, cfg: { veil: true, bogus: 1 } } } }));
    expect(r).toEqual({ ok: true });
    expect(sparse.g.gs).toMatchObject({ acc: 2, glass: 60, rad: 26 });
    expect('junk' in sparse.g).toBe(false);
    expect(sparse.cfg.links).toEqual({ veil: true });
    expect(sparse.dataOf<Items>('links').items).toEqual(['a']);
    expect(sparse.dataOf<Memo>('memo').text).toBe('# メモ');
  });
  it('migrates an older record per kind, and saves it with the current dv', async () => {
    const v2: WidgetDataDef<Items> = { ...itemsDef, version: 2, migrate: (raw, from) => (from === 1 && Array.isArray(raw) ? { items: raw as unknown[] } : null) };
    const store = memoryStore({ [widgetKey('links')]: JSON.stringify({ v: 1, dv: 1, cfg: {}, data: ['old'] }) });
    const { d } = make(store, { ...DEFS, links: v2 as WidgetDataDef<unknown> });
    expect(d.lockedKeys()).toEqual([]);
    expect(d.dataOf<Items>('links').items).toEqual(['old']);
    const stop = d.start();
    d.setData('links', { items: ['old', 'new'] });
    await nextTick();
    stop();
    expect(JSON.parse(store.get(widgetKey('links')) ?? '{}')).toEqual({ v: 1, dv: 2, cfg: {}, data: { items: ['old', 'new'] } });
  });

  const refusals: [string, string, string][] = [
    ['future envelope', '{"format":"lgd-dashboard","v":999}', IMPORT_REASONS.future],
    ['not JSON', '{oops', IMPORT_REASONS.format],
    ['other format', '{"format":"other","v":1,"global":{},"widgets":{}}', IMPORT_REASONS.format],
    ['missing global/widgets', '{"format":"lgd-dashboard","v":1}', IMPORT_REASONS.format],
    ['array global', '{"format":"lgd-dashboard","v":1,"global":[],"widgets":{}}', IMPORT_REASONS.format],
    ['future global', '{"format":"lgd-dashboard","v":1,"global":{"v":2},"widgets":{}}', IMPORT_REASONS.future],
    ['future section', '{"format":"lgd-dashboard","v":1,"global":{"v":1},"widgets":{"links":{"v":2,"cfg":{}}}}', IMPORT_REASONS.future],
    ['future record', '{"format":"lgd-dashboard","v":1,"global":{"v":1},"widgets":{"memo":{"v":1,"dv":5,"cfg":{},"data":{"text":"x"}}}}', IMPORT_REASONS.future],
    ['broken record', '{"format":"lgd-dashboard","v":1,"global":{"v":1},"widgets":{"memo":{"v":1,"dv":1,"cfg":{},"data":42}}}', IMPORT_REASONS.broken],
  ];
  for (const [name, text, reason] of refusals) {
    it('refuses an import and changes nothing: ' + name, async () => {
      const { d, store } = make();
      const stop = d.start();
      d.setData('memo', { text: 'keep me' });
      d.setG('acc', 4);
      await nextTick();
      const before = bytes(store);
      const exported = d.exportJson();
      expect(d.importJson(text)).toEqual({ ok: false, reason });
      await nextTick();
      stop();
      expect(bytes(store)).toEqual(before);
      expect(d.exportJson()).toBe(exported);
      expect(d.dataOf<Memo>('memo').text).toBe('keep me');
    });
  }
  it('refuses an import whose older record cannot be migrated', async () => {
    const v2: WidgetDataDef<Items> = { ...itemsDef, version: 2, migrate: () => null };
    const { d, store } = make(memoryStore(), { ...DEFS, links: v2 as WidgetDataDef<unknown> });
    const stop = d.start();
    d.setData('links', { items: ['mine'] });
    await nextTick();
    const before = bytes(store);
    const r = d.importJson(JSON.stringify({ format: 'lgd-dashboard', v: 1, global: { v: 1 }, widgets: { links: { v: 1, dv: 1, cfg: {}, data: ['x'] } } }));
    expect(r).toEqual({ ok: false, reason: IMPORT_REASONS.migrate });
    await nextTick();
    stop();
    expect(bytes(store)).toEqual(before);
    expect(d.dataOf<Items>('links').items).toEqual(['mine']);
  });

  it('keeps a newer or broken saved section read-only: defaults in memory, bytes untouched', async () => {
    const future = JSON.stringify({ v: 1, dv: 9, cfg: {}, data: { text: 'from v9' } });
    const init = {
      [GLOBAL_KEY]: JSON.stringify({ v: 2, tourDone: true, gs: { acc: 4 } }),
      [widgetKey('memo')]: future,
      [widgetKey('links')]: '{not json',
    };
    const { store, writes } = spied(init);
    const { d } = make(store);
    expect(d.lockedKeys().sort()).toEqual([GLOBAL_KEY, widgetKey('links'), widgetKey('memo')].sort());
    expect(d.ui.toasts.at(-1)).toMatchObject({ kind: 'warn' });
    expect(d.g.gs.acc).toBe(0);
    expect(d.dataOf<Memo>('memo').text).toBe('# メモ');
    const stop = d.start();
    d.setG('acc', 1);
    d.setData('memo', { text: 'typed now' });
    d.setData('links', { items: ['z'] });
    d.setCfg('clock', 'sec', false);
    await nextTick();
    stop();
    expect(writes).toEqual([widgetKey('clock')]);
    expect(store.get(GLOBAL_KEY)).toBe(init[GLOBAL_KEY]);
    expect(store.get(widgetKey('memo'))).toBe(future);
    expect(store.get(widgetKey('links'))).toBe('{not json');
    // The export carries the newer section as saved, not the defaults.
    const env = JSON.parse(d.exportJson()) as { global: { v: number }; widgets: Record<string, unknown> };
    expect(env.global.v).toBe(2);
    expect(env.widgets.memo).toEqual(JSON.parse(future));
    expect('links' in env.widgets).toBe(false);
  });
  it('a successful import replaces locked sections and writes them', async () => {
    const init = { [widgetKey('memo')]: JSON.stringify({ v: 1, dv: 9, cfg: {}, data: {} }) };
    const { d, store } = make(memoryStore(init));
    const stop = d.start();
    expect(d.importJson(JSON.stringify({ format: 'lgd-dashboard', v: 1, global: { v: 1 }, widgets: { memo: { v: 1, dv: 1, cfg: {}, data: { text: 'imported' } } } }))).toEqual({ ok: true });
    await nextTick();
    stop();
    expect(d.lockedKeys()).toEqual([]);
    expect(JSON.parse(store.get(widgetKey('memo')) ?? '{}')).toMatchObject({ dv: 1, data: { text: 'imported' } });
  });
});

// ---------------------------------------------------------------- #2
describe('#2 変わった区画だけ書く', () => {
  it('writes nothing at start and only the changed section afterwards', async () => {
    const { store, writes } = spied({ [GLOBAL_KEY]: JSON.stringify({ tourDone: true }) });
    const { d } = make(store);
    const stop = d.start();
    await nextTick();
    expect(writes).toEqual([]);
    d.setData('memo', { text: 'x' });
    await nextTick();
    expect(writes).toEqual([widgetKey('memo')]);
    d.setG('glass', 30);
    await nextTick();
    expect(writes).toEqual([widgetKey('memo'), GLOBAL_KEY]);
    stop();
  });
  it('two dashboards on one store: A edits the memo, B the clock settings — both survive', async () => {
    const store = memoryStore();
    const a = make(store).d, b = make(store).d;
    const sa = a.start(), sb = b.start();
    a.setData('memo', { text: 'from A' });
    await nextTick();
    b.setCfg('clock', 'sec', false);
    b.setG('acc', 2);
    await nextTick();
    a.setData('links', { items: ['A2'] });
    await nextTick();
    sa(); sb();
    const c = make(store).d;
    expect(c.dataOf<Memo>('memo').text).toBe('from A');
    expect(c.dataOf<Items>('links').items).toEqual(['A2']);
    expect(c.cfgOf('clock', 'sec')).toBe(false);
    expect(c.g.gs.acc).toBe(2);
  });
  it('tells the user when saving fails (quota) and saves again on the next change', async () => {
    const { store, writes, failNext } = spied();
    const { d } = make(store);
    const stop = d.start();
    failNext();
    d.setData('memo', { text: 'big' });
    await nextTick();
    expect(writes).toEqual([]);
    expect(d.ui.toasts.at(-1)).toMatchObject({ text: '容量がいっぱいで保存できません', kind: 'warn' });
    expect(d.ui.toasts.at(-1)?.act?.label).toBe('ファイルに保存');
    d.setCfg('clock', 'h12', true);
    await nextTick();
    stop();
    expect(writes.sort()).toEqual([widgetKey('clock'), widgetKey('memo')].sort());
    expect(JSON.parse(store.get(widgetKey('memo')) ?? '{}')).toMatchObject({ data: { text: 'big' } });
  });
  it('setCfg applies the same check as restore and import', () => {
    const { d } = make();
    expect(d.setCfg('memo', 'size', 1_000_000)).toBe(false);
    expect(d.setCfg('memo', 'size', 18)).toBe(true);
    expect(d.setCfg('search#2', 'eng', 'Bing')).toBe(false);
    expect(d.setCfg('alarm', 'a1', '')).toBe(false);
    expect(d.cfgOf('memo', 'size')).toBe(18);
    expect(d.cfgOf('alarm', 'a1')).toBe('07:00');
  });
});
