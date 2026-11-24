<script setup lang="ts">
/**
 * 3章 状態の比較。部品シート #states の表を、押せる部品ごとに同じ状態で横に並べたもの。
 * 状態はクラス（is-hover など、src/gallery/gallery.css）で写している。右端の「さわる」は本物の部品。
 */
import GalleryControls from '../parts/GalleryControls.vue';
import StateCell from '../parts/StateCell.vue';
import type { StateCol, StatePart } from '../types';

const COLS: readonly (readonly [StateCol, string])[] = [['n', '通常'], ['hover', 'ホバー'], ['press', '押した'], ['focus', 'フォーカス'], ['on', '選択・オン'], ['dis', '無効'], ['live', 'さわる']];
const ROWS: readonly (readonly [StatePart, string, string])[] = [
  ['chip', 'チップ', '.chip'], ['pri', '主な操作', '.chip.pri'], ['bad', '危険な操作', '.chip.bad'], ['sm', '小さなチップ', '.chip.sm'],
  ['sel', '選択メニュー', '.chip.sel'], ['btn', '丸ボタン', '.btn'], ['nb', 'アイコンボタン', '.nb'], ['abb', '帯のボタン', '.abb'],
  ['seg', '選択の並び', '.seg .sg'], ['sw', 'スイッチ', '.sw'], ['inp', '入力欄', '.inp'], ['mi', 'メニューの項目', '.mi'], ['pgc', '画面の表示', '.pgc'],
];
</script>

<template>
  <section id="states" class="ch">
    <h2>3. 状態の比較</h2>
    <p class="lead2">押せる部品を、同じ状態で横に並べました。同じ役割なのに見た目の変わり方が違うものを探すための表です。</p>
    <GalleryControls small />
    <div class="stage one mx">
      <table class="mxt">
        <thead><tr><th>部品</th><th v-for="c in COLS" :key="c[0]">{{ c[1] }}</th></tr></thead>
        <tbody>
          <tr v-for="r in ROWS" :key="r[0]">
            <th scope="row">{{ r[1] }}<code>{{ r[2] }}</code></th>
            <td v-for="c in COLS" :key="c[0]" :class="{ live: c[0] === 'live' }"><StateCell :part="r[0]" :st="c[0]" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <dl class="beh"><div><dt>作り方</dt><dd>ダッシュボードの <code>:hover</code>・<code>:active</code>・<code>:focus-visible</code> の規則を、このシートでクラスに写して並べています。見た目は本体と同じ規則から出ています。</dd></div><div><dt>さわる</dt><dd>右端の列は本物の部品です。マウス、タッチ、<kbd>Tab</kbd> で確かめられます。</dd></div><div><dt>—</dt><dd>その状態を持たない部品。スイッチと入力欄は押した反応を持たず、メニューの項目は無効を持ちません。</dd></div></dl>
  </section>
</template>
