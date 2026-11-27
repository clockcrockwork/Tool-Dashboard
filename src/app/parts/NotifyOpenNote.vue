<script setup lang="ts">
/**
 * 通知が開いている間だけ届くことの一文（実装ガイド 7.2「閉じている間の知らせ」、p2a-followup.md 3章）. 設定パネルが
 * `perm: ['notify']` の種類の最後（「外したウィジェットは…」の下）に出す（種類ごとに書かない）。Web Push は使わないので、
 * 閉じている間は知らせない.
 */
import { OPEN_ONLY_NOTE } from '../runtime/notify';
</script>

<template>
  <p class="cap" style="margin: 6px 0 0; text-align: center">{{ OPEN_ONLY_NOTE }}</p>
</template>
