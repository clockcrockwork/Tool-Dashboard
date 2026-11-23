<script setup lang="ts">
/** 設定の1行 `.fld`: 左に名前、右に操作. Use the `label` slot for rich names. */
defineProps<{ label?: string }>();
</script>

<template>
  <div class="fld"><span><slot name="label">{{ label }}</slot></span><slot /></div>
</template>
