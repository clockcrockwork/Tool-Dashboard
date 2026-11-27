/**
 * 日の出・日の入り (sun) — 純粋な計算。プロトタイプ `sunAt()` と `renderVals()` の「日の出・日の入り」（`sunV`）を移した。
 * 仕様書 11章: NOAA の近似式で、天頂角 90.833°（日の出・日の入り）・96°（市民薄明）・84°（ゴールデンアワーの境）の3つを出す。
 * 場所の候補（東京・大阪・札幌・福岡・那覇）は日本時間、「現在地」は端末の時刻帯で計算する（その日の時差を使うので夏時間にも合う）。
 * 現在地の緯度・経度は小数2桁（約1km）に丸め、保存しない（`status.ts` の runtime）。使えないときは東京（日本時間）で出す。
 * 段階表示（仕様書 11章「大きさで足す情報」）: 2×1 は一文・時刻・24時間の帯、縦2以上で太陽の通り道と3つの数、縦3以上・大きく
 * 表示で7日間。小さいときは曲線と7日分を計算もしない。
 */
import { iconPath } from '../../app/registry/icons';
import type { AskCopy } from '../../app/runtime/permission';

export type LatLng = readonly [lat: number, lng: number];
/** Local hour of the day [0, 24), or the sun never rises / never sets that day. */
export type SunT = number | 'never' | 'always';
/** Hours from UTC at a moment (夏時間なら日によって変わる). */
export type TzOf = (utc: number) => number;

/** 場所の候補（設定「場所」の選択肢。プロトタイプ `sunPts`）. */
export const SUN_PLACES: Readonly<Record<string, LatLng>> = {
  '東京': [35.6895, 139.6917], '大阪': [34.6937, 135.5023], '札幌': [43.0618, 141.3545], '福岡': [33.5902, 130.4017], '那覇': [26.2124, 127.6809],
};
export const SUN_HERE = '現在地';
export const SUN_FALLBACK = '東京';
/** 日本時間（候補の都市はこれで計算する。日本に夏時間は無い）. */
export const JST: TzOf = () => 9;
/** 端末の時刻帯（その時刻の時差。夏時間を含む）. */
export const deviceTz: TzOf = utc => -new Date(utc).getTimezoneOffset() / 60;

const zoneFmt = new Map<string, Intl.DateTimeFormat>();
/** The offset of an IANA time zone at `utc` (tests, and a device whose zone name is known). */
export function zoneTz(zone: string): TzOf {
  return (utc) => {
    let f = zoneFmt.get(zone);
    if (!f) {
      f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
      zoneFmt.set(zone, f);
    }
    const p: Record<string, number> = {};
    for (const x of f.formatToParts(utc)) if (x.type !== 'literal') p[x.type] = Number(x.value);
    const wall = Date.UTC(p.year ?? 1970, (p.month ?? 1) - 1, p.day ?? 1, (p.hour ?? 0) % 24, p.minute ?? 0, p.second ?? 0);
    return Math.round((wall - Math.floor(utc / 1000) * 1000) / 60000) / 60;
  };
}

/** 緯度・経度を小数2桁（約1km）に丸める（仕様書 11章）. */
export function roundGeo(lat: number, lng: number): { lat: number; lng: number } {
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}

const RAD = Math.PI / 180;
const isN = (v: unknown): v is number => typeof v === 'number';

/**
 * NOAA の近似式（プロトタイプ `sunAt`）. `day`: その日（UTC の年月日を使う）. `zen`: 天頂角. `tz`: その日の時差（時間）.
 * Returns [rising, setting] as local hours, or 'never' (the sun stays below `zen`) / 'always' (stays above).
 */
export function sunAt(day: Date, ll: LatLng, zen: number, tz: number): readonly [SunT, SunT] {
  const N = Math.round((Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) - Date.UTC(day.getUTCFullYear(), 0, 0)) / 86400000);
  const lngH = ll[1] / 15;
  const one = (rising: boolean): SunT => {
    const t = N + ((rising ? 6 : 18) - lngH) / 24;
    const M = 0.9856 * t - 3.289;
    let Ls = M + 1.916 * Math.sin(M * RAD) + 0.020 * Math.sin(2 * M * RAD) + 282.634;
    Ls = ((Ls % 360) + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(Ls * RAD)) / RAD;
    RA = ((RA % 360) + 360) % 360;
    RA = (RA + Math.floor(Ls / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
    const sinD = 0.39782 * Math.sin(Ls * RAD), cosD = Math.cos(Math.asin(sinD));
    const cosH = (Math.cos(zen * RAD) - sinD * Math.sin(ll[0] * RAD)) / (cosD * Math.cos(ll[0] * RAD));
    if (cosH > 1) return 'never';
    if (cosH < -1) return 'always';
    const H = (rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    return (((T - lngH + tz) % 24) + 24) % 24;
  };
  return [one(true), one(false)];
}

/** One day: sunrise/sunset (r), civil twilight (c), golden-hour edges (g). */
export type SunDay = Readonly<{ r0: SunT; r1: SunT; c0: SunT; c1: SunT; g0: SunT; g1: SunT }>;

export function sunDay(day: Date, ll: LatLng, tz: number): SunDay {
  const r = sunAt(day, ll, 90.833, tz), c = sunAt(day, ll, 96, tz), g = sunAt(day, ll, 84, tz);
  return { r0: r[0], r1: r[1], c0: c[0], c1: c[1], g0: g[0], g1: g[1] };
}

/** `6:19` (prototype `hmF`); `—` when there is none. */
export function hmF(h: SunT): string {
  if (!isN(h)) return '—';
  const m = Math.round(h * 60) % 1440;
  return String(Math.floor(m / 60)) + ':' + String(m % 60).padStart(2, '0');
}
/** `6時19分` for reading out (prototype `jpT`); `なし`. */
export function jpT(h: SunT): string {
  if (!isN(h)) return 'なし';
  const m = Math.round(h * 60) % 1440;
  return String(Math.floor(m / 60)) + '時' + String(m % 60) + '分';
}
/** `1時間57分` / `45分` / `10時間` (prototype `durF`). */
export function durF(mn: number): string {
  const m = Math.max(0, Math.round(mn));
  return m < 60 ? String(m) + '分' : String(Math.floor(m / 60)) + '時間' + (m % 60 ? String(m % 60) + '分' : '');
}

/** The 0–24 h band: night `--fill2`, twilight `--sun-t`, day `--sun-d`; one colour in polar day / night (prototype `bandOf`). */
export function bandOf(x: SunDay): string {
  if (!isN(x.r0) || !isN(x.r1)) return x.r0 === 'always' ? 'var(--sun-d)' : 'var(--fill2)';
  const pc = (h: number): string => (Math.max(0, Math.min(24, h)) / 24 * 100).toFixed(2) + '%';
  const c0 = isN(x.c0) ? x.c0 : x.r0, c1 = isN(x.c1) ? x.c1 : x.r1;
  return 'linear-gradient(90deg, var(--fill2) 0 ' + pc(c0) + ', var(--sun-t) ' + pc(c0) + ' ' + pc(x.r0) + ', var(--sun-d) ' + pc(x.r0) + ' ' + pc(x.r1) + ', var(--sun-t) ' + pc(x.r1) + ' ' + pc(c1) + ', var(--fill2) ' + pc(c1) + ' 100%)';
}

/** Day length in minutes (1440 in polar day, 0 in polar night). */
const lenOf = (x: SunDay): number => (isN(x.r0) && isN(x.r1) ? (x.r1 - x.r0) * 60 : (x.r0 === 'always' ? 1440 : 0));

export type SunTiers = Readonly<{ t2: boolean; t3: boolean }>;

/**
 * Tiers from the size the widget has now (prototype `szOf('sun')`): the front view counts as 6×6 and as 大きく表示 (both
 * tiers); temporary use has the temporary-use size; otherwise the assigned cells (the default size when unplaced).
 */
export function sunTiers(cells: Readonly<{ w: number; h: number }>, big: boolean, temp: boolean): SunTiers {
  const h = big && !temp ? 6 : cells.h;
  return { t2: h >= 2, t3: h >= 3 || (big && !temp) };
}

/** Where to compute: the coordinates, the time zone and the name shown on the place line. */
export type SunWhere = Readonly<{ ll: LatLng; tz: TzOf; name: string }>;

/**
 * The place for the setting 「場所」 and the current position (null until it is known). 現在地 without a position is
 * Tokyo in Japan time, shown as 「現在地（取得するまで東京）」.
 */
export function sunWhere(loc: unknown, geo: Readonly<{ lat: number; lng: number }> | null, tz: TzOf = deviceTz): SunWhere {
  const tokyo = SUN_PLACES[SUN_FALLBACK] ?? [35.6895, 139.6917];
  if (loc === SUN_HERE) {
    return geo ? { ll: [geo.lat, geo.lng], tz, name: SUN_HERE } : { ll: tokyo, tz: JST, name: '現在地（取得するまで' + SUN_FALLBACK + '）' };
  }
  const name = typeof loc === 'string' && SUN_PLACES[loc] ? loc : SUN_FALLBACK;
  return { ll: SUN_PLACES[name] ?? tokyo, tz: JST, name };
}

export type SunStat = { l: string; v: string; s: string };
export type SunWeekDay = { l: string; band: string; r: string; s: string };
export type SunView = {
  head: string; sub: string; icon: string; band: string; nowL: string; label: string;
  t2: boolean; t3: boolean; stats: SunStat[]; week: SunWeekDay[]; place: string; arcLabel: string;
  aAll: string; aUp: string; aHy: string; aCx: string; aCy: string; aDot: string; aRx: string; aSx: string; aTy: string; aRt: string; aSt: string;
};

const DOWS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export const IC_RISE = 'M3 18.5h18M7 18.5a5 5 0 0 1 10 0M12 3.5V10M9 6.5l3-3 3 3M4.6 12.6l1.4 1.4M19.4 12.6L18 14';
export const IC_SET = 'M3 18.5h18M7 18.5a5 5 0 0 1 10 0M12 3.5V10M9 7l3 3 3-3M4.6 12.6l1.4 1.4M19.4 12.6L18 14';
const DAY = 86400000;

/** Port of the prototype `sunV`. `now` is the current time (ms). */
export function sunView(now: number, where: SunWhere, tiers: SunTiers): SunView {
  const tz0 = where.tz(now);
  const n = new Date(now);
  const sunH = (((n.getUTCHours() + n.getUTCMinutes() / 60 + tz0) % 24) + 24) % 24;
  const loc0 = new Date(now + tz0 * 3600000);
  const sd0 = Date.UTC(loc0.getUTCFullYear(), loc0.getUTCMonth(), loc0.getUTCDate(), 12);
  /** The day at noon UTC of its local date, with that day's offset (夏時間の切り替わりをまたぐ7日間). */
  const sunOf = (t: number): SunDay => sunDay(new Date(t), where.ll, where.tz(t - where.tz(t) * 3600000));
  const sT = sunOf(sd0), sN = sunOf(sd0 + DAY);
  const sY = tiers.t2 ? sunOf(sd0 - DAY) : null;
  const ok = isN(sT.r0) && isN(sT.r1);
  const day = ok ? sunH >= (sT.r0) && sunH < (sT.r1) : sT.r0 === 'always';
  let head: string, sub: string, icon: string;
  if (!isN(sT.r0) || !isN(sT.r1)) {
    head = sT.r0 === 'always' ? '一日中沈みません' : '一日中昇りません'; sub = '白夜・極夜の時期です'; icon = iconPath('sun');
  } else if (day) {
    head = '日の入りまで ' + durF((sT.r1 - sunH) * 60); sub = '日の出 ' + hmF(sT.r0) + '　日の入り ' + hmF(sT.r1); icon = IC_SET;
  } else if (sunH < sT.r0) {
    head = '日の出まで ' + durF((sT.r0 - sunH) * 60); sub = '日の出 ' + hmF(sT.r0) + '　日の入り ' + hmF(sT.r1); icon = IC_RISE;
  } else {
    const nr = isN(sN.r0) ? sN.r0 : sT.r0;
    head = '日の出まで ' + durF((24 - sunH + nr) * 60); sub = '日の入り ' + hmF(sT.r1) + '　明日の日の出 ' + hmF(nr); icon = IC_RISE;
  }
  const inTw = (a: SunT, b: SunT): boolean => isN(a) && isN(b) && sunH >= a && sunH < b;
  const phase = day ? '昼' : (inTw(sT.c0, sT.r0) || inTw(sT.r1, sT.c1) ? '薄明' : '夜');
  const len = lenOf(sT);
  const arc = { aAll: '', aUp: '', aHy: '0', aCx: '0', aCy: '0', aDot: 'none', aRx: '0', aSx: '0', aTy: '0', aRt: '', aSt: '' };
  let stats: SunStat[] = [];
  if (tiers.t2 && isN(sT.r0) && isN(sT.r1)) {
    const r0 = sT.r0, r1 = sT.r1;
    const noon = (r0 + r1) / 2;
    const yAt = (h: number): number => 44 - 30 * Math.cos((h - noon) / 24 * 2 * Math.PI);
    const xAt = (h: number): number => h / 24 * 240;
    const pt = (h: number, k: number): string => (k ? 'L' : 'M') + xAt(h).toFixed(1) + ' ' + yAt(h).toFixed(1);
    const all: number[] = [], up: number[] = [];
    for (let h = 0; h <= 24.001; h += 0.25) all.push(h);
    for (let h = r0; h < r1; h += 0.25) up.push(h);
    up.push(r1);
    const hy = yAt(r1);
    const lx = (h: number): string => Math.max(16, Math.min(224, xAt(h))).toFixed(1);
    Object.assign(arc, {
      aAll: all.map(pt).join(''), aUp: up.map(pt).join(''), aHy: hy.toFixed(1),
      aCx: xAt(sunH).toFixed(1), aCy: yAt(sunH).toFixed(1), aDot: day ? 'var(--sun-d)' : 'var(--bg)',
      aRx: lx(r0), aSx: lx(r1), aTy: Math.min(82, hy + 15).toFixed(1), aRt: hmF(r0), aSt: hmF(r1),
    });
    const dl = Math.round(len - (sY ? lenOf(sY) : 0));
    const c1 = isN(sT.c1) ? sT.c1 : r1;
    const tw: readonly [SunT, SunT, string, string] = sunH < r0 ? [sT.c0, r0, '朝の薄明', '今日'] : (sunH < c1 ? [r1, sT.c1, '夕方の薄明', '今日'] : [sN.c0, sN.r0, '朝の薄明', '明日']);
    const g0 = isN(sT.g0) ? sT.g0 : r0;
    const gd: readonly [SunT, SunT, string] = sunH < g0 ? [r0, sT.g0, '今日の朝'] : (sunH < r1 ? [sT.g1, r1, '今日の夕方'] : [sN.r0, sN.g0, '明日の朝']);
    stats = [
      { l: '昼の長さ', v: durF(len), s: dl === 0 ? '昨日とほぼ同じ' : '昨日より' + (dl > 0 ? '+' : '−') + String(Math.abs(dl)) + '分' },
      { l: tw[2], v: hmF(tw[0]) + '–' + hmF(tw[1]), s: tw[3] },
      { l: 'ゴールデンアワー', v: hmF(gd[0]) + '–' + hmF(gd[1]), s: gd[2] },
    ];
  }
  const week: SunWeekDay[] = tiers.t3 ? Array.from({ length: 7 }, (_v, i) => {
    const t = sd0 + i * DAY;
    const x = i === 0 ? sT : (i === 1 ? sN : sunOf(t));
    return { l: i === 0 ? '今日' : DOWS[new Date(t).getUTCDay()] ?? '', band: bandOf(x), r: hmF(x.r0), s: hmF(x.r1) };
  }) : [];
  return {
    head, sub, icon, band: bandOf(sT), nowL: (sunH / 24 * 100).toFixed(2) + '%',
    label: '日の出 ' + jpT(sT.r0) + '、日の入り ' + jpT(sT.r1) + '、昼の長さ ' + durF(len) + '。いまは' + phase,
    t2: tiers.t2 && ok, t3: tiers.t3, stats, week,
    place: where.name + '・今日',
    arcLabel: '一日の太陽の高さ。いまは' + phase + '、地平線の' + (day ? '上' : '下'),
    ...arc,
  };
}

/**
 * 現在地の許可のお願いの文（プロトタイプ `pq.sun`。`src/app/runtime/permission.ts` から移した）. 「都市を選ぶ」は `alt`・`noAlt` に
 * 場所の選択メニューを渡す。断られたときの文の後ろは、いま代わりに出している都市（既定の東京）。
 */
export const SUN_GEO_ASK = (city = SUN_FALLBACK): AskCopy => ({
  title: '現在地を使いますか？', text: '位置は端末の外に送りません', ok: '位置を使う', alt: '都市を選ぶ',
  noText: 'アドレスバー左のボタンで許可できます。いまは' + city + 'で表示中', noAlt: '都市を選ぶ',
});
/** 位置情報を使えなかったとき（断られた・取得できない）のトースト（仕様書 11章「東京で表示し、トーストで知らせます」）. */
export const SUN_GEO_FAIL = '現在地を使えません。' + SUN_FALLBACK + 'で表示しています';
