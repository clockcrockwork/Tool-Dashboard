<script setup lang="ts">
/** 世界時計 (world) — 2×1. 都市と時刻の行. Prototype: Main.dc.html section data-w="world"; `world` in `renderVals()`. */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { useShownNow } from '../shared/time';
import { worldRows } from './world';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const rows = computed(() => worldRows(new Date(now.value)));
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; justify-content: center; padding-inline: 18px">
      <div v-for="wc in rows" :key="wc.n" style="display: flex; align-items: baseline; justify-content: space-between; min-height: 34px"><span style="font-size: var(--fs-m)">{{ wc.n }}</span><span class="num" style="font-size: var(--fs-xl); font-weight: 300">{{ wc.t }}</span></div>
    </div>
  </WidgetFrame>
</template>
