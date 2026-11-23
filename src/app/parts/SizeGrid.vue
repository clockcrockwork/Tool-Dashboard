<script setup lang="ts">
/** サイズのマス目 `.sz` (4×3) と「全画面」 (ウィジェットの設定). */
const props = defineProps<{
  size: readonly [number, number];
  min: readonly [number, number];
  max: readonly [number, number];
  /** board columns / rows on this device */
  cols: number;
  rows: number;
  locked: boolean;
  /** widget can go full-screen */
  canFull: boolean;
  full: boolean;
}>();
const emit = defineEmits<{ pick: [w: number, h: number]; full: [] }>();

const cells = Array.from({ length: 12 }, (_v, i) => ({ x: i % 4, y: Math.floor(i / 4) }));
function dis(x: number, y: number): boolean {
  return props.locked || x + 1 < props.min[0] || y + 1 < props.min[1] || x + 1 > props.max[0] || y + 1 > props.max[1] || x + 1 > props.cols || y + 1 > props.rows;
}
</script>

<template>
  <div role="group" aria-label="サイズ" style="display: grid; grid-template-columns: repeat(4, 44px); gap: 4px">
    <button v-for="c in cells" :key="c.x + '-' + c.y" class="sz" :class="!full && c.x < size[0] && c.y < size[1] ? 'on' : ''" :aria-label="'横' + (c.x + 1) + '、縦' + (c.y + 1)" :disabled="dis(c.x, c.y)" @click="emit('pick', c.x + 1, c.y + 1)" />
    <button v-if="canFull" class="chip sm" :class="full ? 'on' : ''" :aria-pressed="full ? 'true' : 'false'" :disabled="locked" style="grid-column: 1 / -1" @click="emit('full')">全画面</button>
  </div>
</template>
