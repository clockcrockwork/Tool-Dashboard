/**
 * RSS の取得の境界（P4 で実際のフィードの取得に差し替える）. 今は見本: 一定時間後に `sample.ts` の見本が「届いた」ことにするだけ
 * （接続の点で見本と示す。実際に取得できたとは扱わない）。購読しているフィードをまとめて取り、切替は取った中から選ぶ。
 */
import { sampleAdapter, type SourceAdapter } from './source';
import { sampleFeeds, type Feed } from './rss';

export type RssAdapter = SourceAdapter<Feed[]>;

export function sampleRss(ms = 1100): RssAdapter {
  return sampleAdapter(() => sampleFeeds(), ms);
}
