/**
 * 天気 (weather) — pure view computation, ported from prototype `renderVals()` (`wd`, `deg`, `stc`, `demoText`).
 * 段階表示 (仕様書 3章): 基本は常に、3時間ごとは縦2以上、週間は縦2以上かつ横3以上または縦3以上.
 */
import { iconPath } from '../../app/registry/icons';
import { hhmm } from '../shared/guards';
import { SAMPLE_HOURS, SAMPLE_HUM, SAMPLE_PARTS, SAMPLE_WEEK } from './sample';

export type WxIcon = 'sun' | 'cloud' | 'rain' | 'moon';
export const WX_ICON: Readonly<Record<WxIcon, readonly [label: string, d: string]>> = {
  sun: ['晴れ', iconPath('sun')],
  cloud: ['くもり', 'M7.5 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17.6 9.6 4.2 4.2 0 0 1 17 18z'],
  rain: ['雨', 'M8 15a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 18 8.5a3.2 3.2 0 0 1-.5 6.5zM9 18v2M13 18v2M17 18v2'],
  moon: ['晴れ（夜）', iconPath('moon')],
};

export type Tiers = { hours: boolean; week: boolean };
export type TierReady = Readonly<Partial<Record<keyof Tiers, boolean>>>;

/** Which tiers are shown, from the assigned cells (not the measured size). Unplaced → none. */
export function weatherTiers(cells: Readonly<{ w: number; h: number }>, off: boolean): Tiers {
  return {
    hours: !off && cells.h >= 2,
    week: !off && ((cells.h >= 2 && cells.w >= 3) || cells.h >= 3),
  };
}

/** `12°` or `54°` (°F). */
export function deg(c: number, unitF: boolean): string {
  return String(unitF ? Math.round(c * 9 / 5 + 32) : c) + '°';
}

export type WxCol = { l: string; a: string; d: string; t: string };
export type WxDay = { l: string; a: string; d: string; hi: string; lo: string };
export type WeatherView = {
  parts: WxCol[];
  hum: string;
  hoursWait: boolean;
  hoursOn: boolean;
  weekWait: boolean;
  weekOn: boolean;
  hours: WxCol[];
  week: WxDay[];
};

const DOWS = ['日', '月', '火', '水', '木', '金', '土'] as const;
const ic = (k: WxIcon): readonly [string, string] => WX_ICON[k];

export function weatherView(now: Date, unitF: boolean, tiers: Tiers, ready: TierReady): WeatherView {
  const hr = now.getHours();
  const h3 = Math.ceil((hr + 1) / 3) * 3;
  const hoursOn = tiers.hours && !!ready.hours;
  const weekOn = tiers.week && !!ready.week;
  return {
    parts: SAMPLE_PARTS.map(([l, k, c]) => ({ l, a: ic(k)[0], d: ic(k)[1], t: deg(c, unitF) })),
    hum: SAMPLE_HUM,
    hoursWait: tiers.hours && !ready.hours,
    hoursOn,
    weekWait: tiers.week && !ready.week,
    weekOn,
    hours: hoursOn ? SAMPLE_HOURS.map(([k, c], i) => ({ l: String((h3 + i * 3) % 24), a: ic(k)[0], d: ic(k)[1], t: deg(c, unitF) })) : [],
    week: weekOn ? SAMPLE_WEEK.map(([k, hi, lo], i) => ({
      l: i === 0 ? '今日' : DOWS[(now.getDay() + i) % 7] ?? '', a: ic(k)[0], d: ic(k)[1], hi: deg(hi, unitF), lo: deg(lo, unitF),
    })) : [],
  };
}

/** 5つの状態 (仕様書 3章「状態」). */
export type WxState = 'ok' | 'load' | 'stale' | 'empty' | 'err';
export const WX_STATES: readonly WxState[] = ['ok', 'load', 'stale', 'empty', 'err'];

export function stateClass(st: WxState): string {
  return ({ ok: '', load: 's-load', stale: 's-stale', empty: 's-empty', err: 's-err' } as const)[st];
}

/** [message, action label, sub line] for the state overlay `.sto .stm`. */
export function stateText(st: WxState, t: number): readonly [string, string, string] {
  if (st === 'empty') return ['まだ何もありません', '接続する', ''];
  if (st === 'err') return ['取得できませんでした', 'もう一度', '最終更新 ' + hhmm(t - 42 * 60000)];
  return ['', '', ''];
}
