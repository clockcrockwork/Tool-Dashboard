<script setup lang="ts">
/**
 * 通知が開いている間だけ届くことの一文（実装ガイド 7.2「閉じている間の知らせ」、p2a-followup.md 3章）. 設定パネルが
 * `perm: ['notify']` の種類の固有の項目のあとに出す（種類ごとに書かない）。Web Push は使わないので、閉じている間は知らせない.
 */
import { OPEN_ONLY_NOTE } from '../runtime/notify';
</script>

<template>
  <p class="cap" style="margin: 2px 0 6px">{{ OPEN_ONLY_NOTE }}</p>
</template>
