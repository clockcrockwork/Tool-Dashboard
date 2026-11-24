<script setup lang="ts">
/** 線のアイコン `.i` (20px, stroke 1.6). Decorative by default; pass `label` for role="img". */
defineProps<{ d: string; size?: number; label?: string }>();
</script>

<template>
  <svg
    class="i"
    viewBox="0 0 24 24"
    :aria-hidden="label ? undefined : 'true'"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :style="size ? { width: size + 'px', height: size + 'px' } : undefined"
  ><path :d="d" /></svg>
</template>
