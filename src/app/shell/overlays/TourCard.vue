<script setup lang="ts">
/**
 * 最初の案内 `.tscrim` `.tcard` (仕様書 2章「はじめて開いたとき」, 実装ガイド 7.2). Markup: Main.dc.html 1704–1709.
 * Five steps; steps 1–4 outline a bottom-bar button (BottomNav `hl`). Step 5 「使い始めの準備」 depends on the environment.
 */
import { computed } from 'vue';
import { useDash } from '../../context';
import { setupGuide, tourEnd, tourNext, tourView } from '../../store/overlays';

const d = useDash();
const v = computed(() => tourView(d, setupGuide(d)));
</script>

<template>
  <div class="tscrim" :class="{ open: d.ui.tour >= 0 }" aria-hidden="true" />
  <div class="tcard" :class="{ open: d.ui.tour >= 0 }" role="dialog" aria-label="使い方の案内">
    <p>{{ v.text }}</p>
    <p v-if="v.sub" class="tsub">{{ v.sub }}</p>
    <div style="display: flex; align-items: center; gap: 6px"><span class="cap num">{{ v.count }}</span><span style="flex: 1" /><button v-if="v.actLabel" class="chip" @click="v.act?.()">{{ v.actLabel }}</button><button v-if="v.canSkip" class="chip" style="background: none" @click="tourEnd(d)">スキップ</button><button class="chip pri" @click="tourNext(d)">{{ v.nextLabel }}</button></div>
  </div>
</template>
