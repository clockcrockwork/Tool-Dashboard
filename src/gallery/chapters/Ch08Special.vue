<script setup lang="ts">
/**
 * 8章 そのほかの部品（ドロップ受け・ファイル行・コード欄・メニュー・バッジなど）。
 * まだ見本が無い（P1 で追加）。部品シート #spec と同じ節の名前だけ並べている。部品ができたら、このファイルの中身を
 * Ch04Buttons.vue / Ch07Surfaces.vue と同じ形（PatternSection + Stages、本物の部品）に置き換える。
 */
import ChapterTodo from '../parts/ChapterTodo.vue';

const ITEMS = [
  ['x-drop', 'ドロップ受け', '.drop'],
  ['x-frow', 'ファイル行', '.frow'],
  ['x-code', 'コード欄と出力', '.jse / .jcon'],
  ['x-band', '時間の帯', '.sunb / 雨の棒'],
  ['x-crow', '一覧の行', '.crow'],
  ['n-menu', 'その他メニュー（ウィジェットの操作）', '.mnu[role=menu]'],
  ['n-badge', '件数のバッジ', '.bdg'],
  ['n-kbd', 'キーの表示', 'kbd'],
  ['n-disc', '折りたたみの節', '.dsc'],
] as const;
</script>

<template>
  <ChapterTodo id="spec" title="8. そのほかの部品" lead="ウィジェット固有だがほかでも使えるように切り出した部品と、メニュー・バッジ・キーの表示・折りたたみの節。" :items="ITEMS" />
</template>
