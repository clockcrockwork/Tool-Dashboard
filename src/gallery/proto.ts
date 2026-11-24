/**
 * 部品シートの原本（design/claude-design/Parts.dc.html）のマークアップを、そのまま取り出す。
 * まだ部品の無い P2 ウィジェットの見本（12章の翻訳・スクリプト・画像変換・受け渡し・日の出）を「クラスだけ」で描くのに使う。
 * 写しを作らずに原本を読むので、原本が変われば見本も変わる。ギャラリー専用（本番ビルドには入らない）。
 */
import raw from '../../design/claude-design/Parts.dc.html?raw';

let doc: Document | null = null;

function parsed(): Document {
  doc ??= new DOMParser().parseFromString(raw, 'text/html');
  return doc;
}

/** `sel` に合う `index` 番目の要素の中身（innerHTML）。無ければ空。 */
export function protoHtml(sel: string, index = 0): string {
  return parsed().querySelectorAll(sel)[index]?.innerHTML ?? '';
}

/** 12章 `#flows` の `flow` 番目（0から）の流れの、`fig` 番目の見本（`.snapi` の中身）。 */
export function flowSnap(flow: number, fig: number): string {
  const f = parsed().querySelectorAll('#flows .flow')[flow];
  return f?.querySelectorAll('.snapi')[fig]?.innerHTML ?? '';
}
