<script setup lang="ts">
/**
 * 5章 選ぶ・入れる（入力欄・選択の並び・スイッチ・スライダーなど）。
 * まだ見本が無い（P1 で追加）。部品シート #inputs と同じ節の名前だけ並べている。部品ができたら、このファイルの中身を
 * Ch04Buttons.vue / Ch07Surfaces.vue と同じ形（PatternSection + Stages、本物の部品）に置き換える。
 */
import ChapterTodo from '../parts/ChapterTodo.vue';

const ITEMS = [
  ['i-inp', '入力欄', '.inp'],
  ['i-seg', '選択の並び', '.seg / .sg'],
  ['i-tgts', '切替チップ', '.tgts .chip'],
  ['i-sw', 'スイッチ', '.sw'],
  ['i-rg', 'スライダー', '.rg'],
  ['i-sz', '大きさのマス', '.sz'],
  ['i-catq', 'ウィジェットを探す', '.catq / .cath'],
  ['i-ck', 'チェック', '.ck'],
  ['n-select', '選択メニュー', '.sel + .mnu[role=listbox]'],
  ['n-step', '数のステッパー', '.stp'],
  ['n-field', '入力欄の補足とエラー', '.fld2'],
  ['n-time', '日付と時刻の入力', '.inp[type=time|date]'],
] as const;
</script>

<template>
  <ChapterTodo id="inputs" title="5. 選ぶ・入れる" :items="ITEMS" />
</template>
