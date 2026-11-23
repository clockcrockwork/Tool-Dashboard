<script setup lang="ts">
/**
 * 12章 空・処理中・失敗・復旧（ウィジェットごとの状態の流れ）。枠の状態だけの見本は 7章「ウィジェットの枠」にある。
 * まだ見本が無い（P1 で追加）。部品シート #flows と同じ節の名前だけ並べている。部品ができたら、このファイルの中身を
 * Ch04Buttons.vue / Ch07Surfaces.vue と同じ形（PatternSection + Stages、本物の部品）に置き換える。
 */
import ChapterTodo from '../parts/ChapterTodo.vue';

const ITEMS = [
  ['fl-weather', '天気', ''],
  ['fl-translate', '翻訳（ローカルAI）', ''],
  ['fl-script', 'スクリプト', ''],
  ['fl-imgconv', '画像変換', ''],
  ['fl-todo-share', 'TODO と 受け渡し', ''],
  ['fl-sun', '日の出・日の入り（許可）', ''],
] as const;
</script>

<template>
  <ChapterTodo id="flows" title="12. 空・処理中・失敗・復旧" lead="ウィジェットごとに、状態がどう移るかを左から順に並べました。矢印の上は、次の状態に移るきっかけです。" :items="ITEMS" />
</template>
