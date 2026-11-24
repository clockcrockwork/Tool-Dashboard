<script setup lang="ts">
/** 操作ヒント (子のシート, prototype markup Main.dc.html 1751–1770). */
import { computed } from 'vue';
import { useDash } from '../../context';
import { STORE_NOTE } from '../../store/sheets';
import { setupGuide, tourStart } from '../../store/overlays';
import { IC } from '../../parts/icons';
import Icon from '../../parts/LineIcon.vue';
import { SI } from './sheetIcons';

defineProps<{ dock: string }>();
const d = useDash();
/** 使い始めの準備 (実装ガイド 7.2): environment from display-mode / device / install prompt. */
const guide = computed(() => setupGuide(d));
</script>

<template>
  <aside class="sheet" :class="[dock, d.ui.panel === 'help' ? 'open' : '']" aria-label="操作ヒント">
    <div class="sh"><button class="bk" @click="d.back()"><Icon :d="IC.back" />設定</button><span class="st">操作ヒント</span><button class="nb" aria-label="閉じる" @click="d.closePanel()"><Icon :d="IC.close" /></button></div>
    <div class="hrow"><Icon :d="IC.back" /><span>開いたものは、左上の「‹」、<kbd>Esc</kbd> キー、外側のタップで、開く前の画面に戻ります。右上の × は、その場の画面をまとめて閉じます。</span></div>
    <div class="hrow"><Icon :d="IC.undo" /><span>配置や設定の変更は、編集中の「元に戻す」か <kbd>Ctrl</kbd>+<kbd>Z</kbd>（Mac は <kbd>⌘</kbd>+<kbd>Z</kbd>）で1つずつ戻せます。</span></div>
    <div class="hrow"><Icon :d="IC.back" /><span>ボードは、左右のスワイプ、横スクロール、ホイール、矢印キー、数字キーで切り替えます。</span></div>
    <div class="hrow"><Icon :d="IC.grid" /><span>一覧（<kbd>/</kbd> キー）から、目的のウィジェットへ直接移動できます。</span></div>
    <div class="hrow"><Icon :d="IC.plus" /><span>「ウィジェットを追加」では、▶ で置かずに使う、＋ で追加、↓ でほかのボードから移動。チェックの付いた名前を押すと、置いてある場所へ移動します。</span></div>
    <div class="hrow"><Icon :d="IC.pen" /><span>編集（<kbd>E</kbd> キー）にしてウィジェットをタップすると、大きさ・設定・置くボード・並び順を変えられます。終わったら下の「完了」を押します。</span></div>
    <div class="hrow"><Icon :d="SI.info" /><span>アイコンだけのボタンは、マウスを乗せるか長押しすると名前が出ます。</span></div>
    <div class="hrow"><Icon :d="SI.dots" style="stroke-width: 3" /><span>ウィジェットを右クリックするか長押しすると、設定・大きく表示・固定・ボードから外すが出ます。キーボードでは <kbd>Shift</kbd>+<kbd>F10</kbd>。</span></div>
    <div class="hrow"><Icon :d="IC.expand" /><span>メモとスケッチは、帯の右端のボタンで大きく開けます。スマホではメモに触れると自動で開きます。</span></div>
    <div class="hrow"><Icon :d="SI.calendar" /><span>メモに日時や <code>- [ ]</code> を書くと、予定やTODOへの追加を提案します。追加しなくてもメモは残ります。</span></div>
    <div class="hrow"><span class="cdot" aria-hidden="true" style="position: static; flex: none; margin: 7px 6px 0" /><span>右上に小さな輪があるウィジェットは未接続で、見本のデータを表示しています。塗りつぶしの点はオフラインで、前回の内容です。</span></div>
    <div class="sl">{{ guide.title }}</div>
    <p class="cap" style="margin: 0 0 6px; font-size: var(--fs-b); color: var(--text)">{{ guide.text }}</p>
    <p v-if="guide.sub" class="cap" style="margin: 0 0 6px">{{ guide.sub }}</p>
    <button v-if="guide.act" class="chip pri" style="width: 100%; margin: 4px 0 8px" @click="guide.act()">{{ guide.actLabel }}</button>
    <p class="cap" style="margin: 0">{{ STORE_NOTE }}</p>
    <button class="chip" style="width: 100%; margin-top: 12px" @click="tourStart(d)">最初の案内をもう一度見る</button>
  </aside>
</template>
