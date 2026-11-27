/**
 * 日の出・日の入りの現在地（仕様書 11章、4章「許可のお願い」）: 共通の許可のお願いで聞く、ブラウザに問い合わせるのは「位置を使う」
 * だけ、許可済みなら表示中だけ位置を取る、断られたら東京で表示しトースト、現在地は保存しない（区画の bytes に入らない）.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { Dashboard } from '../../app/store/store';
import { memoryStore, widgetKey } from '../../app/store/persist';
import { permAskOf, permCover, resetPermBrowser } from '../../app/runtime/permission';
import { fakePerms } from '../../app/runtime/test-fixtures';
import { WIDGET_DATA } from '../index';
import { resetSunGeoSource, setSunGeoSource, type GeoPoint } from './geo';
import { locate, setSunGeo, sunRuntime, useSunGeo } from './status';
import { SUN_GEO_FAIL, sunView, sunWhere } from './sun';

const T0 = Date.parse('2026-11-19T10:24:36+09:00');
const flush = async (): Promise<void> => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

function make(store = memoryStore()): Dashboard {
  const d = new Dashboard({ store, dataDefs: WIDGET_DATA, now: () => Date.now(), setTimeout: () => 0 });
  d.ui.tour = -1;
  d.g.groups = [{ id: 'g0', n: 'ボード 1' }, { id: 'g1', n: 'ボード 2' }];
  d.g.off = { ...d.g.off, sun: false };
  d.g.place = { ...d.g.place, sun: 'g0' };
  return d;
}
function geo(pos: GeoPoint | null): { calls: number } {
  const c = { calls: 0 };
  setSunGeoSource({ get: () => { c.calls++; return Promise.resolve(pos); } });
  return c;
}
function mount(d: Dashboard): () => void {
  const scope = effectScope();
  scope.run(() => { useSunGeo(d, 'sun', () => d.cfgOf('sun', 'loc')); });
  return () => { scope.stop(); };
}
const toasts = (d: Dashboard): string[] => d.ui.toasts.map(t => t.text);

beforeEach(() => { vi.useFakeTimers({ now: T0 }); });
afterEach(() => { vi.useRealTimers(); resetPermBrowser(); resetSunGeoSource(); });

describe('現在地の許可のお願い', () => {
  it('候補の都市のままなら何も聞かない', () => {
    fakePerms();
    const g = geo({ lat: 1, lng: 2 });
    const d = make();
    mount(d);
    expect(permAskOf(d, 'sun')).toBeNull();
    expect(g.calls).toBe(0);
  });

  it('場所で「現在地」を選ぶとカードを出す。ブラウザに聞くのは「位置を使う」を押したときだけ。位置は小数2桁', async () => {
    const f = fakePerms();
    const g = geo({ lat: 43.06184, lng: 141.35451 });
    const d = make();
    mount(d);
    d.setCfg('sun', 'loc', '現在地');
    expect(permCover(d, 'sun')).toMatchObject({ title: '現在地を使いますか？', ok: { label: '位置を使う' }, alt: { label: '都市を選ぶ' } });
    expect(g.calls).toBe(0);
    expect(f.requests.geo).toBe(0);
    permCover(d, 'sun')?.ok?.fn();
    await flush();
    expect(g.calls).toBe(1);
    expect(sunRuntime(d).geo).toEqual({ lat: 43.06, lng: 141.35 });
    expect(permAskOf(d, 'sun')).toBeNull();
    expect(sunView(T0, sunWhere('現在地', sunRuntime(d).geo), { t2: true, t3: false }).place).toBe('現在地・今日');
  });

  it('「現在地」のまま開いたとき（保存された場所）も、許可が未確認ならカードを出す', () => {
    fakePerms();
    const d = make();
    d.setCfg('sun', 'loc', '現在地');
    mount(d);
    expect(permAskOf(d, 'sun')).toEqual({ perm: 'geo', st: 'ask' });
  });

  it('断られたら東京で表示し、トーストと直し方のカード（もう一度・都市を選ぶ）', async () => {
    fakePerms();
    geo(null);
    const d = make();
    mount(d);
    d.setCfg('sun', 'loc', '現在地');
    permCover(d, 'sun')?.ok?.fn();
    await flush();
    expect(sunRuntime(d).geo).toBeNull();
    expect(permCover(d, 'sun')).toMatchObject({ warn: true, title: '現在地を使えません', text: 'アドレスバー左のボタンで許可できます。いまは東京で表示中', ok: { label: 'もう一度' }, alt: { label: '都市を選ぶ' } });
    expect(toasts(d)).toContain(SUN_GEO_FAIL);
    expect(sunWhere('現在地', null).name).toBe('現在地（取得するまで東京）');
  });

  it('都市を選び直すとカードを閉じる', () => {
    fakePerms();
    const d = make();
    mount(d);
    d.setCfg('sun', 'loc', '現在地');
    expect(permAskOf(d, 'sun')).not.toBeNull();
    d.setCfg('sun', 'loc', '大阪');
    expect(permAskOf(d, 'sun')).toBeNull();
  });

  it('許可済みなら、カードを出さず表示中のときだけ位置を取る（表示していない画面では取らない）', async () => {
    fakePerms({ geo: 'granted' });
    const g = geo({ lat: 35.0, lng: 135.0 });
    const d = make();
    d.g.place = { ...d.g.place, sun: 'g1' };
    d.setCfg('sun', 'loc', '現在地');
    mount(d);
    await flush();
    expect(g.calls).toBe(0);
    expect(permAskOf(d, 'sun')).toBeNull();
    d.g.place = { ...d.g.place, sun: 'g0' };
    await nextTick();
    await flush();
    expect(g.calls).toBe(1);
    expect(sunRuntime(d).geo).toEqual({ lat: 35, lng: 135 });
  });

  it('人前では隠している間はカードを出さない（隠すのをやめたら出す）', async () => {
    fakePerms();
    const d = make();
    d.g.gs.veil = true;
    d.setCfg('sun', 'veil', true);
    d.setCfg('sun', 'loc', '現在地');
    mount(d);
    expect(d.veiled('sun')).toBe(true);
    expect(permAskOf(d, 'sun')).toBeNull();
    d.g.gs.veil = false;
    await nextTick();
    expect(permAskOf(d, 'sun')).not.toBeNull();
  });

  it('位置の取得は二重に走らない', async () => {
    const g = geo({ lat: 1, lng: 1 });
    const d = make();
    const a = locate(d), b = locate(d);
    expect(a).toBe(b);
    await a;
    expect(g.calls).toBe(1);
  });
});

describe('現在地は保存しない', () => {
  it('取得した位置は区画（cfg・data）にも書き出しにも入らない。場所の設定「現在地」だけが残る', async () => {
    fakePerms({ geo: 'granted' });
    geo({ lat: 35.689512, lng: 139.691749 });
    const store = memoryStore();
    const d = make(store);
    const scope = effectScope();
    scope.run(() => d.start());
    d.setCfg('sun', 'loc', '現在地');
    const stop = mount(d);
    await flush();
    await vi.advanceTimersByTimeAsync(2000);
    expect(sunRuntime(d).geo).toEqual({ lat: 35.69, lng: 139.69 });
    const raw = store.get(widgetKey('sun')) ?? '';
    expect(raw).toContain('現在地');
    expect(raw).not.toMatch(/35\.69|139\.69|lat|lng/);
    expect(d.exportJson()).not.toMatch(/35\.69|139\.69/);
    stop();
    scope.stop();
    // 再読み込み（新しい Dashboard）では位置は無い.
    const d2 = make(store);
    expect(sunRuntime(d2).geo).toBeNull();
    setSunGeo(d2, null);
  });
});

describe('「都市を選ぶ」', () => {
  afterEach(() => { resetPermBrowser(); });
  it('押してもカードは場所が「現在地」の間は残り（お願い・断られたのどちらも）、都市を選ぶと閉じる', () => {
    fakePerms();
    const d = make();
    mount(d);
    d.setCfg('sun', 'loc', '現在地');
    permCover(d, 'sun')?.alt?.fn();
    expect(permAskOf(d, 'sun')).toEqual({ perm: 'geo', st: 'ask' });
    d.setCfg('sun', 'loc', '福岡');
    expect(permAskOf(d, 'sun')).toBeNull();
  });
});
