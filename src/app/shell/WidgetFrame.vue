<script setup lang="ts">
/**
 * 共通の枠 `.w` (仕様書 3章「ウィジェットの規約」, 部品シート 7章).
 * Invisible h2 heading + role=group, privacy veil, network mark and state overlay (`.sto`)
 * are provided here so tool content never re-implements them. Grid placement comes from the shell.
 */
import { computed } from 'vue';
import { useDash, useWidget, widgetContext } from '../context';
import { IC } from '../parts/icons';
import Icon from '../parts/LineIcon.vue';

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
  /** Show the network mark (registry net: 'data'). */
  net?: boolean;
  /** Render the shared state overlay `.sto` (widgets with loading/empty/error states). */
  states?: boolean;
}>(), { id: undefined, heading: '', stateClass: '', stMsg: '', stAct: '', stSub: '', net: false, states: false });
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
</script>

<template>
  <section
    class="w"
    :class="[d.frameClass(wid), stateClass]"
    :data-w="w.kind"
    :data-wid="wid"
    role="group"
    :aria-labelledby="'wh-' + wid"
    :style="style"
  >
    <h2 :id="'wh-' + wid" class="vh">{{ name }}</h2>
    <slot name="before" />
    <div class="veilc">
      <Icon :d="IC.eyeOff" />
      <button class="chip sm" :aria-label="name + 'を表示する'" @click="d.ui.peek = { ...d.ui.peek, [wid]: true }">表示する</button>
    </div>
    <template v-if="net">
      <span class="cdot" :class="offline ? 'offl' : ''" aria-hidden="true" />
      <span class="vh">{{ offline ? 'オフライン。前回の内容です' : '未接続。見本のデータです' }}</span>
    </template>
    <template v-if="states">
      <div class="sto">
        <div class="sk" aria-hidden="true"><span /><span /><span /></div>
        <span class="sp" role="status" aria-label="更新中" />
        <div class="stm"><p>{{ stMsg }}</p><button class="chip" @click="emit('retry')">{{ stAct }}</button><p class="cap">{{ stSub }}</p></div>
      </div>
    </template>
    <slot />
  </section>
</template>
