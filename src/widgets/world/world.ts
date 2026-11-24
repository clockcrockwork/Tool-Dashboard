/** 世界時計の計算 (prototype `wTime`, `world` in `renderVals()`). */

/** Cities shown, in order (prototype: fixed list; choosing cities is not in the design yet). */
export const WORLD_CITIES: readonly (readonly [name: string, zone: string])[] = [
  ['東京', 'Asia/Tokyo'],
  ['ロンドン', 'Europe/London'],
  ['ニューヨーク', 'America/New_York'],
];

/** `HH:MM` in `zone`; `--:--` when the zone is not known to this browser. */
export function zoneTime(now: Date, zone: string): string {
  try {
    return now.toLocaleTimeString('ja-JP', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export function worldRows(now: Date, cities = WORLD_CITIES): { n: string; t: string }[] {
  return cities.map(([n, zone]) => ({ n, t: zoneTime(now, zone) }));
}
