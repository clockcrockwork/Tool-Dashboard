<script setup lang="ts">
/**
 * カウントダウン (countdown) — 2×1. 残り日数の大きな数字＋名前. Prototype: Main.dc.html section data-w="countdown";
 * `cdDays`, `cdLabel` in `renderVals()`. 知らせは出さない（プロトタイプどおり。出すとしても開いている間だけ: 実装ガイド 7.2）.
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { useShownNow } from '../shared/time';
import { countdownDays } from './countdown';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const days = computed(() => countdownDays(String(w.cfg('date') ?? ''), new Date(now.value)));
const label = computed(() => String(w.cfg('label') ?? ''));
</script>

<template>
  <WidgetFrame>
    <div class="in" style="align-items: center; justify-content: center; gap: 12px">
      <span class="num" style="font-size: min(54cqh, 24cqw); font-weight: 200; line-height: 1">{{ days }}</span>
      <div><div class="cap">日</div><div style="font-size: var(--fs-b); white-space: nowrap">{{ label }}</div></div>
    </div>
  </WidgetFrame>
</template>
