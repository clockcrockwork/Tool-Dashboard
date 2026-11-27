/**
 * 日の出・日の入りの計算（仕様書 11章）: 既知の日付・場所の日の出・日の入りが1分程度で合う、白夜・極夜、夏時間のある時刻帯、
 * 段階表示（小さいときは曲線と7日分を計算しない）、場所（現在地は取得するまで東京・日本時間）.
 */
import { describe, expect, it } from 'vitest';
import {
  IC_RISE, IC_SET, JST, SUN_GEO_ASK, SUN_PLACES, bandOf, durF, hmF, jpT, roundGeo, sunAt, sunDay, sunTiers, sunView, sunWhere, zoneTz,
  type LatLng, type SunT,
} from './sun';
import { iconPath } from '../../app/registry/icons';

const TOKYO = SUN_PLACES['東京'] as LatLng;
const NY: LatLng = [40.7128, -74.006];
const LONDON: LatLng = [51.5074, -0.1278];
const TROMSO: LatLng = [69.6492, 18.9553];
const noon = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d, 12));
/** `h:mm` → hours. */
const hm = (s: string): number => { const [h, m] = s.split(':').map(Number); return (h ?? 0) + (m ?? 0) / 60; };
/** Within `min` minutes of the published time. */
const near = (t: SunT, want: string, min = 1.5): void => {
  expect(typeof t).toBe('number');
  expect(Math.abs((t as number) - hm(want)) * 60).toBeLessThanOrEqual(min);
};

describe('sunAt: 既知の日の出・日の入りと1分程度で合う（NOAA の近似式）', () => {
  // 国立天文台（東京）と timeanddate.com（ニューヨーク・ロンドン）の公表値.
  const KNOWN: readonly (readonly [string, LatLng, Date, number, string, string])[] = [
    ['東京 夏至', TOKYO, noon(2024, 6, 21), 9, '4:25', '19:00'],
    ['東京 冬至', TOKYO, noon(2024, 12, 21), 9, '6:47', '16:32'],
    ['ニューヨーク 夏（EDT -4）', NY, noon(2024, 7, 4), -4, '5:30', '20:31'],
    ['ニューヨーク 冬（EST -5）', NY, noon(2024, 1, 15), -5, '7:18', '16:54'],
    ['ロンドン 夏至（BST +1）', LONDON, noon(2024, 6, 21), 1, '4:43', '21:21'],
  ];
  for (const [name, ll, day, tz, rise, set] of KNOWN) {
    it(name, () => {
      const [r, s] = sunAt(day, ll, 90.833, tz);
      near(r, rise);
      near(s, set);
    });
  }

  it('部品シートの見本（東京 2026-11-19）: 日の出 6:20・日の入り 16:32、帯の段の位置も同じ', () => {
    const x = sunDay(noon(2026, 11, 19), TOKYO, 9);
    expect([hmF(x.r0), hmF(x.r1)]).toEqual(['6:20', '16:32']);
    expect(bandOf(x)).toBe('linear-gradient(90deg, var(--fill2) 0 24.51%, var(--sun-t) 24.51% 26.41%, var(--sun-d) 26.41% 68.92%, var(--sun-t) 68.92% 70.82%, var(--fill2) 70.82% 100%)');
  });

  it('薄明（96°）は日の出の前・日の入りの後、ゴールデンアワーの境（84°）は日の出の後・日の入りの前', () => {
    const x = sunDay(noon(2026, 11, 19), TOKYO, 9);
    const n = (v: SunT): number => v as number;
    expect(n(x.c0)).toBeLessThan(n(x.r0));
    expect(n(x.g0)).toBeGreaterThan(n(x.r0));
    expect(n(x.g1)).toBeLessThan(n(x.r1));
    expect(n(x.c1)).toBeGreaterThan(n(x.r1));
    // 東京の11月の市民薄明はおよそ27〜28分.
    expect((n(x.r0) - n(x.c0)) * 60).toBeGreaterThan(24);
    expect((n(x.r0) - n(x.c0)) * 60).toBeLessThan(32);
  });
});

describe('白夜・極夜', () => {
  it('トロムソの夏至は一日中沈まない（always）、冬至は一日中昇らない（never）', () => {
    expect(sunAt(noon(2024, 6, 21), TROMSO, 90.833, 2)).toEqual(['always', 'always']);
    expect(sunAt(noon(2024, 12, 21), TROMSO, 90.833, 1)).toEqual(['never', 'never']);
  });
  it('一文を「一日中沈みません」「一日中昇りません」にし、帯を1色にする。曲線と3つの数は出さない', () => {
    const at = (iso: string, tz: number): ReturnType<typeof sunView> => sunView(Date.parse(iso), { ll: TROMSO, tz: () => tz, name: 'トロムソ' }, { t2: true, t3: true });
    const summer = at('2024-06-21T12:00:00Z', 2);
    expect(summer).toMatchObject({ head: '一日中沈みません', sub: '白夜・極夜の時期です', icon: iconPath('sun'), band: 'var(--sun-d)', t2: false, stats: [] });
    expect(summer.label).toBe('日の出 なし、日の入り なし、昼の長さ 24時間。いまは昼');
    const winter = at('2024-12-21T12:00:00Z', 1);
    expect(winter).toMatchObject({ head: '一日中昇りません', band: 'var(--fill2)', t2: false });
    expect(winter.label).toContain('いまは夜');
    expect(winter.week).toHaveLength(7);
    expect(winter.week[0]).toMatchObject({ l: '今日', r: '—', s: '—', band: 'var(--fill2)' });
  });
});

describe('時刻帯と夏時間', () => {
  const nyTz = zoneTz('America/New_York');
  it('zoneTz: ニューヨークは3月の切り替わりで -5 → -4、11月で -4 → -5', () => {
    expect(nyTz(Date.UTC(2026, 2, 7, 17))).toBe(-5);
    expect(nyTz(Date.UTC(2026, 2, 9, 17))).toBe(-4);
    expect(nyTz(Date.UTC(2026, 10, 1, 4))).toBe(-4);
    expect(nyTz(Date.UTC(2026, 10, 2, 17))).toBe(-5);
    expect(zoneTz('Asia/Tokyo')(Date.UTC(2026, 6, 1))).toBe(9);
    expect(zoneTz('Asia/Kolkata')(Date.UTC(2026, 6, 1))).toBe(5.5);
  });
  it('現在地（夏時間のある時刻帯）: その日の時差で計算する。7日間が切り替わりをまたいでも各日が合う', () => {
    // 2026-03-05 朝のニューヨーク。7日間の 3/8 から EDT.
    const v = sunView(Date.parse('2026-03-05T14:00:00Z'), { ll: NY, tz: nyTz, name: '現在地' }, { t2: false, t3: true });
    expect(v.week.map(x => x.l)).toEqual(['今日', '金', '土', '日', '月', '火', '水']);
    const before = v.week[2], after = v.week[3];
    // 3/7（EST）日の出 6:20 ごろ、3/8（EDT）7:18 ごろ: 時計が1時間進むので日の出も約1時間遅く見える.
    expect(hm(after?.r ?? '') - hm(before?.r ?? '')).toBeGreaterThan(0.9);
    expect(hm(after?.r ?? '') - hm(before?.r ?? '')).toBeLessThan(1.0);
    near(hm(before?.r ?? ''), '6:20', 2);
    near(hm(after?.r ?? ''), '7:18', 2);
  });
  it('「今日」はその場所の日付（日本時間の 0:30 は、UTC ではまだ前の日）', () => {
    const t = Date.parse('2026-11-19T00:30:00+09:00');
    const v = sunView(t, sunWhere('東京', null), { t2: false, t3: true });
    expect(v.week[0]?.r).toBe('6:20');
    expect(v.week[1]?.l).toBe('金');
    expect(v.head).toBe('日の出まで 5時間50分');
    expect(v.sub).toBe('日の出 6:20　日の入り 16:32');
    expect(v.icon).toBe(IC_RISE);
  });
});

describe('sunView（プロトタイプ `sunV`）', () => {
  const NOW = Date.parse('2026-11-19T10:24:36+09:00');
  it('2×1（昼）: 日の入りまでの残り・時刻・帯・今の位置・読み上げ。曲線と7日分は計算しない', () => {
    const v = sunView(NOW, sunWhere('東京', null), sunTiers({ w: 2, h: 1 }, false, false));
    expect(v).toMatchObject({
      head: '日の入りまで 6時間8分', sub: '日の出 6:20　日の入り 16:32', icon: IC_SET, nowL: '43.33%', t2: false, t3: false,
      label: '日の出 6時20分、日の入り 16時32分、昼の長さ 10時間12分。いまは昼', place: '東京・今日', stats: [], week: [], aAll: '',
    });
  });
  it('縦2: 太陽の通り道と、昼の長さ（昨日との差）・次の薄明・次のゴールデンアワー', () => {
    const v = sunView(NOW, sunWhere('東京', null), sunTiers({ w: 2, h: 2 }, false, false));
    expect(v.t2).toBe(true);
    expect(v.t3).toBe(false);
    expect(v.stats).toEqual([
      { l: '昼の長さ', v: '10時間12分', s: '昨日より−2分' },
      { l: '夕方の薄明', v: '16:32–17:00', s: '今日' },
      { l: 'ゴールデンアワー', v: '15:55–16:32', s: '今日の夕方' },
    ]);
    expect(v.aAll.startsWith('M0.0 ')).toBe(true);
    expect(v.aUp.startsWith('M')).toBe(true);
    expect(v).toMatchObject({ aDot: 'var(--sun-d)', aRt: '6:20', aSt: '16:32', arcLabel: '一日の太陽の高さ。いまは昼、地平線の上' });
    expect(v.week).toEqual([]);
  });
  it('縦3・大きく表示: 7日間（今日・曜日）', () => {
    const v = sunView(NOW, sunWhere('大阪', null), sunTiers({ w: 2, h: 1 }, true, false));
    expect(v.t3).toBe(true);
    expect(v.week.map(x => x.l)).toEqual(['今日', '金', '土', '日', '月', '火', '水']);
    expect(v.place).toBe('大阪・今日');
  });
  it('日の入りの後は「明日の日の出」、日の出の前の薄明は「薄明」', () => {
    const night = sunView(Date.parse('2026-11-19T20:00:00+09:00'), sunWhere('東京', null), { t2: true, t3: false });
    expect(night.head).toMatch(/^日の出まで 10時間2[0-9]分$/);
    expect(night.sub).toBe('日の入り 16:32　明日の日の出 6:21');
    expect(night.stats[1]).toMatchObject({ l: '朝の薄明', s: '明日' });
    expect(night.stats[2]).toMatchObject({ l: 'ゴールデンアワー', s: '明日の朝' });
    expect(night.aDot).toBe('var(--bg)');
    const dawn = sunView(Date.parse('2026-11-19T06:05:00+09:00'), sunWhere('東京', null), { t2: false, t3: false });
    expect(dawn.label).toContain('いまは薄明');
  });
});

describe('場所', () => {
  it('候補の都市は日本時間。知らない値は東京', () => {
    expect(sunWhere('札幌', null)).toMatchObject({ ll: SUN_PLACES['札幌'], name: '札幌' });
    expect(sunWhere('札幌', null).tz).toBe(JST);
    expect(sunWhere('ベルリン', null).name).toBe('東京');
    expect(sunWhere(42, null).name).toBe('東京');
  });
  it('現在地: 取得するまでは東京（日本時間）、取得したら端末の時刻帯', () => {
    expect(sunWhere('現在地', null)).toMatchObject({ ll: TOKYO, name: '現在地（取得するまで東京）' });
    const tz = (): number => -4;
    expect(sunWhere('現在地', { lat: 40.71, lng: -74.01 }, tz)).toEqual({ ll: [40.71, -74.01], tz, name: '現在地' });
  });
  it('緯度・経度は小数2桁に丸める', () => {
    expect(roundGeo(35.689512, 139.691749)).toEqual({ lat: 35.69, lng: 139.69 });
    expect(roundGeo(-33.86785, 151.20732)).toEqual({ lat: -33.87, lng: 151.21 });
  });
});

describe('書式と段', () => {
  it('hmF / jpT / durF', () => {
    expect(hmF(6.3333)).toBe('6:20');
    expect(hmF(23.999)).toBe('0:00');
    expect(hmF('never')).toBe('—');
    expect(jpT(16.5333)).toBe('16時32分');
    expect(jpT('always')).toBe('なし');
    expect(durF(45)).toBe('45分');
    expect(durF(600)).toBe('10時間');
    expect(durF(612.4)).toBe('10時間12分');
    expect(durF(-3)).toBe('0分');
  });
  it('sunTiers: 縦2で通り道、縦3で7日間。前面表示（一時利用でない）は両方、一時利用はその大きさ', () => {
    expect(sunTiers({ w: 2, h: 1 }, false, false)).toEqual({ t2: false, t3: false });
    expect(sunTiers({ w: 2, h: 2 }, false, false)).toEqual({ t2: true, t3: false });
    expect(sunTiers({ w: 2, h: 3 }, false, false)).toEqual({ t2: true, t3: true });
    expect(sunTiers({ w: 2, h: 1 }, true, false)).toEqual({ t2: true, t3: true });
    expect(sunTiers({ w: 2, h: 1 }, true, true)).toEqual({ t2: false, t3: false });
  });
  it('許可のお願いの文: 「位置を使う」「都市を選ぶ」、断られたら代わりの都市', () => {
    expect(SUN_GEO_ASK()).toMatchObject({ title: '現在地を使いますか？', ok: '位置を使う', alt: '都市を選ぶ', noAlt: '都市を選ぶ' });
    expect(SUN_GEO_ASK().noText).toBe('アドレスバー左のボタンで許可できます。いまは東京で表示中');
  });
});
