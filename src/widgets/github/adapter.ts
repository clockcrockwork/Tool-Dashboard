/**
 * GitHub PR の取得の境界（P4 で実際の取得に差し替える。トークンは保存も書き出しもしない）. 今は見本: 一定時間後に `sample.ts` の
 * 見本が「届いた」ことにするだけ（接続の点で見本と示す。実際に取得できたとは扱わない）。
 */
import { sampleAdapter, type SourceAdapter } from '../shared/source';
import type { Pr } from './github';
import { SAMPLE_PRS } from './sample';

export type GithubAdapter = SourceAdapter<readonly Pr[]>;

export function sampleGithub(ms = 1100): GithubAdapter {
  return sampleAdapter(() => SAMPLE_PRS, ms);
}
