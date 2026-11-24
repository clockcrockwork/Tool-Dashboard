<script setup lang="ts">
/**
 * 11章「画面とテーマ」の1枚。本物の DashboardRoot を端末の大きさ（デスクトップ 1440×900、スマホ 390×844）で描き、
 * transform: scale で部品シートの画像と同じ幅（860px / 300px）に縮める（iframe は使わない）。押しても動かない（inert）。
 * 時刻は 2026-11-19 10:24:36 JST に固定。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import DashboardRoot from '../../app/shell/DashboardRoot.vue';
import type { Dashboard } from '../../app/store/store';
import { makeDash, type DashSetup } from '../dash';

const props = withDefaults(defineProps<{
  device: 'd' | 'm';
  theme: 'light' | 'dark';
  label: string;
  prepare?: DashSetup;
  /**
   * 見えるようになってから、true を返すまで毎フレーム呼ぶ（約3秒まで）。ウィジェットは非同期に読み込まれるので、
   * 測りたいウィジェットがまだ無ければ false を返す（その他メニューの位置を測るときなど）。root は DashboardRoot の `.dash`
   */
  after?: ((d: Dashboard, root: HTMLElement) => boolean) | null;
}>(), { prepare: () => {}, after: null });

const SIZE = { d: { w: 1440, h: 900, out: 860 }, m: { w: 390, h: 844, out: 300 } } as const;
const sz = SIZE[props.device];
const scale = sz.out / sz.w;

const d = makeDash(dd => {
  dd.g.gs.theme = props.theme;
  // 開いたときに検索欄へフォーカスしない（ギャラリーのページが動かないように）
  dd.g.gs.autoq = false;
  props.prepare(dd);
});

const box = ref<HTMLElement | null>(null);
let ro: ResizeObserver | null = null;
let done = false;
onMounted(() => {
  const after = props.after;
  const root = box.value?.querySelector<HTMLElement>(':scope > .dash');
  if (!after || !root) return;
  // テーマの切替で隠れている間は大きさが 0。見えたときに1回だけ測る。
  ro = new ResizeObserver(() => {
    if (done || !root.offsetWidth) return;
    done = true;
    ro?.disconnect();
    let n = 0;
    const tick = (): void => {
      if (!after(d, root) && ++n < 180) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  ro.observe(root);
});
onBeforeUnmount(() => { ro?.disconnect(); });
</script>

<template>
  <div class="shot" role="img" :aria-label="label" :style="{ width: sz.out + 'px', height: Math.round(sz.h * scale) + 'px' }">
    <div ref="box" class="shot-in" inert :style="{ width: sz.w + 'px', height: sz.h + 'px', transform: 'scale(' + scale + ')' }">
      <DashboardRoot :dash="d" />
    </div>
  </div>
</template>
