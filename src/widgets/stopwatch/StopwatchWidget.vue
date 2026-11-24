<script setup lang="ts">
/**
 * ストップウォッチ (stopwatch) — 2×2. 大きな経過時間＋ラップ3行＋ラップ／スタート・ストップ／リセット.
 * Prototype: Main.dc.html section data-w="stopwatch"; `swTime`, `laps`, `swD`, `swToggle`, `swLap`, `swReset`.
 * 経過は始めた時刻から計算する（stopwatch.ts）。0.1秒の描き直しは、動いていて・表示中で・タブが前にあるときだけ（プロトタイプの
 * 「隠れている間は描き直さない」と、表示中だけ更新、実装ガイド 8章）。計測は保存しない（status.ts）.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { isShown } from '../../app/store/visibility';
import { PAUSE_D, PLAY_D, elapsed, lapRows, lapSw, swText, toggleSw, SW_IDLE } from './stopwatch';
import { setSw, swOf } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const s = computed(() => swOf(d, w.id));
/** The time the face was last drawn for (only advanced while it is drawn). */
const at = ref(d.now());
const time = computed(() => swText(elapsed(s.value, at.value)));
const laps = computed(() => lapRows(s.value));
const icon = computed(() => (s.value.run ? PAUSE_D : PLAY_D));

const tabShown = ref(typeof document === 'undefined' || !document.hidden);
const onVis = (): void => { tabShown.value = !document.hidden; };
document.addEventListener('visibilitychange', onVis);
let iv: ReturnType<typeof setInterval> | undefined;
watch(() => s.value.run && tabShown.value && isShown(d, w.id), on => {
  clearInterval(iv);
  iv = undefined;
  at.value = d.now();
  if (on) iv = setInterval(() => { at.value = d.now(); }, 100);
}, { immediate: true });
onBeforeUnmount(() => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); });

function toggle(): void {
  const now = d.now();
  setSw(d, w.id, toggleSw(s.value, now));
  at.value = now;
}
function lap(): void {
  setSw(d, w.id, lapSw(s.value, d.now()));
}
function reset(): void {
  setSw(d, w.id, SW_IDLE);
  at.value = d.now();
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; justify-content: space-between; align-items: center; gap: 6px; padding: 16px">
      <div class="num" style="font-size: min(22cqh, 19cqw); font-weight: 300; line-height: 1.1">{{ time }}</div>
      <div class="num mut" style="flex: 1; min-height: 0; overflow: hidden; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: var(--fs-m)">
        <div v-for="lp in laps" :key="lp.n" style="display: flex; gap: 14px"><span>{{ lp.n }}</span><span style="color: var(--text)">{{ lp.t }}</span></div>
      </div>
      <div style="display: flex; gap: 10px">
        <button class="btn" aria-label="ラップ" @click="lap"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 20V4M6 5h11l-2.5 4 2.5 4H6" /></svg></button>
        <button class="btn on" aria-label="スタート・ストップ" :aria-pressed="s.run" style="min-width: 52px; min-height: 52px" @click="toggle"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 22px; height: 22px"><path :d="icon" /></svg></button>
        <button class="btn" aria-label="リセット" @click="reset"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" /></svg></button>
      </div>
    </div>
  </WidgetFrame>
</template>
