<script setup lang="ts">
/** 上部の切替 `.gctl`。small のときは章の中に置く小さな版（テーマだけ）。 */
import { computed } from 'vue';
import { reducedMotion, useGallery, type GalleryTheme } from '../state';

const props = defineProps<{ small?: boolean }>();
const s = useGallery();
const thOpts: readonly (readonly [GalleryTheme, string])[] = [['both', '並べる'], ['l', 'ライト'], ['d', 'ダーク']];
const rm = computed(() => reducedMotion(s));
</script>

<template>
  <div class="gctl" :class="{ sm: props.small }" role="group" aria-label="表示の切り替え">
    <span class="gl">テーマ</span>
    <div class="seg">
      <button v-for="o in thOpts" :key="o[0]" class="sg" :class="{ on: s.th === o[0] }" :aria-pressed="s.th === o[0]" @click="s.th = o[0]">{{ o[1] }}</button>
    </div>
    <template v-if="!props.small">
      <span class="gl">動き</span>
      <div class="seg">
        <button class="sg" :class="{ on: !rm }" :aria-pressed="!rm" @click="s.rm = false">ふつう</button>
        <button class="sg" :class="{ on: rm }" :aria-pressed="rm" @click="s.rm = true">減らす</button>
      </div>
      <span class="gl">速さ</span>
      <div class="seg">
        <button class="sg" :class="{ on: !s.slow }" :aria-pressed="!s.slow" @click="s.slow = false">等倍</button>
        <button class="sg" :class="{ on: s.slow }" :aria-pressed="s.slow" @click="s.slow = true">1/4</button>
      </div>
    </template>
  </div>
</template>
