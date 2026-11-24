<script setup lang="ts">
/**
 * 時計の全画面 `.fsw` (仕様書 2章「全画面ウィジェット」). Prototype: Main.dc.html `<section class="fsw {{focusCls}}" data-w="clock">`
 * (markup 1656–1688), `focusCls`, `focusArea`, `focusMargin`, `secScale`, `fx*` in `renderVals()`.
 * DashboardRoot renders it for each full-screen screen of the layout (`layout.fullScreens`: a placement of a kind with
 * `pg` whose size is 「全画面」); it hides itself with `off` when its placement is not full-screen.
 * The background moves only on the visible screen (`run`) and has a pause button; reduced motion stops it in CSS.
 */
import { computed, ref } from 'vue';
import { useDash, useWidget } from '../../app/context';
import { instanceNo } from '../../app/registry/instances';
import { clockParts, fullScreenArea, fullScreenMargin, secScale } from './clock';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
/** SVG ids stay `focusGrad`/`focusGoo` for the first placement; later ones get a suffix so ids stay unique. */
const sfx = w.id === w.kind ? '' : '-' + String(instanceNo(w.id));
/** 背景の動きを一時停止 (not saved, like the prototype `fxPause`). */
const paused = ref(false);
const L = computed(() => d.layout.value);
const screen = computed(() => L.value.fullScreens.find(s => s.id === w.id) ?? null);
const page = computed(() => screen.value?.page ?? -1);
const on = computed(() => d.pgOn(w.id) && page.value >= 0);
const cls = computed(() => (on.value ? '' : 'off') + (on.value && d.page === page.value && !paused.value ? ' run' : ''));
const style = computed(() => ({
  gridArea: fullScreenArea(page.value, L.value.cols, L.value.rows),
  margin: fullScreenMargin(14 + d.env.sat, L.value.gap / 2, 66 + d.env.sab),
}));
const now = computed(() => new Date(d.ui.t));
const v = computed(() => clockParts(now.value, !!w.cfg('h12'), false));
const scale = computed(() => secScale(now.value));
</script>

<template>
  <section class="fsw" :class="cls" :data-w="w.kind" :data-wid="w.id" :aria-label="w.def.n" :style="style">
    <svg class="blobs fsw-bg" aria-hidden="true" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient :id="'focusGrad' + sfx" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="1000" y2="800">
          <stop offset="0" style="stop-color: var(--g1)" />
          <stop offset="0.28" style="stop-color: var(--g2)" />
          <stop offset="0.52" style="stop-color: var(--g3)" />
          <stop offset="0.76" style="stop-color: var(--g4)" />
          <stop offset="1" style="stop-color: var(--g5)" />
        </linearGradient>
        <filter :id="'focusGoo' + sfx" filterUnits="userSpaceOnUse" x="-400" y="-400" width="1800" height="1800" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12" />
        </filter>
      </defs>
      <g :filter="'url(#focusGoo' + sfx + ')'" :fill="'url(#focusGrad' + sfx + ')'">
        <circle class="mb" cx="330" cy="420" r="170" />
        <circle class="mb m2" cx="560" cy="540" r="190" />
        <circle class="mb m3" cx="700" cy="400" r="150" />
        <circle class="mb m4" cx="460" cy="620" r="130" />
        <circle class="mb m5" cx="140" cy="560" r="150" />
        <circle class="mb m6" cx="880" cy="560" r="160" />
        <circle class="mb m7" cx="560" cy="330" r="110" />
        <circle class="mb m8" cx="420" cy="480" r="90" />
      </g>
    </svg>
    <div class="fsw-main">
      <div class="num" style="font-size: min(31cqw, 52cqh); font-weight: 200; line-height: 0.9; letter-spacing: -0.04em">{{ v.hm }}</div>
      <div aria-hidden="true" style="width: min(46cqw, 360px); height: 3px; border-radius: 3px; background: var(--fill2); overflow: hidden"><div :style="{ height: '100%', width: '100%', transformOrigin: 'left center', scale: scale + ' 1', background: 'var(--text)', borderRadius: '3px', transition: 'scale 1s linear' }" /></div>
      <div class="num" style="padding: 8px 18px; border-radius: 999px; font-size: var(--fs-b); background: var(--glass); -webkit-backdrop-filter: blur(20px) saturate(170%); backdrop-filter: blur(20px) saturate(170%); border: 1px solid var(--line); box-shadow: inset 0 1px 0 var(--hi)">{{ v.dateLine }}</div>
    </div>
    <div class="fsw-act"><button class="btn" :aria-label="paused ? '背景の動きを再生' : '背景の動きを一時停止'" @click="paused = !paused"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path :d="paused ? 'M8 5.5v13l11-6.5z' : 'M8 5v14M16 5v14'" /></svg></button></div>
  </section>
</template>
