/**
 * クイックリンクの記録 (区画 `w:links` の data). 項目 = 名前・アイコン・画像・URL (仕様書 6章「項目の編集とアイコン」).
 * The settings sheet edits items through `addLink` / `updateLink` / `removeLink` (pure) or the `*In(d, …)` helpers.
 * `links` is part of the undo history (store HIST_DATA), so `d.undo()` restores edits.
 */
import type { Dashboard, WidgetDataDef } from '../../app/store/store';
import { isNum, isObj, isStr, pickList } from '../shared/guards';

export type LinkItem = { id: number; label: string; ic: string; url: string; img?: string };
export type LinksData = { items: LinkItem[] };
export type LinkPatch = Partial<Omit<LinkItem, 'id' | 'img'>> & { img?: string | null };

export const LINKS_MAX = 24;
/** Image data URLs are cut to 96px squares; anything larger than this is rejected on load. */
export const LINK_IMG_MAX = 200_000;

export function initialLinks(): LinksData {
  return {
    items: [
      { id: 1, label: 'コード', ic: 'code', url: '' },
      { id: 2, label: 'メール', ic: 'mail', url: '' },
      { id: 3, label: 'ドキュメント', ic: 'doc', url: '' },
      { id: 4, label: 'チャット', ic: 'chat', url: '' },
      { id: 5, label: 'クラウド', ic: 'cloud', url: '' },
    ],
  };
}

function pickItem(x: unknown): LinkItem | null {
  if (!isObj(x) || !isNum(x.id) || !isStr(x.label) || !isStr(x.ic) || !isStr(x.url)) return null;
  const it: LinkItem = { id: x.id, label: x.label, ic: x.ic, url: x.url };
  if (isStr(x.img) && x.img.startsWith('data:image/') && x.img.length <= LINK_IMG_MAX) it.img = x.img;
  return it;
}

export const linksData: WidgetDataDef<LinksData> = {
  version: 1,
  initial: () => initialLinks(),
  sanitize: raw => {
    if (!isObj(raw)) return null;
    const items = pickList(raw.items, pickItem, LINKS_MAX);
    return items ? { items } : null;
  },
};

// ---------- pure operations ----------

/** Appends a blank item (prototype `itemAdd`: label '', icon star, url ''). */
export function addLink(data: LinksData, id: number, init: Partial<Omit<LinkItem, 'id'>> = {}): LinksData {
  if (data.items.length >= LINKS_MAX) return data;
  const it: LinkItem = { id, label: init.label ?? '', ic: init.ic ?? 'star', url: init.url ?? '' };
  if (init.img !== undefined) it.img = init.img;
  return { items: [...data.items, it] };
}

/** Changes fields of one item. `img: null` removes the image (back to the icon). */
export function updateLink(data: LinksData, id: number, patch: LinkPatch): LinksData {
  return {
    items: data.items.map(x => {
      if (x.id !== id) return x;
      const next: LinkItem = { ...x };
      if (patch.label !== undefined) next.label = patch.label;
      if (patch.ic !== undefined) next.ic = patch.ic;
      if (patch.url !== undefined) next.url = patch.url;
      if (patch.img === null) delete next.img;
      else if (patch.img !== undefined) next.img = patch.img;
      return next;
    }),
  };
}

export function removeLink(data: LinksData, id: number): LinksData {
  return { items: data.items.filter(x => x.id !== id) };
}

// ---------- store helpers ----------

export function linksOf(d: Dashboard): LinksData {
  return d.dataOf<LinksData>('links');
}
export function addLinkIn(d: Dashboard, init: Partial<Omit<LinkItem, 'id'>> = {}): number {
  const id = d.now();
  d.setData<LinksData>('links', addLink(linksOf(d), id, init));
  return id;
}
export function updateLinkIn(d: Dashboard, id: number, patch: LinkPatch): void {
  d.setData<LinksData>('links', updateLink(linksOf(d), id, patch));
}
/** Removes with a 「元に戻す」 toast (取り消せる削除). */
export function removeLinkIn(d: Dashboard, id: number): void {
  const it = linksOf(d).items.find(x => x.id === id);
  d.setData<LinksData>('links', removeLink(linksOf(d), id));
  d.undoable((it?.label || 'リンク') + ' を削除しました');
}
