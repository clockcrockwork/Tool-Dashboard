<script setup lang="ts">
/**
 * 10章 動きとフィードバック（再生ボタンで動きを流す）。上部の「動き」「速さ」はこの章で効く（.rmo と --sf）。
 * まだ見本が無い（P1 で追加）。部品シート #motion と同じ節の名前だけ並べている。部品ができたら、このファイルの中身を
 * Ch04Buttons.vue / Ch07Surfaces.vue と同じ形（PatternSection + Stages、本物の部品）に置き換える。
 */
import ChapterTodo from '../parts/ChapterTodo.vue';

const ITEMS = [
  ['mv-press', '押した反応', '.chip ほか'],
  ['mv-hover', 'ホバーの塗り', '.nb ほか'],
  ['mv-sw', 'スイッチ', '.sw'],
  ['mv-toast', 'トースト', '.toast'],
  ['mv-sheet', 'シート', '.sheet'],
  ['mv-menu', 'メニュー', '.mnu'],
  ['mv-dlg', 'ダイアログ', '.dlg'],
  ['mv-dots', '画面の点', '.dot'],
  ['mv-page', '画面送り', '.pages'],
  ['mv-load', '読み込み', '.sp / .sk / .pgb'],
  ['mv-prg', '進み具合', '.prg'],
  ['mv-bar', 'グラフの棒', '.bar'],
  ['mv-flash', '受け取った行の強調', '.srow'],
] as const;
</script>

<template>
  <ChapterTodo id="motion" title="10. 動きとフィードバック" lead="操作に返す反応と、画面が変わるときの動きの一覧です。本体と同じ時間と曲線で再生できます。" :items="ITEMS" />
</template>
