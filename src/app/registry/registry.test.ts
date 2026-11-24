/**
 * 登録の残り項目 (実装ガイド 4章「登録の項目」, review #6): priv / states / refresh / keys / lazy / store, and the rules that
 * keep later registrations consistent with the frame (net, perm → states) and the shell keys.
 */
import { describe, expect, it } from 'vitest';
import { OVERLAY_STATES, PRIV_DEFAULT, REGISTRY, STARTER, buildRegistry, type WidgetDef } from './registry';
import { storeOf } from './store-ref';
import { WIDGETS, WIDGET_DATA } from '../../widgets';
import { Dashboard, veilSetting } from '../store/store';
import { memoryStore, widgetKey } from '../store/persist';

const defs = Object.values(REGISTRY);
const def = (id: string): WidgetDef => {
  const r = REGISTRY[id];
  if (!r) throw new Error('missing ' + id);
  return r;
};

describe('priv (人前では隠すの既定、仕様書 3章)', () => {
  it('is on exactly for the kinds listed in the spec', () => {
    expect([...PRIV_DEFAULT].sort()).toEqual(['agenda', 'chat', 'clip', 'memo', 'script', 'share', 'sketch', 'table', 'timelog', 'todo', 'translate']);
    for (const r of defs) expect(r.priv, r.id).toBe(PRIV_DEFAULT.includes(r.id));
  });
  it('is not derived from vd (a fixture where they differ)', () => {
    const inputFirstNotPrivate = { ...def('memo'), vd: true, priv: false };
    const privateNotInputFirst = { ...def('weather'), vd: false, priv: true };
    expect(veilSetting(undefined, inputFirstNotPrivate)).toBe(false);
    expect(veilSetting({}, privateNotInputFirst)).toBe(true);
    // The placement's own setting wins over the default either way.
    expect(veilSetting({ veil: true }, inputFirstNotPrivate)).toBe(true);
    expect(veilSetting({ veil: false }, privateNotInputFirst)).toBe(false);
  });
  it('drives the dashboard: veilOf / veiled follow priv, the setting, 「中身を隠す」 and 「表示する」', () => {
    const d = new Dashboard({ store: memoryStore(), dataDefs: {} });
    expect(d.veilOf('memo')).toBe(true);
    expect(d.veilOf('weather')).toBe(false);
    expect(d.veiled('memo')).toBe(false);
    d.setG('veil', true);
    expect(d.veiled('memo')).toBe(true);
    expect(d.frameClass('memo')).toContain('veil');
    d.ui.peek = { memo: true };
    expect(d.veiled('memo')).toBe(false);
    d.setCfg('weather', 'veil', true);
    expect(d.veiled('weather')).toBe(true);
  });
});

describe('states / net / perm (共通枠が登録から出すもの)', () => {
  it('external-data kinds with the 5 states are the ones the prototype has (天気・GitHub PR・RSS)', () => {
    const overlay = defs.filter(r => r.states.some(s => OVERLAY_STATES.includes(s))).map(r => r.id).sort();
    expect(overlay).toEqual(['github', 'rss', 'weather']);
    for (const id of overlay) expect(def(id).states).toEqual(expect.arrayContaining(['load', 'stale', 'empty', 'err']));
  });
  it('net: data kinds can show old content; kinds with permissions can wait for one; nothing else claims them', () => {
    for (const r of defs) {
      expect(r.states.includes('old'), r.id).toBe(r.net === 'data');
      expect(r.states.includes('perm'), r.id).toBe(r.perm.length > 0);
    }
  });
  it('the network mark is for net: data only (dl / own show their own state)', () => {
    expect(defs.filter(r => r.net === 'data').map(r => r.id).sort()).toEqual(['github', 'rain', 'rss', 'today', 'weather']);
    expect(def('chat').net).toBe('dl');
    expect(def('share').net).toBe('own');
  });
});

describe('refresh / keys / lazy / icon / share', () => {
  it('every refresh happens only while shown (仕様書 3章「段階表示」)', () => {
    for (const r of defs) if (r.refresh) expect(r.refresh.visible, r.id).toBe(true);
    expect(def('clock').refresh).toEqual({ every: 1, visible: true });
    expect(def('weather').refresh).toEqual({ every: null, visible: true });
    expect(def('todo').refresh).toBeUndefined();
  });
  it('keys are written as key names and never take a shell key outside the widget without being listed', () => {
    const NAME = /^((Mod|Alt|Shift)\+)*(Tab|Enter|Escape|Arrow(Up|Down|Left|Right)|Digit1-9)$/;
    for (const r of defs) for (const k of r.keys) expect(k, r.id).toMatch(NAME);
    expect(def('table').keys).toContain('Escape');
    expect(def('script').keys).toContain('Mod+Enter');
  });
  it('no implemented kind is lazy (the first 7 keep rendering as before)', () => {
    for (const id of STARTER) expect(def(id).lazy, id).toBe(false);
  });
  it('icon and share stay undefined until decided (実装ガイド 7.6)', () => {
    for (const r of defs) { expect(r.icon).toBeUndefined(); expect(r.share).toBeUndefined(); }
  });
  it('the year only changes the countdown default', () => {
    const a = buildRegistry(2026), b = buildRegistry(2027);
    expect(Object.keys(a)).toEqual(Object.keys(b));
    expect(a.countdown?.f.find(f => f.k === 'date')?.d).toBe('2026-12-31');
  });
});

describe('store (WIDGET_DATA から引く)', () => {
  it('names each kind\'s record by the placement section and its version, from WIDGET_DATA only', () => {
    for (const r of defs) {
      const s = storeOf(r.id);
      const dd = WIDGET_DATA[r.id];
      if (!dd) { expect(s, r.id).toBeUndefined(); continue; }
      expect(s?.version).toBe(dd.version);
      expect(s?.section('links#2')).toBe(widgetKey('links#2'));
    }
    expect(storeOf('todo')?.section('todo')).toBe('lgd.v1:w:todo');
    expect(storeOf('clock')).toBeUndefined();
  });
  it('records and views are registered kinds', () => {
    for (const k of Object.keys(WIDGET_DATA)) expect(REGISTRY[k], k).toBeDefined();
    for (const k of Object.keys(WIDGETS)) expect(REGISTRY[k], k).toBeDefined();
  });
});

describe('prototype-only settings (実装ガイド 付録「確認用の機能」)', () => {
  it('only 傘の「サンプル」 is marked dev (hidden from the settings sheet in production builds)', () => {
    const dev = defs.flatMap(r => r.f.filter(f => f.dev).map(f => r.id + '.' + f.k));
    expect(dev).toEqual(['rain.demo']);
  });
});
