<script setup lang="ts">
/** 時計 (clock) — 2×1. 大きな数字・秒・日付. Prototype markup lines: Main.dc.html section data-w="clock". */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { clockParts } from './clock';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const v = computed(() => clockParts(new Date(d.ui.t), !!w.cfg('h12'), !!w.cfg('sec')));
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; justify-content: center; gap: 4px; padding-inline: 20px">
      <div class="num" style="font-size: min(48cqh, 23cqw); font-weight: 300; line-height: 1; letter-spacing: -0.03em; white-space: nowrap">{{ v.hm }}<span class="mut" style="font-size: 0.36em; margin-left: 0.35em; letter-spacing: 0">{{ v.ss }}</span></div>
      <div class="mut" style="font-size: var(--fs-m)">{{ v.dateLine }}</div>
    </div>
  </WidgetFrame>
</template>
