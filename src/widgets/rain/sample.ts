/** 見本データ: この先12時間の1時間ごとの降水量 (mm). 設定「サンプル」で選ぶ (prototype `rainSets`). */
export const RAIN_SETS: Readonly<Record<string, readonly number[]>> = {
  'あとで降る': [0, 0, 0, 0.4, 1.2, 2, 0.8, 0.2, 0, 0, 0, 0],
  'いま雨': [1.4, 2.2, 1, 0.3, 0, 0, 0, 0, 0, 0, 0, 0],
  '降らない': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};
export const RAIN_DEFAULT = 'あとで降る';

export function rainSample(name: unknown): readonly number[] {
  return (typeof name === 'string' ? RAIN_SETS[name] : undefined) ?? RAIN_SETS[RAIN_DEFAULT] ?? [];
}
