/**
 * RSS の一時状態（保存しない）: 5つの状態、取った内容（表示中だけ取得・更新。`source.ts`）、選んでいるフィード.
 * 選んでいるフィードはプロトタイプでも保存しない（`feed` は保存のキー `PK()` に無い）ので、配置ごとの runtime に置き、再読み込みで
 * 最初のフィードに戻る。部品が作り直されても（画面の移動・前面表示）同じ配置なら残る。
 * 開発用の表示テストからは `setRssState(d, 'err')` のように呼ぶ。
 */
import { reactive } from 'vue';
import { REGISTRY } from '../../app/registry/registry';
import type { Dashboard } from '../../app/store/store';
import { externalSource, type SourceState } from './source';
import { feedsEmpty, sampleFeeds, type Feed } from './rss';
import { sampleRss } from './adapter';

const every = REGISTRY.rss?.refresh?.every;
/** Freshness from the registry `refresh` (null until P4: the sample is not fetched again). */
export const RSS_REFRESH_MS: number | null = typeof every === 'number' ? every * 1000 : null;
export const RSS_KEY = 'feeds';

export const rssSource = externalSource<Feed[]>({ initial: () => sampleFeeds(), adapter: () => sampleRss(), refreshMs: RSS_REFRESH_MS, empty: feedsEmpty });

const picks = new WeakMap<Dashboard, Record<string, number>>();
function picksOf(d: Dashboard): Record<string, number> {
  let p = picks.get(d);
  if (!p) {
    p = reactive<Record<string, number>>({});
    picks.set(d, p);
  }
  return p;
}

/** The chosen feed of a placement (0 until one is chosen). */
export function rssFeedOf(d: Dashboard, id: string): number {
  return picksOf(d)[id] ?? 0;
}
export function setRssFeed(d: Dashboard, id: string, i: number): void {
  picksOf(d)[id] = i;
}

export const setRssState = (d: Dashboard, st: SourceState): void => { rssSource.setState(d, st); };
export const rssState = (d: Dashboard): SourceState => rssSource.state(d);
export const retryRss = (d: Dashboard, id: string): void => { rssSource.retry(d, id, RSS_KEY, { adapter: sampleRss(1400) }); };
