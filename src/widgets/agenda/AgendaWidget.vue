<script setup lang="ts">
/**
 * 予定 (agenda) — 2×2, vd. 日時順の行の一覧（縦スクロール）。メモから追加される（`memo/transfer.ts`）。
 * Prototype: Main.dc.html section data-w="agenda" (markup 832–843); `events`, `whenText`, `none.agenda`, `none.toMemo`.
 * 「今日」「明日」は日付で決まるので、表示中だけ進む時計から取る（日が変わったら描き直す。登録の `refresh`）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { dayStart, useShownNow } from '../shared/time';
import type { AgendaData } from './data';
import { AGENDA_EMPTY, eventRows } from './agenda';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const day = computed(() => dayStart(now.value));
const rows = computed(() => eventRows(w.data<AgendaData>().events, day.value));

/** 「メモを開く」: the first メモ placement (`memo`), like メモ adds to the first 予定 (choosing another one comes with 複数配置, P3). */
function toMemo(): void {
  d.openWidget('memo');
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; justify-content: center; gap: 4px; padding-inline: 18px">
      <div class="scr" style="flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 4px">
        <div v-if="!rows.length" class="empt"><span>{{ AGENDA_EMPTY }}</span><button class="chip sm" @click="toMemo">メモを開く</button></div>
        <div v-for="ev in rows" :key="ev.id" class="row"><span class="pt" :style="{ background: ev.c }" /><span class="mut num" style="width: 76px; flex: none; font-size: var(--fs-s)">{{ ev.w }}</span><span class="tt">{{ ev.n }}</span></div>
      </div>
    </div>
  </WidgetFrame>
</template>
