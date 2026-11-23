import { describe, expect, it } from 'vitest';
import { addLink, initialLinks, linksData, removeLink, updateLink } from './data';
import { linkView } from './links';
import { iconPath } from '../../app/registry/icons';

describe('links', () => {
  it('initial items match the prototype', () => {
    expect(initialLinks().items.map(x => [x.label, x.ic, x.url])).toEqual([
      ['コード', 'code', ''], ['メール', 'mail', ''], ['ドキュメント', 'doc', ''], ['チャット', 'chat', ''], ['クラウド', 'cloud', ''],
    ]);
  });
  it('add / update / remove', () => {
    let d = addLink(initialLinks(), 10);
    expect(d.items.at(-1)).toEqual({ id: 10, label: '', ic: 'star', url: '' });
    d = updateLink(d, 10, { label: '社内', url: 'https://example.com', img: 'data:image/png;base64,AA' });
    expect(d.items.at(-1)).toEqual({ id: 10, label: '社内', ic: 'star', url: 'https://example.com', img: 'data:image/png;base64,AA' });
    d = updateLink(d, 10, { img: null });
    expect(d.items.at(-1)).toEqual({ id: 10, label: '社内', ic: 'star', url: 'https://example.com' });
    d = removeLink(d, 10);
    expect(d.items.map(x => x.id)).toEqual([1, 2, 3, 4, 5]);
  });
  it('view: label fallback, icon, URL check and the missing-URL toast', () => {
    const v = linkView({ id: 1, label: '', ic: 'mail', url: 'example.com' });
    expect(v.label).toBe('名前のないリンク');
    expect(v.d).toBe(iconPath('mail'));
    expect(v.url).toBeNull();
    expect(v.missing).toBe('リンク のURLが未設定です');
    expect(linkView({ id: 1, label: 'メール', ic: 'mail', url: '' }).missing).toBe('メール のURLが未設定です');
    expect(linkView({ id: 1, label: 'a', ic: 'x', url: 'https://a.example' }).url).toBe('https://a.example');
  });
  it('sanitize keeps only valid items and image data URLs', () => {
    expect(linksData.sanitize({ items: [
      { id: 1, label: 'a', ic: 'code', url: '', img: 'javascript:alert(1)', z: 1 },
      { id: 2, label: 'b', ic: 'code', url: '', img: 'data:image/webp;base64,AA' },
      { id: 3, label: 3, ic: 'code', url: '' },
    ] }, 0)).toEqual({ items: [{ id: 1, label: 'a', ic: 'code', url: '' }, { id: 2, label: 'b', ic: 'code', url: '', img: 'data:image/webp;base64,AA' }] });
    expect(linksData.sanitize(null, 0)).toBeNull();
  });
});
