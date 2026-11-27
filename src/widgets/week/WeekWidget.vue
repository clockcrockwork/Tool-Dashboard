<script setup lang="ts">
/**
 * 週間カレンダー (week) — 4×1. 今日を含む7日（週の始まりは設定）、今日の印、日本の祝日（`--hol`・下線・読み上げで祝日名）.
 * Prototype: Main.dc.html section data-w="week" (markup 911–919); `week`, `jpHol` in `renderVals()`. 点は見本（sample.ts）。
 * 日付は表示中だけ進む時計から取る（日が変わったら描き直す。登録の `refresh`）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { dayStart, useShownNow } from '../shared/time';
import { weekDays } from './week';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const day = computed(() => dayStart(now.value));
const days = computed(() => weekDays(new Date(day.value), w.cfg('start') === '日'));
</script>

<template>
  <WidgetFrame heading="週間カレンダー">
    <div class="in" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); align-items: center">
      <div v-for="(x, i) in days" :key="i" class="wd" :class="x.cls"><span class="mut" style="font-size: var(--fs-xs)">{{ x.dow }}</span><span class="dn num">{{ x.d }}<span v-if="x.hol" class="vh">{{ x.hn }}</span></span><span class="ds" aria-hidden="true">{{ x.dots }}</span></div>
    </div>
  </WidgetFrame>
</template>
