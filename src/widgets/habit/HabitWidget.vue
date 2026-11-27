<script setup lang="ts">
/**
 * ハビット (habit) — 2×1. 切替の丸ボタン群（項目ごとに達成のオン・オフ）。項目の編集（名前・アイコン・画像）は設定シートの共通の仕組み.
 * Prototype: Main.dc.html section data-w="habit" (markup 884–894); `habits`, `none.habit`, `none.habitAdd` in `renderVals()`.
 * 「達成を通知」は共通の通知（`notify()`）。人前では隠すの伏せ方・設定のオフ・重複は共通の仕組みが受け持つ。押したときの知らせで
 * 画面を見ているので、ブラウザの通知の許可のお願いはしない（期限で知らせる種類ではない）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { notify } from '../../app/runtime/notify';
import type { HabitData } from './data';
import { HABIT_EMPTY, achievedKey, achievedText, habitView, toggleHabit } from './habit';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const items = computed(() => (w.data<HabitData>().items ?? []).map(habitView));

function tap(id: number): void {
  const r = toggleHabit(w.data<HabitData>().items, id);
  w.setData<HabitData>({ ...w.data<HabitData>(), items: r.items });
  if (r.done) notify(d, w.id, { key: achievedKey(w.id, r.done, d.now()), text: achievedText(r.done), kind: 'ok' });
}
function openItems(): void {
  Object.assign(d.ui, { edit: true, sel: w.id, panel: 'widget' });
}
</script>

<template>
  <WidgetFrame heading="ハビットトラッカー">
    <div class="in" style="align-items: center; align-content: center; justify-content: space-evenly; flex-wrap: wrap; gap: 8px">
      <div v-if="!items.length" class="empt"><span>{{ HABIT_EMPTY }}</span><button class="chip sm" @click="openItems">項目を追加</button></div>
      <button v-for="h in items" :key="h.id" class="btn" :class="h.on ? 'on' : ''" :aria-label="h.label" :aria-pressed="h.on" style="width: min(60cqh, 20cqw); height: min(60cqh, 20cqw)" @click="tap(h.id)"><svg v-if="!h.img" class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 24px; height: 24px"><path :d="h.d" /></svg><img v-else class="hbi" alt="" :src="h.img"></button>
    </div>
  </WidgetFrame>
</template>
