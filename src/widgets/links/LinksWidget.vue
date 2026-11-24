<script setup lang="ts">
/** クイックリンク (links) — 2×1. Prototype: Main.dc.html section data-w="links" (markup 921–930), `links`, `none.links`. */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import type { LinksData } from './data';
import { linkView, type LinkView } from './links';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const items = computed(() => w.data<LinksData>().items.map(linkView));

function tap(l: LinkView): void {
  if (l.url) { try { window.open(l.url, '_blank', 'noopener'); } catch { /* sandboxed */ } }
  else d.toast(l.missing, 'info');
}
function openItems(): void {
  Object.assign(d.ui, { edit: true, sel: w.id, panel: 'widget' });
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="align-items: center; justify-content: space-evenly; gap: 6px; flex-wrap: wrap; align-content: center">
      <div v-if="!items.length" class="empt"><span>よく開くページを登録します</span><button class="chip sm" @click="openItems">リンクを追加</button></div>
      <button v-for="l in items" :key="l.id" class="btn" :aria-label="l.label" style="border-radius: var(--r3); width: 48px; height: 48px" @click="tap(l)"><svg v-if="!l.img" class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 22px; height: 22px"><path :d="l.d" /></svg><img v-else class="hbi" alt="" :src="l.img"></button>
    </div>
  </WidgetFrame>
</template>
