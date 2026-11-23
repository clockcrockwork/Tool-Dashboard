<script setup lang="ts">
/**
 * Design Pattern Gallery（部品シートの実装版）。design/claude-design/Parts.dc.html と同じ章立て（1〜12）と
 * 上部の切替（テーマ・動き・速さ）を持ち、見本は左ライト・右ダーク。見本は本物の Vue 部品と、
 * プロトタイプのクラスを付けた素の要素で描く（章ごとのファイル: ./chapters/ChNN*.vue）。
 * 使い方と Storybook との分担は docs/lgd/gallery-and-storybook.md。
 */
import { computed, provide } from 'vue';
import { createGalleryState, GALLERY_KEY, reducedMotion } from './state';
import GalleryControls from './parts/GalleryControls.vue';
import Ch01Rules from './chapters/Ch01Rules.vue';
import Ch02Foundations from './chapters/Ch02Foundations.vue';
import Ch03States from './chapters/Ch03States.vue';
import Ch04Buttons from './chapters/Ch04Buttons.vue';
import Ch05Inputs from './chapters/Ch05Inputs.vue';
import Ch06Feedback from './chapters/Ch06Feedback.vue';
import Ch07Surfaces from './chapters/Ch07Surfaces.vue';
import Ch08Special from './chapters/Ch08Special.vue';
import Ch09Widgets from './chapters/Ch09Widgets.vue';
import Ch10Motion from './chapters/Ch10Motion.vue';
import Ch11Screens from './chapters/Ch11Screens.vue';
import Ch12Flows from './chapters/Ch12Flows.vue';

const s = createGalleryState();
provide(GALLERY_KEY, s);
const rootCls = computed(() => ['th-' + s.th, reducedMotion(s) ? 'rmo' : '']);
</script>

<template>
  <div class="dash ds" :class="rootCls" data-theme="auto" :style="{ '--sf': s.slow ? '4' : '1' }">
    <h1>部品シート</h1>
    <p class="lead">ダッシュボードのデザインパターンギャラリーです。部品を1つずつ状態と振る舞いと一緒に並べ（1〜8章）、ウィジェットの表示・動き・画面・状態の流れを横に並べて比べています（9〜12章）。決まりの背景は仕様書、値と作り方は実装ガイド、実際の動きはダッシュボードで確かめてください。</p>
    <p class="lead2">これは実装（Vue 部品）で描いた版です。原本は <code>design/claude-design/Parts.dc.html</code>。各項目の見出しの横の印: <span class="tag fx">Vue 部品</span> 本物の部品、<span class="tag fx">一部 Vue 部品</span> 本物の部品と素の要素が混ざる、<span class="tag ex">クラスだけ</span> プロトタイプのクラスを付けた素の要素（部品がまだ無いもの。多くは P2 のウィジェットに属する）。</p>
    <GalleryControls />
    <nav aria-label="目次">
      <ul class="toc">
        <li class="tg">カタログ</li><li><a href="#rules">1. 共通の決まり</a></li><li><a href="#found">2. 基礎</a></li><li><a href="#states">3. 状態の比較</a></li><li><a href="#btns">4. ボタン</a></li><li><a href="#inputs">5. 選ぶ・入れる</a></li><li><a href="#feedback">6. 知らせる・待つ</a></li><li><a href="#surf">7. 面と枠</a></li><li><a href="#spec">8. そのほかの部品</a></li>
        <li class="tg">比べる</li><li><a href="#modes">9. ウィジェットの表示</a></li><li><a href="#motion">10. 動きとフィードバック</a></li><li><a href="#screens">11. 画面とテーマ</a></li><li><a href="#flows">12. 空・処理中・失敗・復旧</a></li>
      </ul>
    </nav>
    <Ch01Rules />
    <Ch02Foundations />
    <Ch03States />
    <Ch04Buttons />
    <Ch05Inputs />
    <Ch06Feedback />
    <Ch07Surfaces />
    <Ch08Special />
    <Ch09Widgets />
    <Ch10Motion />
    <Ch11Screens />
    <Ch12Flows />
  </div>
</template>
