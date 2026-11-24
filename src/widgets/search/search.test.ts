import { describe, expect, it } from 'vitest';
import { buildSearchUrl, isCustomUrl, newTabText, searchLabel } from './search';

describe('search', () => {
  it('names the input after the engine', () => {
    expect(searchLabel('Google', '')).toBe('Googleで検索');
    expect(searchLabel('Bing', '')).toBe('Bingで検索');
    expect(searchLabel('nope', '')).toBe('Googleで検索');
    expect(searchLabel('Bing', 'https://example.com/?q=%s')).toBe('検索');
  });
  it('builds engine URLs per scope (Web/画像/動画)', () => {
    expect(buildSearchUrl({ eng: 'Google', url: '', scope: 0, q: ' 天気 東京 ' })).toBe('https://www.google.com/search?q=%E5%A4%A9%E6%B0%97%20%E6%9D%B1%E4%BA%AC');
    expect(buildSearchUrl({ eng: 'Google', url: '', scope: 1, q: 'a' })).toBe('https://www.google.com/search?tbm=isch&q=a');
    expect(buildSearchUrl({ eng: 'Bing', url: '', scope: 2, q: 'a' })).toBe('https://www.bing.com/videos/search?q=a');
    expect(buildSearchUrl({ eng: 'DuckDuckGo', url: '', scope: 1, q: 'a' })).toBe('https://duckduckgo.com/?ia=images&iax=images&q=a');
    expect(buildSearchUrl({ eng: 'Yahoo!', url: '', scope: 0, q: 'a&b' })).toBe('https://search.yahoo.co.jp/search?p=a%26b');
  });
  it('custom URL replaces %s and ignores the scope', () => {
    expect(isCustomUrl('https://example.com/?q=%s')).toBe(true);
    expect(isCustomUrl('ftp://example.com/?q=%s')).toBe(false);
    expect(isCustomUrl('https://example.com/')).toBe(false);
    expect(buildSearchUrl({ eng: 'Bing', url: ' https://example.com/?q=%s ', scope: 2, q: 'x y' })).toBe('https://example.com/?q=x%20y');
  });
  it('empty query opens nothing', () => {
    expect(buildSearchUrl({ eng: 'Google', url: '', scope: 0, q: '   ' })).toBeNull();
  });
  it('new-tab toast text', () => {
    expect(newTabText('Bing', '', 1)).toBe('Bing の画像検索を新しいタブで開きます');
    expect(newTabText('Bing', 'https://e.com/%s', 1)).toBe('検索を新しいタブで開きます');
  });
});
