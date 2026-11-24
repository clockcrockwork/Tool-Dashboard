<script setup lang="ts">
/**
 * 選んだウィジェットの枠 `.selring` (Main.dc.html 1700). Shown for the widget being set up in edit mode,
 * and for 1.6 s on a widget reached from the index or just placed (`d.ui.flash`).
 * Lives in the `.pages` grid; OverlaysHost teleports it there.
 */
import { computed } from 'vue';
import { useDash } from '../../context';

const d = useDash();
const L = computed(() => d.layout.value);
const flash = computed(() => (d.ui.flash && L.value.pos[d.ui.flash] ? d.ui.flash : null));
const live = computed(() => (d.ui.sel && !d.g.off[d.ui.sel] && L.value.pos[d.ui.sel] ? d.ui.sel : null));
const show = computed(() => (d.ui.panel === 'widget' && !!live.value) || !!flash.value);
const area = computed(() => {
  const id = flash.value ?? live.value;
  return (id ? L.value.area[id] : undefined) ?? '1 / 1 / span 1 / span 1';
});
</script>

<template>
  <div class="selring" :class="{ off: !show }" aria-hidden="true" :style="{ gridArea: area }" />
</template>
