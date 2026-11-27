<script setup lang="ts">
/**
 * 共通の枠 `.w` (仕様書 3章「ウィジェットの規約」, 部品シート 7章).
 * Invisible h2 heading + role=group, privacy veil, network mark, state overlay (`.sto`) and the card that replaces the
 * content (`.pmw`: permission request, 準備中) are provided here so tool content never re-implements them. What to draw
 * comes from the registry (実装ガイド 4章「通信と許可の出し方」): the network mark for `net: 'data'` (not for `dl` / `own`),
 * the state overlay for kinds whose `states` include an overlay state. Grid placement comes from the shell.
 *
 * 許可のお願い of a kind with `perm: ['notify']` comes from the shared notification (`notifyCover`, `runtime/notify.ts`): the
 * widget only starts the request from an explicit operation (`askNotify`); a `cover` passed by the widget wins.
 *
 * 人前では隠す comes first (仕様書 3章): while hidden, the overlay and the replacing card are not created at all, and the
 * content is hidden from view and from screen readers (`overrides.css`, also over the 1×1 rule of the prototype CSS).
 */
import { computed } from 'vue';
import { useDash, useWidget, widgetContext } from '../context';
import { OVERLAY_STATES } from '../registry/registry';
import { IC } from '../parts/icons';
import Icon from '../parts/LineIcon.vue';
import CoverCard from './CoverCard.vue';
import type { WidgetCover } from './cover';
import { notifyCover } from '../runtime/notify';

const props = withDefaults(defineProps<{
  /** Placement ID. Omit inside a widget: the frame then uses the widget's own context (`useWidget()`). */
  id?: string | undefined;
  /** Override heading (prototype uses longer names for a few widgets). */
  heading?: string;
  /** State classes: s-load / s-stale / s-empty / s-err (仕様書 3章「状態」). */
  stateClass?: string;
  stMsg?: string;
  stAct?: string;
  stSub?: string;
  /** Replaces the content (permission request, 準備中). Null: none. */
  cover?: WidgetCover | null;
}>(), { id: undefined, heading: '', stateClass: '', stMsg: '', stAct: '', stSub: '', cover: null });
const emit = defineEmits<{ retry: [] }>();

const d = useDash();
const w = props.id !== undefined ? widgetContext(d, props.id) : useWidget();
/** Placement ID (grid area, heading id, peek, selection); `data-w` keeps the kind ID for kind-wide CSS. */
const wid = w.id;
const name = computed(() => props.heading || w.def.n);
const pos = computed(() => d.layout.value);
const style = computed(() => {
  const L = pos.value;
  const s: Record<string, string> = { gridArea: L.area[wid] ?? '1 / 1 / span 1 / span 1' };
  const ww = L.ww[wid], wh = L.wh[wid];
  if (ww !== undefined) s['--ww'] = String(ww);
  if (wh !== undefined) s['--wh'] = String(wh);
  return s;
});
const offline = computed(() => !d.ui.online);
const veiled = computed(() => d.veiled(wid));
/** 接続の点: only for kinds that fetch content (`net: 'data'`). */
const net = computed(() => w.def.net === 'data');
const overlay = computed(() => w.def.states.some(s => OVERLAY_STATES.includes(s)));
const card = computed<WidgetCover | null>(() => props.cover ?? (w.def.perm.includes('notify') ? notifyCover(d, wid) : null));
/** State classes are dropped while hidden, so nothing about the content (empty, failed…) shows or is announced. */
const stCls = computed(() => (veiled.value ? '' : props.stateClass));
</script>

<template>
  <section
    class="w"
    :class="[d.frameClass(wid), stCls]"
    :data-w="w.kind"
    :data-wid="wid"
    role="group"
    :aria-labelledby="'wh-' + wid"
    :style="style"
  >
    <h2 :id="'wh-' + wid" class="vh">{{ name }}</h2>
    <slot name="before" />
    <CoverCard v-if="card && !veiled" :cover="card" :label-id="'pm-' + wid" />
    <div class="veilc">
      <Icon :d="IC.eyeOff" />
      <button class="chip sm" :aria-label="name + 'を表示する'" @click="d.ui.peek = { ...d.ui.peek, [wid]: true }">表示する</button>
    </div>
    <template v-if="net">
      <span class="cdot" :class="offline ? 'offl' : ''" aria-hidden="true" />
      <span class="vh">{{ offline ? 'オフライン。前回の内容です' : '未接続。見本のデータです' }}</span>
    </template>
    <template v-if="overlay && !veiled">
      <div class="sto">
        <div class="sk" aria-hidden="true"><span /><span /><span /></div>
        <span class="sp" role="status" aria-label="更新中" />
        <div class="stm"><p>{{ stMsg }}</p><button class="chip" @click="emit('retry')">{{ stAct }}</button><p class="cap">{{ stSub }}</p></div>
      </div>
    </template>
    <slot />
  </section>
</template>
