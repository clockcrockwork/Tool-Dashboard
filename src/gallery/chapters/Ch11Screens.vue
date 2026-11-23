<script setup lang="ts">
/**
 * 11章 画面とテーマ（デスクトップとスマホ、ライトとダークの画面の写真）。
 * まだ見本が無い（P1 で追加）。部品シート #screens と同じ節の名前だけ並べている。部品ができたら、このファイルの中身を
 * Ch04Buttons.vue / Ch07Surfaces.vue と同じ形（PatternSection + Stages、本物の部品）に置き換える。
 */
import ChapterTodo from '../parts/ChapterTodo.vue';

const ITEMS = [
  ['sc-home', 'いつもの画面', ''],
  ['sc-settings', '設定を開いたとき', ''],
  ['sc-menu', 'メニュー', ''],
  ['sc-diff', '違いの一覧', ''],
] as const;
</script>

<template>
  <ChapterTodo id="screens" title="11. 画面とテーマ" lead="デスクトップとスマホ、ライトとダークで、同じ場面を並べました。" :items="ITEMS" />
</template>
