<script setup lang="ts">
/**
 * 今日は何の日 (today) — 2×1, net: data. 左に大きな日、右に月と記念日（文字だけで伝える型）.
 * Prototype: Main.dc.html section data-w="today" (markup 932–943), values `renderVals()` `tdDay` `tdMonth` `tdName`.
 *
 * - 見本のデータ（11月17日分だけ。接続の点で見本と示す）。日付は表示中だけ進め（`useShownNow`）、取得も表示中だけ（`status.ts`）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { useShownNow } from '../shared/time';
import { todayKey, todayView } from './today';
import { todaySource } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const place = todaySource.use(d, w.id, () => todayKey(now.value));
const v = computed(() => todayView(place.key, place.val));
</script>

<template>
  <WidgetFrame>
    <div class="in" style="align-items: center; gap: 14px; padding-inline: 18px">
      <div class="num" style="flex: none; font-size: min(58cqh, 22cqw); font-weight: 200; line-height: 1; letter-spacing: -0.03em">{{ v.day }}</div>
      <div style="min-width: 0">
        <div class="cap num">{{ v.month }}</div>
        <div style="font-size: min(21cqh, 22px); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ v.name }}</div>
      </div>
    </div>
  </WidgetFrame>
</template>
