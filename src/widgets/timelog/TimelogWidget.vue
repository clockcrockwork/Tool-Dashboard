<script setup lang="ts">
/**
 * タイムログ (timelog) — 2×3, vd. 入力欄＋定型の言葉の帯＋今日の記録位置の帯＋縦のタイムライン（新しいものが下）.
 * Prototype: Main.dc.html section data-w="timelog"; `logKey`, `logPhrases`, `logs`, `logMarks`, `dayNow`, `none.timelog`,
 * `ab.timelog`, `addLog()`. 人前では隠すの既定がオン（登録の `priv`）。打刻（punch）からも行が足される.
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { useShownNow } from '../shared/time';
import type { TimelogData } from './data';
import { LOG_PHRASES, addLog, dayNowPos, logMarks, logRows, nextLogId } from './timelog';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const data = computed(() => w.data<TimelogData>());
const rows = computed(() => logRows(data.value.logs, !!w.cfg('sec')));
const marks = computed(() => logMarks(data.value.logs, now.value));
const dayNow = computed(() => dayNowPos(now.value));
const bar = computed(() => (w.cfg('bar') ? 'show' : ''));

function add(text: string): boolean {
  const t = d.now();
  const logs = addLog(data.value.logs, text, t, nextLogId(data.value.logs, t));
  if (!logs) return false;
  w.setData<TimelogData>({ logs });
  return true;
}
function onKey(e: KeyboardEvent): void {
  e.stopPropagation();
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  const el = e.target as HTMLInputElement;
  if (add(el.value)) el.value = '';
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; gap: 10px">
      <input class="inp" placeholder="いま何してる？" aria-label="タイムログに記録" @keydown="onKey">
      <div class="ab" :class="bar" style="margin: -6px -6px -6px">
        <button v-for="t in LOG_PHRASES" :key="t" class="abb" @pointerdown.prevent @click="add(t)">{{ t }}</button>
      </div>
      <div role="img" aria-label="今日の記録位置" style="position: relative; height: 10px; flex: none; border-radius: 99px; background: var(--fill)">
        <span v-for="(l, i) in marks" :key="i" :style="{ position: 'absolute', top: 0, bottom: 0, width: '3px', borderRadius: '2px', left: l, background: 'var(--c1)' }" />
        <span :style="{ position: 'absolute', top: '-3px', bottom: '-3px', width: '2px', borderRadius: '2px', left: dayNow, background: 'var(--text)' }" />
      </div>
      <div class="mut num" aria-hidden="true" style="display: flex; justify-content: space-between; font-size: var(--fs-xs); margin-top: -6px"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
      <ol class="scr rev" style="list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; display: flex; flex-direction: column-reverse">
        <li v-if="!rows.length" class="empt" style="list-style: none">欄に書いて Enter か、下の定型ボタンで記録します</li>
        <li v-for="lg in rows" :key="lg.id" class="tl"><span class="cap num tlt">{{ lg.t }}</span><span class="tld" aria-hidden="true" /><span class="tx">{{ lg.x }}</span></li>
      </ol>
    </div>
  </WidgetFrame>
</template>
