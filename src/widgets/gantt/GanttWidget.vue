<script setup lang="ts">
/**
 * タイムスケジュール (gantt) — 4×1. 今日の時間帯（8〜20時）の横の帯＋現在時刻の線.
 * Prototype: Main.dc.html section data-w="gantt"; `gantt`, `nowLeft`, `nowOp` in `renderVals()`. 時間帯は見本（sample.ts）.
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { useShownNow } from '../shared/time';
import { ganttBars, ganttNowLeft } from './gantt';
import { GANTT_SAMPLE } from './sample';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const bars = ganttBars(GANTT_SAMPLE);
const nowLeft = computed(() => ganttNowLeft(new Date(now.value)));
const nowOp = computed(() => (w.cfg('now') ? 1 : 0));
</script>

<template>
  <WidgetFrame heading="今日のタイムスケジュール">
    <div class="in" style="flex-direction: column; gap: 6px">
      <div style="position: relative; flex: 1; min-height: 0">
        <div v-for="b in bars" :key="b.n" :style="{ position: 'absolute', left: b.l, width: b.w, top: b.t, height: '28%', background: b.c, borderRadius: 'var(--r1)', padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: 'var(--fs-s)', whiteSpace: 'nowrap', overflow: 'hidden' }">{{ b.n }}</div>
        <div aria-hidden="true" :style="{ position: 'absolute', top: '-4px', bottom: '-4px', left: nowLeft, width: '2px', borderRadius: '2px', background: 'var(--text)', opacity: nowOp }" />
      </div>
      <div class="mut num" aria-hidden="true" style="display: flex; justify-content: space-between; font-size: var(--fs-xs)"><span>8</span><span>12</span><span>16</span><span>20</span></div>
    </div>
  </WidgetFrame>
</template>
