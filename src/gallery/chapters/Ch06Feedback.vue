<script setup lang="ts">
/**
 * 6章 知らせる・待つ（トースト・帯・待つ間の表示・ダイアログなど）。トーストは Storybook の Shell/ToastStack にある。
 * まだ見本が無い（P1 で追加）。部品シート #feedback と同じ節の名前だけ並べている。部品ができたら、このファイルの中身を
 * Ch04Buttons.vue / Ch07Surfaces.vue と同じ形（PatternSection + Stages、本物の部品）に置き換える。
 */
import ChapterTodo from '../parts/ChapterTodo.vue';

const ITEMS = [
  ['n-toast', 'トースト', '.toast'],
  ['n-bar', '知らせの帯', '.rcv'],
  ['n-pill', '状態の帯', '.epill / .offp'],
  ['n-wait', '待つ間の表示', '.skl / .sp / .prg / .pgb'],
  ['n-mark', '印', '.cdot / .dtag / .newdot'],
  ['n-empty', '空の表示', '.empt'],
  ['n-tip', 'ツールチップ', '.tip'],
  ['n-dlg', 'ダイアログ', '.dlg'],
  ['n-tour', '最初の案内', '.tcard'],
  ['n-perm', '許可のお願い', '.perm'],
  ['n-net', '通信と許可の出し方', '登録の net / perm'],
  ['n-note', 'ウィジェット内の知らせ', '.note'],
] as const;
</script>

<template>
  <ChapterTodo id="feedback" title="6. 知らせる・待つ" :items="ITEMS" />
</template>
