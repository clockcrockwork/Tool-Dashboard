/**
 * 傘 (rain) — 見出し・補足・12本の棒 (仕様書 3章「情報が多い道具の見せ方（傘の例）」). Port of prototype `wx`.
 * 「降っている」は1時間あたり0.1mm超.
 */
export const UMBRELLA_D = 'M12 3.5a8.5 8.5 0 0 1 8.5 8.5h-17A8.5 8.5 0 0 1 12 3.5zM12 12v6.5a2 2 0 0 1-4 0';
export const FAIR_D = 'M8 19a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 18 11.5a3.75 3.75 0 0 1-.5 7.5zM12 2.5v2M4.9 5.4l1.4 1.4M19.1 5.4l-1.4 1.4';

export type RainBar = { h: string; c: string };
export type RainView = { head: string; sub: string; label: string; icon: string; bars: RainBar[] };

export const wet = (v: number): boolean => v > 0.1;

/** `rain[i]` is the amount for the hour starting `hr + i`. */
export function rainView(rain: readonly number[], hr: number): RainView {
  const hourAt = (i: number): string => String((hr + i) % 24) + '時ごろ';
  const rainAt = rain.findIndex(wet);
  let head = '傘はいりません';
  let sub = 'この先12時間は降らない見込み';
  if (wet(rain[0] ?? 0)) {
    const stop = rain.findIndex(v => !wet(v));
    head = 'いま雨が降っています';
    sub = stop < 0 ? '12時間以上続く見込み' : 'あと約' + String(stop) + '時間、' + hourAt(stop) + 'に止む';
  } else if (rainAt > 0) {
    let stop = -1;
    for (let i = rainAt; i < rain.length; i++) if (!wet(rain[i] ?? 0)) { stop = i; break; }
    head = '傘がいります';
    sub = '約' + String(rainAt) + '時間後、' + hourAt(rainAt) + 'に降り始め' + (stop > 0 ? '・' + hourAt(stop) + 'に止む' : '');
  }
  const max = Math.max(...rain, 2);
  return {
    head, sub, label: head + '。' + sub,
    icon: rainAt >= 0 ? UMBRELLA_D : FAIR_D,
    bars: rain.map(v => ({ h: wet(v) ? String(Math.max(30, v / max * 100)) + '%' : '3px', c: wet(v) ? 'var(--c1)' : 'var(--fill2)' })),
  };
}
