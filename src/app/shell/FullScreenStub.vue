<script setup lang="ts">
/**
 * The shell's stand-in for a full-screen view (`.fsw`, 仕様書 2章「全画面ウィジェット」) when the kind's own view must not or
 * cannot be drawn:
 *  - `veil`: 人前では隠す is on for this placement (review #6). The prototype has no full-screen veil; like a widget face it
 *    shows only the closed-eye mark and 「表示する」 (`.veilc`), and the view's content is not created at all.
 *  - `pending`: the kind can go full-screen (`pg`) but has no full-screen view yet (review #9): 「準備中です」.
 * Placement on the grid is the same as the kinds' views (one whole screen, reaching the screen edges).
 */
import { computed } from 'vue';
import { useDash } from '../context';
import { kindOf, nameOf } from '../registry/instances';
import { IC } from '../parts/icons';
import Icon from '../parts/LineIcon.vue';
import CoverCard from './CoverCard.vue';
import { PENDING_COVER } from './cover';

const props = defineProps<{ id: string; mode: 'veil' | 'pending' }>();
const d = useDash();
const name = computed(() => nameOf(props.id));
const L = computed(() => d.layout.value);
const page = computed(() => L.value.fullScreens.find(s => s.id === props.id)?.page ?? 0);
const style = computed(() => ({
  gridArea: '1 / ' + String(page.value * L.value.cols + 1) + ' / span ' + String(L.value.rows) + ' / span ' + String(L.value.cols),
  margin: '-' + String(14 + d.env.sat) + 'px -' + String(L.value.gap / 2) + 'px -' + String(66 + d.env.sab) + 'px',
}));
function peek(): void { d.ui.peek = { ...d.ui.peek, [props.id]: true }; }
</script>

<template>
  <section class="fsw" :class="mode === 'veil' ? 'veil' : ''" :data-w="kindOf(id)" :data-wid="id" :aria-label="name" :style="style">
    <div v-if="mode === 'veil'" class="veilc">
      <Icon :d="IC.eyeOff" />
      <button class="chip sm" :aria-label="name + 'を表示する'" @click="peek">表示する</button>
    </div>
    <CoverCard v-else :cover="PENDING_COVER" :label-id="'pm-' + id" />
  </section>
</template>
