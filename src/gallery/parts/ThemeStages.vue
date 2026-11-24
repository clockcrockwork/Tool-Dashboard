<script setup lang="ts">
/** 左ライト・右ダークの見本の台 `.stages`。同じ中身を2回描く（スロットに theme を渡す）。片方だけにするのは上の「テーマ」。 */
defineSlots<{ default(props: { theme: 'light' | 'dark' }): unknown }>();
</script>

<template>
  <div class="stages">
    <div class="stage lt" aria-label="ライト"><slot theme="light" /></div>
    <div class="stage dk" aria-label="ダーク"><slot theme="dark" /></div>
  </div>
</template>
