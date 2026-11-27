/**
 * 今日は何の日の取得の境界（P4 で実際の取得に差し替える）. 今は見本: 一定時間後に `sample.ts` の見本（11月17日分だけ）が
 * 「届いた」ことにするだけ（接続の点で見本と示す。実際に取得できたとは扱わない）。無い日は null。
 */
import { sampleAdapter, type SourceAdapter } from '../shared/source';
import { SAMPLE_DAYS } from './sample';

export type TodayAdapter = SourceAdapter<string | null>;

export const sampleDay = (key: string): string | null => SAMPLE_DAYS[key] ?? null;

export function sampleToday(ms = 1100): TodayAdapter {
  return sampleAdapter(sampleDay, ms);
}
