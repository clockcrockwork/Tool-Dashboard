<script setup lang="ts">
/** 検索 (search) — 3×1. Prototype: Main.dc.html section data-w="search" (markup 1121–1135), `searchKey`. */
import { computed, ref } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { SCOPE_NAMES, buildSearchUrl, isCustomUrl, newTabText, searchLabel } from './search';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
/** 検索対象 (Web/画像/動画). Not saved, like the prototype `scope`. */
const scope = ref(0);
const ph = computed(() => searchLabel(w.cfg('eng'), w.cfg('url')));
const showScopes = computed(() => !isCustomUrl(w.cfg('url')));

function onKey(e: KeyboardEvent): void {
  e.stopPropagation();
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  const eng = w.cfg('eng'), url = w.cfg('url');
  const target = buildSearchUrl({ eng, url, scope: scope.value, q: (e.target as HTMLInputElement).value });
  if (!target) return;
  const newTab = !!w.cfg('tab');
  try {
    if (newTab) window.open(target, '_blank', 'noopener');
    else window.location.assign(target);
  } catch { /* sandboxed */ }
  if (newTab) d.toast(newTabText(eng, url, scope.value), 'info');
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="align-items: center; align-content: center; flex-wrap: wrap; gap: 8px">
      <div style="flex: 1 1 150px; min-width: 0; position: relative; display: flex; align-items: center">
        <svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="position: absolute; left: 14px; color: var(--mut)"><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l4.5 4.5" /></svg>
        <input class="inp" type="search" :placeholder="ph" :aria-label="ph" style="padding-left: 42px; border-radius: 999px" @keydown="onKey">
      </div>
      <div v-if="showScopes" class="seg" role="group" aria-label="検索対象">
        <button v-for="(l, i) in SCOPE_NAMES" :key="l" class="sg" :class="i === scope ? 'on' : ''" :aria-pressed="i === scope" @click="scope = i">{{ l }}</button>
      </div>
    </div>
  </WidgetFrame>
</template>
