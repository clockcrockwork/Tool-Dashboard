import { describe, expect, it } from 'vitest';
import { effectScope } from 'vue';
import { Dashboard } from '../../app/store/store';
import { GLOBAL_KEY, memoryStore, widgetKey } from '../../app/store/persist';
import { feedIndex, feedsEmpty, rssView, sampleFeeds } from './rss';
import { RSS_REFRESH_MS, rssFeedOf, rssSource, setRssFeed } from './status';

describe('rssView（プロトタイプ `feeds`・`feedItems`）', () => {
  const feeds = sampleFeeds();
  it('見本: Dev・Design・Tools、最初は Dev の4行と経過', () => {
    const v = rssView(feeds, 0);
    expect(v.feeds).toEqual([{ name: 'Dev', on: true, cls: 'on' }, { name: 'Design', on: false, cls: '' }, { name: 'Tools', on: false, cls: '' }]);
    expect(v.items).toEqual([
      { t: 'View Transitions 実践メモ', m: '2h' }, { t: 'CSS anchor positioning 入門', m: '5h' },
      { t: 'Node.js キュー設計の基本', m: '昨日' }, { t: 'SQLite をエッジで使う', m: '2日前' },
    ]);
  });
  it('切替で選んだフィードの行', () => {
    expect(rssView(feeds, 1).items[0]?.t).toBe('ガラス表現と可読性');
    expect(rssView(feeds, 1).feeds[1]?.on).toBe(true);
  });
  it('範囲外・不正な選択は最初のフィード。フィードが無ければ行も無い', () => {
    expect(feedIndex(feeds, 7)).toBe(0);
    expect(feedIndex(feeds, -1)).toBe(0);
    expect(feedIndex(feeds, 1.5)).toBe(0);
    expect(rssView([], 0)).toEqual({ feeds: [], items: [] });
    expect(feedsEmpty([])).toBe(true);
    expect(feedsEmpty([{ name: 'x', items: [] }])).toBe(true);
    expect(feedsEmpty(feeds)).toBe(false);
  });
});

describe('選んでいるフィードは保存しない（プロトタイプも保存しない）', () => {
  it('配置ごとの runtime にだけあり、区画に書かれない。別の配置・別の Dashboard と混ざらない', () => {
    const store = memoryStore();
    const d = new Dashboard({ store, dataDefs: {}, now: () => 0, setTimeout: () => 0 });
    const scope = effectScope();
    scope.run(() => d.start());
    setRssFeed(d, 'rss', 2);
    expect(rssFeedOf(d, 'rss')).toBe(2);
    expect(rssFeedOf(d, 'rss#2')).toBe(0);
    const d2 = new Dashboard({ store, dataDefs: {}, now: () => 0, setTimeout: () => 0 });
    expect(rssFeedOf(d2, 'rss')).toBe(0);
    expect(String(store.get(widgetKey('rss'))) + String(store.get(GLOBAL_KEY))).not.toMatch(/feed|"sel"/);
    expect(d.exportJson()).not.toContain('feed');
    scope.stop();
  });
  it('更新の間隔は登録の refresh から（P4 まで null）', () => {
    expect(RSS_REFRESH_MS).toBeNull();
    expect(rssSource.place(new Dashboard({ store: memoryStore(), dataDefs: {} }), 'rss', 'feeds').val).toEqual(sampleFeeds());
  });
});
