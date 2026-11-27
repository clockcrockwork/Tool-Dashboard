<script setup lang="ts">
/**
 * スケッチ (sketch) — 2×2, vd, pg. 手書き面＋入力補助の帯（太さ3種・色3種・1つ戻す・すべて消去・前面表示）.
 * Prototype: Main.dc.html section data-w="sketch" (markup 1238–1250); `pd`, `padHint`, `padDown`/`padMove`/`padUp`, `padUndo`,
 * `padClear`, `penTools`, `ab.sketch`, `bigTog.sketch` in `renderVals()`.
 *
 * - 線とペンは保存しない（status.ts）。全画面（SketchFullScreen）・前面表示と同じ線を使う。
 * - 帯は設定「ツールバーを表示」で出し、前面表示の間は設定に関係なく出す（仕様書 6章「入力補助の帯」）。帯のボタンはフォーカスを外さない。
 * - すべて消去はトーストの「元に戻す」で戻せる。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { penTools, pointOf, strokePaths, STROKE_W, PEN_COLORS, type PenTool } from './sketch';
import { clearWithUndo, ensurePad, setPen, strokeEnd, strokeMove, strokeStart, undoStroke } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const pad = ensurePad(d, w.id);
const paths = computed(() => strokePaths(pad.strokes));
const tools = computed(() => penTools(pad.pen));
const hint = computed(() => (pad.strokes.length ? 0 : 1));
const isBig = computed(() => d.ui.big === w.id && (!d.g.off[w.id] || d.ui.temp === w.id));
const bar = computed(() => !!w.cfg('bar') || isBig.value);
/** The 9 paths in the prototype's order (black, blue, orange × thin, normal, thick). */
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

// ----- 前面表示 (仕様書 6章) -----
function collapse(): void {
  const u = d.ui;
  Object.assign(u, { big: null, temp: null, ret: null, panel: u.temp && u.ret ? u.ret : u.panel });
}
function toggleBig(): void {
  if (d.ui.big === w.id) collapse();
  else Object.assign(d.ui, { big: w.id, panel: 'none', edit: false, sel: null });
}
</script>

<template>
  <WidgetFrame>
    <svg role="img" aria-label="手書きパッド" style="position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up"><path v-for="l in layers" :key="l.k" :d="paths[l.k]" fill="none" :stroke-width="l.sw" stroke-linecap="round" stroke-linejoin="round" :style="{ stroke: l.v }" /></svg>
    <svg class="i" aria-hidden="true" viewBox="0 0 24 24" :style="{ position: 'absolute', left: '14px', top: '14px', color: 'var(--mut)', pointerEvents: 'none', opacity: hint }"><path d="M5 19l1-4L16.5 4.5l3 3L9 18z" /></svg>
    <div class="ab" :class="bar ? 'show' : ''" style="position: absolute; left: 8px; right: 8px; bottom: 6px; margin: 0">
      <button v-for="pn in tools" :key="pn.key" class="abb" :class="pn.on ? 'on' : ''" :aria-label="pn.label" :aria-pressed="pn.on" @pointerdown.prevent @click="pick(pn)"><span :style="{ display: 'block', width: pn.s, height: pn.s, borderRadius: '99px', background: pn.bg }" /></button>
      <span class="abs" />
      <button class="abb" aria-label="1つ戻す" @pointerdown.prevent @click="undoStroke(d, w.id)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M8 6L4 10l4 4M4 10h10a5 5 0 0 1 0 10h-3" /></svg></button>
      <button class="abb" aria-label="すべて消去" @pointerdown.prevent @click="clearWithUndo(d, w.id)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7" /></svg></button>
      <button class="abb" :aria-label="isBig ? '元の大きさに戻す' : '大きく表示'" @click="toggleBig"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path :d="isBig ? 'M10 4v6H4M14 20v-6h6' : 'M4 10V4h6M20 14v6h-6'" /></svg></button>
    </div>
  </WidgetFrame>
</template>
