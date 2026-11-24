<script setup lang="ts">
/**
 * アラーム (alarm) — 2×1. 時刻＋スイッチの2行. Prototype: Main.dc.html section data-w="alarm"; `alarms` in `renderVals()`,
 * the alarm check in `tick()`. 鳴るのはページを開いている間だけ（実装ガイド 7.2、Web Push はしない）: 画面の中はトースト、
 * タブが裏にあって通知が許可済みならブラウザの通知も出す。人前では隠している間は知らせない（仕様書 3章）.
 * 鳴らす確かめは1秒ごとではなく、次に鳴る時刻まで待つ（alarm.ts、実装ガイド 8章）。表示中でない画面にあっても鳴る.
 */
import { computed, onBeforeUnmount, watch } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { notifyIfHidden } from '../shared/notify';
import { ALARM_DEFAULTS, alarmsDue, nextCheckIn } from './alarm';
import type { AlarmData } from './data';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const data = computed(() => w.data<AlarmData>());
const times = computed(() => [String(w.cfg('a1') || ALARM_DEFAULTS[0]), String(w.cfg('a2') || ALARM_DEFAULTS[1])]);
const rows = computed(() => times.value.map((time, i) => {
  const on = !!data.value.on[i];
  return { time, on, cls: on ? 'on' : '', label: 'アラーム ' + time };
}));

function tap(i: number): void {
  const on: [boolean, boolean] = [...data.value.on];
  on[i] = !on[i];
  w.setData<AlarmData>({ on });
  d.toast((times.value[i] ?? '') + (on[i] ? ' オン' : ' オフ'), 'info');
}

// ----- 鳴らす -----
let timer: ReturnType<typeof setTimeout> | undefined;
let prev = d.now();
function ring(i: number): void {
  // 人前では隠す: the time is part of the content, so nothing is shown or announced while hidden.
  if (d.veiled(w.id)) return;
  const time = times.value[i] ?? '';
  d.toast('アラーム ' + time, 'info');
  notifyIfHidden('アラーム', time);
}
function check(): void {
  const now = d.now();
  alarmsDue(times.value, data.value.on, prev, now).forEach(ring);
  prev = now;
  schedule();
}
function schedule(): void {
  clearTimeout(timer);
  timer = undefined;
  const ms = nextCheckIn(times.value, data.value.on, d.now());
  if (ms !== null) timer = setTimeout(check, ms);
}
watch([times, () => data.value.on], () => { prev = d.now(); schedule(); }, { immediate: true });
// A tab coming back from the background re-checks at once (its timers may have been held back).
const onVis = (): void => { if (!document.hidden) check(); };
document.addEventListener('visibilitychange', onVis);
onBeforeUnmount(() => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); });
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
