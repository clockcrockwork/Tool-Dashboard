/**
 * RSS (rss) — 純粋な表示の計算. プロトタイプ `renderVals()` の `feeds`・`feedItems` を移した。
 * 仕様書 3章「スクロール」: 上部に切替がある中身は横送りにせず、切替でフィードを選び、選んだ中を縦に送る。
 */
import { SAMPLE_AGO, SAMPLE_FEEDS } from './sample';

export type FeedItem = Readonly<{ t: string; m: string }>;
export type Feed = Readonly<{ name: string; items: readonly FeedItem[] }>;

/** The sample feeds as fetched content. */
export function sampleFeeds(): Feed[] {
  return SAMPLE_FEEDS.map(f => ({ name: f.name, items: f.items.map((t, i) => ({ t, m: SAMPLE_AGO[i] ?? '' })) }));
}

/** The chosen feed, kept inside the list (an index out of range picks the first). */
export function feedIndex(feeds: readonly Feed[], sel: number): number {
  return Number.isInteger(sel) && sel >= 0 && sel < feeds.length ? sel : 0;
}

export type RssChip = { name: string; on: boolean; cls: string };
export type RssView = { feeds: RssChip[]; items: readonly FeedItem[] };

export function rssView(feeds: readonly Feed[], sel: number): RssView {
  const i = feedIndex(feeds, sel);
  return {
    feeds: feeds.map((f, j) => ({ name: f.name, on: j === i, cls: j === i ? 'on' : '' })),
    items: feeds[i]?.items ?? [],
  };
}

/** No feed or no item in any feed (→ 空). */
export const feedsEmpty = (feeds: readonly Feed[]): boolean => !feeds.some(f => f.items.length > 0);
