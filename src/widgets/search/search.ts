/**
 * 検索 (search) — 検索URLの組み立て (prototype `searchKey`, `srchPh`, `engCustom`).
 * 独自の検索URL（%s が検索語）を入れると検索対象の切替を隠す.
 */
export const SCOPE_NAMES = ['Web', '画像', '動画'] as const;
export type Engine = 'Google' | 'Bing' | 'DuckDuckGo' | 'Yahoo!';

const URLS: Readonly<Record<Engine, readonly [string, string, string]>> = {
  Google: ['https://www.google.com/search?q=', 'https://www.google.com/search?tbm=isch&q=', 'https://www.google.com/search?tbm=vid&q='],
  Bing: ['https://www.bing.com/search?q=', 'https://www.bing.com/images/search?q=', 'https://www.bing.com/videos/search?q='],
  DuckDuckGo: ['https://duckduckgo.com/?q=', 'https://duckduckgo.com/?ia=images&iax=images&q=', 'https://duckduckgo.com/?ia=videos&iax=videos&q='],
  'Yahoo!': ['https://search.yahoo.co.jp/search?p=', 'https://search.yahoo.co.jp/image/search?p=', 'https://search.yahoo.co.jp/video/search?p='],
};

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function engineOf(v: unknown): Engine {
  return typeof v === 'string' && v in URLS ? (v as Engine) : 'Google';
}

/** A custom URL counts only when it is http(s) and contains `%s`. */
export function isCustomUrl(url: unknown): boolean {
  return /^https?:\/\/.+%s/.test(text(url));
}

/** Input placeholder and accessible name: 「Googleで検索」, or 「検索」 for a custom URL. */
export function searchLabel(eng: unknown, url: unknown): string {
  return isCustomUrl(url) ? '検索' : engineOf(eng) + 'で検索';
}

export type SearchQuery = Readonly<{ eng: unknown; url: unknown; scope: number; q: string }>;

/** Returns the URL to open, or null for an empty query. */
export function buildSearchUrl({ eng, url, scope, q }: SearchQuery): string | null {
  const v = q.trim();
  if (!v) return null;
  const enc = encodeURIComponent(v);
  const custom = text(url);
  if (isCustomUrl(custom)) return custom.replace('%s', enc);
  const set = URLS[engineOf(eng)];
  return (set[scope] ?? set[0]) + enc;
}

/** Toast shown when opening in a new tab. */
export function newTabText(eng: unknown, url: unknown, scope: number): string {
  return isCustomUrl(url) ? '検索を新しいタブで開きます' : engineOf(eng) + ' の' + (SCOPE_NAMES[scope] ?? 'Web') + '検索を新しいタブで開きます';
}
