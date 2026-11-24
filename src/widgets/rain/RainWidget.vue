<script setup lang="ts">
/** 傘 (rain) — 2×1, net: data. Prototype: Main.dc.html section data-w="rain" (markup 749–764), values `renderVals()` `wx`. */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { rainView } from './rain';
import { rainSample } from './sample';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const wx = computed(() => rainView(rainSample(w.cfg('demo')), new Date(d.ui.t).getHours()));
</script>

<template>
  <WidgetFrame net>
    <div class="in" style="align-items: center; gap: 12px; padding-inline: 16px">
      <svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: min(44cqh, 52px); height: min(44cqh, 52px); stroke-width: 1.3"><path :d="wx.icon" /></svg>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
        <div style="font-size: min(17cqh, 19px); font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ wx.head }}</div>
        <div class="cap" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ wx.sub }}</div>
        <div role="img" :aria-label="wx.label" style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 2px; align-items: end; height: min(17cqh, 22px); margin-top: 2px">
          <span v-for="(rb, i) in wx.bars" :key="i" :style="{ height: rb.h, borderRadius: '3px', background: rb.c }" />
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>
