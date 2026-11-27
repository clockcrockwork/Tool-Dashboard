<script setup lang="ts">
/**
 * 録音 (recorder) — 2×2. 録音ボタン＋経過時間＋入力レベル＋録音の行（再生・削除）.
 * Prototype: Main.dc.html section data-w="recorder" (markup 1606–1622); `recOn`, `recLabel`, `recD`, `recTime`, `recLevel`,
 * `takes`, `noTakes` in `renderVals()`, `recToggle`, `playTake`, `pq.recorder` in `xVals()`.
 *
 * - 継続実行（登録の `run: 'continuous'`）: 録音中のマイクと MediaRecorder は status.ts が持つので、この部品が作り直されても・
 *   外しても・一時利用を閉じても録音は続く。止めるのは「録音を止める」だけ。
 * - 経過は始めた時刻から計算し、経過と入力レベルの描き直しは表示中だけ（`useFaceClock`、120ms。登録の `refresh`）。
 * - マイクの許可のお願いは共通の枠の置き換え（`cover`）に出す（status.ts `recCover`）。
 * - 録音は保存しない（再読み込みで消える、最大6件）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { useFaceClock } from '../shared/time';
import { levelScale, recView, takeRows } from './recorder';
import { deleteTake, playTake, recCover, recLevel, recOf, recToggle } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const run = computed(() => recOf(d, w.id));
const at = useFaceClock(d, w.id, () => run.value.on, 120);
const v = computed(() => recView(run.value, at.value));
/** Read on each redraw tick (the analyser is not reactive). */
const level = computed(() => {
  if (!run.value.on || !at.value) return levelScale(false, 0);
  return levelScale(true, recLevel(d, w.id));
});
const takes = computed(() => takeRows(run.value));
const cover = computed(() => recCover(d, w.id));
</script>

<template>
  <WidgetFrame :cover="cover">
    <div class="in" style="flex-direction: column; gap: 8px; padding: 16px">
      <div style="display: flex; align-items: center; gap: 14px">
        <button class="btn rec" :aria-label="v.label" :aria-pressed="run.on" style="min-width: 56px; min-height: 56px" @click="recToggle(d, w.id)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor; stroke: none"><path :d="v.d" /></svg></button>
        <div style="flex: 1; min-width: 0"><div class="num" aria-live="off" style="font-size: var(--fs-2xl); font-weight: 300; line-height: 1.2">{{ v.time }}</div><div class="lvl" aria-hidden="true"><div :style="{ scale: level + ' 1' }" /></div></div>
      </div>
      <div class="scr" style="flex: 1; min-height: 0; display: flex; flex-direction: column">
        <div v-for="tk in takes" :key="tk.id" class="cnr"><button class="btn" :aria-label="tk.pl" style="background: none" @click="playTake(d, w.id, tk.id)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path :d="tk.d" /></svg></button><span class="num" style="flex: 1; min-width: 0">{{ tk.t }}</span><span class="cap num">{{ tk.dur }}</span><button class="nb" aria-label="この録音を削除" @click="deleteTake(d, w.id, tk.id)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 16px; height: 16px"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg></button></div>
        <p v-if="!takes.length" class="cap" style="margin: auto; text-align: center">録音はまだありません</p>
      </div>
    </div>
  </WidgetFrame>
</template>
