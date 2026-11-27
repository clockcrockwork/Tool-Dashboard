<script setup lang="ts">
/**
 * 月間カレンダー (month) — 2×2. 日付のマス目、今日の印、日本の祝日（`--hol`・下線・読み上げで祝日名）、見出しに今月の次の祝日.
 * Prototype: Main.dc.html section data-w="month" (markup 868–882); `monthLabel`, `monthHol`, `monthDow`, `monthCells`,
 * `jpHol` in `renderVals()`. 日付は表示中だけ進む時計から取る（日が変わったら描き直す。登録の `refresh`）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { dayStart, useShownNow } from '../shared/time';
import { monthCells, monthLabel, nextHolidayText, weekdayLabels } from './month';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
/** Only the day matters: the cells are rebuilt when the date changes, not every second. */
const day = computed(() => dayStart(now.value));
const sun = computed(() => w.cfg('start') === '日');
const label = computed(() => monthLabel(new Date(day.value)));
const hol = computed(() => nextHolidayText(new Date(day.value)));
const dows = computed(() => weekdayLabels(sun.value));
const cells = computed(() => monthCells(new Date(day.value), sun.value));
</script>

<template>
  <WidgetFrame heading="月間カレンダー">
    <div class="in" style="flex-direction: column; gap: 4px">
      <div class="num" style="font-size: var(--fs-m); font-weight: 500; padding-left: 6px; display: flex; gap: 8px; align-items: baseline; min-width: 0"><span>{{ label }}</span><span class="cap" style="font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ hol }}</span></div>
      <div class="mut" aria-hidden="true" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); justify-items: center; font-size: var(--fs-xs)">
        <span v-for="(dw, i) in dows" :key="i">{{ dw }}</span>
      </div>
      <div class="num" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); flex: 1; min-height: 0; justify-items: center; align-items: center">
        <span v-for="(c, i) in cells" :key="i" class="td" :class="c.cls">{{ c.d }}<span v-if="c.hol" class="vh">{{ c.hn }}</span></span>
      </div>
    </div>
  </WidgetFrame>
</template>
