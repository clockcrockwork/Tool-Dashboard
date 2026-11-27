<script setup lang="ts">
/**
 * 11章 画面とテーマ。部品シート #screens と同じ3つの場面（いつもの画面・設定を開いたとき・メニュー）を、
 * 画像の代わりに本物の DashboardRoot で描いて縮めたもの（parts/ScreenSnap.vue）。上の「テーマ」でライトとダークを切り替える。
 * 「並べる」のときはライトを出す（原本と同じ）。
 */
import type { Dashboard } from '../../app/store/store';
import type { MenuAnchor } from '../../app/store/types';
import { menuGeometry, menuHeight, sampleNotice, selectOptions, showNotice, widgetMenuItems } from '../../app/store/overlays';
import type { DashSetup } from '../dash';
import GalleryControls from '../parts/GalleryControls.vue';
import KindTag from '../parts/KindTag.vue';
import ScreenSnap from '../parts/ScreenSnap.vue';

type Theme = 'light' | 'dark';
const THEMES: readonly (readonly [Theme, string])[] = [['light', 'tl'], ['dark', 'td']];
const TH_NAME: Record<Theme, string> = { light: 'ライト', dark: 'ダーク' };

/** いつもの画面: 受け渡しの知らせの帯と、一覧ボタンの未読の件数（受け渡しの記録に未読2件を入れる）。 */
const main: DashSetup = d => {
  showNotice(d, sampleNotice(d));
  d.data.share = { items: [{ dir: 'in', seen: false }, { dir: 'in', seen: false }] };
};
const settings: DashSetup = d => { d.ui.panel = 'global'; };

/** TODO を右クリックしたその他メニュー。TODO の位置を測ってから開く（プロトタイプの mnOpen と同じ計算）。 */
const todoMenu = (d: Dashboard, root: HTMLElement): boolean => {
  const w = root.querySelector<HTMLElement>('.w[data-w="todo"]');
  const pages = root.querySelector<HTMLElement>(':scope > .pages');
  if (!w || !pages) return false;
  const at: MenuAnchor = {
    l: w.offsetLeft - pages.scrollLeft + Math.round(w.offsetWidth * 0.45), t: w.offsetTop + Math.round(w.offsetHeight * 0.3),
    w: 0, h: 0, rw: root.offsetWidth, rh: root.offsetHeight, al: '',
  };
  d.ui.mnQ = '';
  d.ui.mnAt = at;
  d.ui.mn = { kind: 'widget', id: 'todo', ...menuGeometry('widget', at, menuHeight(widgetMenuItems(d, 'todo'), false)) };
  return true;
};
/** スマホ: 選択メニュー（日の出・日の入りの「場所」）は幅520px未満なので下からのシート。 */
const sunSelect: DashSetup = d => {
  const at: MenuAnchor = { l: 16, t: 420, w: 140, h: 44, rw: 390, rh: 844, al: '場所' };
  d.ui.mnAt = at;
  d.ui.mn = { kind: 'select', id: 'sunloc:sun', ...menuGeometry('select', at, menuHeight(selectOptions(d, 'sunloc:sun').map(() => ({ sep: false })), false)) };
};

type Shot = readonly [device: 'd' | 'm', caption: string, prepare: DashSetup, after?: (d: Dashboard, root: HTMLElement) => boolean];
type Scene = readonly [title: string, shots: readonly Shot[]];
const SCENES: readonly Scene[] = [
  ['いつもの画面', [['d', 'デスクトップ 1440×900　最初の画面。受け取りの帯と一覧ボタンの件数', main], ['m', 'スマホ 390×844　同じ内容を2列で', main]]],
  ['設定を開いたとき', [['d', 'デスクトップ 1440×900　右上のシート', settings], ['m', 'スマホ 390×844　下からのシート', settings]]],
  ['メニュー', [['d', 'デスクトップ 1440×900　TODO を右クリックしたその他メニュー', () => undefined, todoMenu], ['m', 'スマホ 390×844　選択メニュー（場所）は下からのシート', sunSelect]]],
];
</script>

<template>
  <section id="screens" class="ch"><h2>11. 画面とテーマ</h2>
    <p class="lead2">デスクトップとスマホ、ライトとダークで、同じ場面を並べました。</p>
    <GalleryControls small />
    <p class="pnote">原本の静止画の代わりに、本物の <code>DashboardRoot</code> を端末の大きさで描いて縮めています（押しても動きません。時刻は 10:24 に固定）。上の「テーマ」でライトとダークを切り替えます。「並べる」のときはライトを出します。</p>
    <template v-for="sc in SCENES" :key="sc[0]">
      <h3 class="h3">{{ sc[0] }} <KindTag kind="vue" /></h3>
      <div class="shrow">
        <figure v-for="sh in sc[1]" :key="sh[0]" class="shf" :class="sh[0]">
          <div v-for="t in THEMES" :key="t[0]" :class="t[1]">
            <ScreenSnap :device="sh[0]" :theme="t[0]" :prepare="sh[2]" :label="sh[1] + '（' + TH_NAME[t[0]] + '）'" v-bind="sh[3] ? { after: sh[3] } : {}" />
          </div>
          <figcaption>{{ sh[1] }}</figcaption>
        </figure>
      </div>
    </template>
    <h3 class="h3">違いの一覧</h3>
    <div class="tw"><table><thead><tr><th>部品</th><th>デスクトップ</th><th>スマホ（幅720px未満）</th></tr></thead><tbody><tr><td>画面</td><td>8列前後。矢印・ホイール・キーで送る</td><td>2列。スワイプで送る</td></tr><tr><td>シート</td><td>右上に浮く幅324px</td><td>下から出て、画面の幅いっぱい</td></tr><tr><td>選択メニュー</td><td>押したボタンのそばに浮く</td><td>幅520px未満は下からのシート</td></tr><tr><td>その他メニュー</td><td>右クリックの位置に出る</td><td>0.7秒の長押しで、指の位置に出る</td></tr><tr><td>受け取りの帯</td><td>上の中央に浮く</td><td>上の端から端。時計の数字に重なる</td></tr><tr><td>下部バー</td><td>中央に浮く</td><td>ホームバーの分だけ上げる（<code>env(safe-area-inset-bottom)</code>）</td></tr><tr><td>テーマ</td><td colspan="2">自動・ライト・ダーク。壁の色と透明感の式が切り替わる（実装ガイド2章）。ガラスの上の文字はどちらも 4.5:1 以上</td></tr></tbody></table></div>
  </section>
</template>
