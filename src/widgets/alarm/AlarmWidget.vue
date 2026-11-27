<script setup lang="ts">
/**
 * アラーム (alarm) — 2×1. 時刻＋スイッチの2行. Prototype: Main.dc.html section data-w="alarm"; `alarms` in `renderVals()`.
 * ここは表示とスイッチだけ。見張って鳴らすのは Dashboard の実行管理（runner.ts、未配置でも・この部品が無くても動く）。
 * 鳴るのは開いている間だけ（実装ガイド 7.2）で、知らせは共通の通知（人前では隠している間は伏せた文）。
 * スイッチをオンにしたとき、通知の許否がまだなら共通の枠の許可のお願いを出す（スイッチはオンのまま、断られても鳴る）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { alarmTimes } from './alarm';
import { switchAlarm } from './actions';
import type { AlarmData } from './data';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const data = computed(() => w.data<AlarmData>());
const times = computed(() => alarmTimes(w.cfg));
const rows = computed(() => times.value.map((time, i) => {
  const on = !!data.value.on[i];
  return { time, on, cls: on ? 'on' : '', label: 'アラーム ' + time };
}));

const tap = (i: number): void => { switchAlarm(d, w.id, i); };
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; justify-content: center; padding-inline: 18px">
      <div v-for="(a, i) in rows" :key="i" style="display: flex; align-items: center; justify-content: space-between; min-height: 46px">
        <span class="num" style="font-size: min(24cqh, 28px); font-weight: 300">{{ a.time }}</span>
        <button class="sw" :class="a.cls" role="switch" :aria-checked="a.on" :aria-label="a.label" @click="tap(i)"><span class="tr"><span class="kn" /></span></button>
      </div>
    </div>
  </WidgetFrame>
</template>
