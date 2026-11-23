<script setup lang="ts">
/**
 * 共通の枠 `.w` (仕様書 3章「ウィジェットの規約」, 部品シート 7章).
 * Invisible h2 heading + role=group, privacy veil, network mark and state overlay (`.sto`)
 * are provided here so tool content never re-implements them. Grid placement comes from the shell.
 */
import { computed } from 'vue';
import { useDash } from '../context';
import { REGISTRY } from '../registry/registry';
import { IC } from '../parts/icons';
import Icon from '../parts/LineIcon.vue';

const props = withDefaults(defineProps<{
  id: string;
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
}>(), { stateClass: '', stMsg: '', stAct: '', stSub: '', net: false, states: false });
const emit = defineEmits<{ retry: [] }>();

const d = useDash();
const name = computed(() => props.heading ?? REGISTRY[props.id]?.n ?? props.id);
const pos = computed(() => d.layout.value);
const style = computed(() => {
  const L = pos.value;
  const s: Record<string, string> = { gridArea: L.area[props.id] ?? '1 / 1 / span 1 / span 1' };
  const ww = L.ww[props.id], wh = L.wh[props.id];
  if (ww !== undefined) s['--ww'] = String(ww);
  if (wh !== undefined) s['--wh'] = String(wh);
  return s;
});
const offline = computed(() => !d.ui.online);
</script>

<template>
  <section
    class="w"
    :class="[d.frameClass(id), stateClass]"
    :data-w="id"
    role="group"
    :aria-labelledby="'wh-' + id"
    :style="style"
  >
    <h2 :id="'wh-' + id" class="vh">{{ name }}</h2>
    <slot name="before" />
    <div class="veilc">
      <Icon :d="IC.eyeOff" />
      <button class="chip sm" :aria-label="name + 'を表示する'" @click="d.ui.peek = { ...d.ui.peek, [id]: true }">表示する</button>
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
