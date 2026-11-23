/** クイックリンクの表示 (prototype `links`). */
import { iconPath } from '../../app/registry/icons';
import type { LinkItem } from './data';

export type LinkView = { id: number; label: string; d: string; img: string; url: string | null; missing: string };

export function linkView(l: LinkItem): LinkView {
  return {
    id: l.id,
    label: l.label || '名前のないリンク',
    d: iconPath(l.ic),
    img: l.img ?? '',
    url: /^https?:\/\//.test(l.url) ? l.url : null,
    missing: (l.label || 'リンク') + ' のURLが未設定です',
  };
}
