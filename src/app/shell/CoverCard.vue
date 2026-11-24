<script setup lang="ts">
/**
 * 中身ごと置き換える知らせ `.pmw .perm` (仕様書 3章「ウィジェット内の知らせ」; prototype markup Main.dc.html 767 `pq.*`).
 * Used by the frame (`WidgetFrame`) and by the shell's full-screen stand-in (`FullScreenStub`).
 */
import Icon from '../parts/LineIcon.vue';
import type { WidgetCover } from './cover';

defineProps<{ cover: WidgetCover; labelId: string }>();
</script>

<template>
  <div class="pmw">
    <div class="perm" :class="cover.warn ? 'warnx' : ''" role="group" :aria-labelledby="labelId">
      <Icon :d="cover.icon" />
      <div>
        <b :id="labelId">{{ cover.title }}</b><span>{{ cover.text }}</span>
        <div v-if="cover.ok || cover.alt" class="pa">
          <button v-if="cover.ok" class="chip pri" @click="cover.ok.fn()">{{ cover.ok.label }}</button>
          <button v-if="cover.alt" class="chip ghost" @click="cover.alt.fn()">{{ cover.alt.label }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
