<script setup lang="ts">
/**
 * スケッチの全画面 `.fsw` (仕様書 2章「全画面ウィジェット」: 中身と記録は通常の大きさのときと同じ。スケッチの絵は全画面にしても残る).
 * Prototype: Main.dc.html `<section class="fsw {{boardCls}}" data-w="sketch">` (markup 1690–1698; `touch-action: none` は行に書く: `.dash *` の manipulation が `.fsw-surf` の none を打ち消すため); `bp`, `bd`, `bHint`,
 * `boardCls`, `boardArea`, `penTools` in `renderVals()`. DashboardRoot renders it for each full-screen screen of the layout
 * (`layout.fullScreens`); 人前では隠す の間は shell の代わり（FullScreenStub）が出て、この部品は作られない。
 * 線とペンは通常のスケッチと同じもの（status.ts、保存しない）。下の帯は太さ・色・1つ戻す・すべて消去（前面表示は無い）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import { fullScreenArea, fullScreenMargin } from '../clock/clock';
import { penTools, pointOf, strokePaths, STROKE_W, PEN_COLORS, type PenTool } from './sketch';
import { clearWithUndo, ensurePad, setPen, strokeEnd, strokeMove, strokeStart, undoStroke } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const pad = ensurePad(d, w.id);
const L = computed(() => d.layout.value);
const screen = computed(() => L.value.fullScreens.find(s => s.id === w.id) ?? null);
const page = computed(() => screen.value?.page ?? -1);
const on = computed(() => d.pgOn(w.id) && page.value >= 0);
const style = computed(() => ({
  gridArea: fullScreenArea(Math.max(0, page.value), L.value.cols, L.value.rows),
  margin: fullScreenMargin(14 + d.env.sat, L.value.gap / 2, 66 + d.env.sab),
}));
const paths = computed(() => strokePaths(pad.strokes));
const tools = computed(() => penTools(pad.pen));
const hint = computed(() => (pad.strokes.length ? 0 : 1));
const layers = PEN_COLORS.flatMap(([c, v]) => STROKE_W.map((sw, i) => ({ k: c + String(i), sw, v })));

const pt = (e: PointerEvent): string => pointOf(e.clientX, e.clientY, (e.currentTarget as Element).getBoundingClientRect());
function down(e: PointerEvent): void {
  try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
  strokeStart(d, w.id, pt(e));
}
function move(e: PointerEvent): void {
  if (pad.drawing) strokeMove(d, w.id, pt(e));
}
function up(): void { strokeEnd(d, w.id); }
function pick(t: PenTool): void { setPen(d, w.id, t.pen); }
</script>

<template>
  <section class="fsw" :class="on ? '' : 'off'" :data-w="w.kind" :data-wid="w.id" :aria-label="w.def.n" :style="style">
    <svg class="fsw-surf" role="img" aria-label="手書き面" style="cursor: crosshair; touch-action: none" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up"><path v-for="l in layers" :key="l.k" :d="paths[l.k]" fill="none" :stroke-width="l.sw" stroke-linecap="round" stroke-linejoin="round" :style="{ stroke: l.v }" /></svg>
    <svg class="i fsw-hint" aria-hidden="true" viewBox="0 0 24 24" :style="{ opacity: hint }"><path d="M5 19l1-4L16.5 4.5l3 3L9 18z" /></svg>
    <div class="bbar fsw-bar">
      <button v-for="pn in tools" :key="pn.key" class="abb" :class="pn.on ? 'on' : ''" :aria-label="pn.label" :aria-pressed="pn.on" @click="pick(pn)"><span :style="{ display: 'block', width: pn.s, height: pn.s, borderRadius: '99px', background: pn.bg }" /></button>
      <button class="abb" aria-label="1つ戻す" @click="undoStroke(d, w.id)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M8 6L4 10l4 4M4 10h10a5 5 0 0 1 0 10h-3" /></svg></button>
      <button class="abb" aria-label="すべて消去" @click="clearWithUndo(d, w.id)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7" /></svg></button>
    </div>
  </section>
</template>
