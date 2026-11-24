<script setup lang="ts">
/**
 * その他メニュー (role=menu) と 選択メニュー (role=listbox) `.mnuw` `.mnu` (仕様書 4章「部品の使い場所」, 部品シート 6章).
 * Markup: design/claude-design/Main.dc.html 1975–1984. Geometry and rows: `xVals` / `wMenu` / `mnKey` / `mnDid`.
 */
import { computed, nextTick, ref, watch } from 'vue';
import { useDash } from '../../context';
import { defOf } from '../../registry/instances';
import {
  MI, closeMenu, hasFilter, menuGeometry, menuHeight, menuKeyTarget, menuRuntime, selectMenuItems, selectOptions, widgetMenuItems, type MenuItem,
} from '../../store/overlays';
import Icon from '../../parts/LineIcon.vue';

const d = useDash();
const box = ref<HTMLElement | null>(null);

const opts = computed(() => (d.ui.mn?.kind === 'select' ? selectOptions(d, d.ui.mn.id) : []));
const items = computed<MenuItem[]>(() => {
  const mn = d.ui.mn;
  if (!mn) return [];
  return mn.kind === 'select' ? selectMenuItems(d, mn.id, opts.value) : widgetMenuItems(d, mn.id);
});
const hasQ = computed(() => d.ui.mn?.kind === 'select' && hasFilter(opts.value.length));
const role = computed(() => (d.ui.mn?.kind === 'select' ? 'listbox' : 'menu'));
const label = computed(() => {
  const mn = d.ui.mn;
  if (!mn) return '';
  return mn.kind === 'select' ? d.ui.mnAt?.al ?? '' : (defOf(mn.id)?.n ?? '') + ' の操作';
});
const geo = computed(() => {
  const mn = d.ui.mn;
  if (!mn) return { x: 0, y: 0, origin: '50% 0', dock: '' as const };
  const at = d.ui.mnAt;
  return at ? menuGeometry(mn.kind, at, menuHeight(items.value, hasQ.value)) : { x: mn.x, y: mn.y, origin: mn.origin, dock: mn.dock };
});
const itemCls = (y: MenuItem): string => (y.on && y.kind === 'opt' ? 'on' : '') + (y.bad ? ' bad' : '');

/** Focus on open: the filter, the chosen option, or the first row (prototype `mnDid`). */
watch(() => d.ui.mn, (mn) => {
  const rt = menuRuntime(d);
  if (!mn || !rt.focus) return;
  rt.focus = false;
  void nextTick(() => {
    const el = box.value?.querySelector<HTMLElement>('.mnf') ?? box.value?.querySelector<HTMLElement>('.mi.on') ?? box.value?.querySelector<HTMLElement>('[data-mi]');
    el?.focus();
  });
}, { flush: 'post' });

function onKey(e: KeyboardEvent): void {
  e.stopPropagation();
  const el = box.value;
  if (!el) return;
  const its = Array.from(el.querySelectorAll<HTMLElement>('[data-mi]'));
  const i = its.indexOf(document.activeElement as HTMLElement);
  const k = e.key;
  if (k === 'Escape') { e.preventDefault(); closeMenu(d, true); return; }
  if (k === 'Tab') { closeMenu(d, false); return; }
  const inInput = (e.target as HTMLElement | null)?.tagName === 'INPUT';
  const j = menuKeyTarget(its.map(b => b.textContent ?? ''), i, k, inInput, e.ctrlKey || e.metaKey || e.altKey);
  if (j === null) return;
  e.preventDefault();
  its[j]?.focus();
}
function onBg(e: MouseEvent): void {
  if (e.target instanceof Element && e.target.classList.contains('mnuw')) closeMenu(d, true);
}
function onQ(e: Event): void {
  d.ui.mnQ = (e.target as HTMLInputElement).value;
}
</script>

<template>
  <div class="mnuw" :class="{ open: !!d.ui.mn }" @click="onBg">
    <div
      ref="box"
      class="mnu" :class="{ dock: geo.dock === 'sheet' }" :role="role" :aria-label="label"
      :style="{ left: geo.x + 'px', top: geo.y + 'px', transformOrigin: geo.origin }" @keydown="onKey"
    >
      <input v-if="hasQ" class="inp mnf" type="search" aria-label="絞り込む" placeholder="絞り込む" :value="d.ui.mnQ" @input="onQ">
      <template v-for="(mi, n) in items" :key="n">
        <div v-if="mi.sep" class="msep" role="separator" />
        <button v-if="mi.kind === 'opt'" class="mi" :class="itemCls(mi)" role="option" :aria-selected="mi.on ? 'true' : 'false'" tabindex="-1" data-mi="1" @click="mi.tap()"><Icon v-if="mi.d" :d="mi.d" />{{ mi.l }}</button>
        <button v-if="mi.kind === 'cmd'" class="mi" :class="itemCls(mi)" role="menuitem" tabindex="-1" data-mi="1" @click="mi.tap()"><Icon v-if="mi.d" :d="mi.d" />{{ mi.l }}</button>
        <button v-if="mi.kind === 'chk'" class="mi" :class="itemCls(mi)" role="menuitemcheckbox" :aria-checked="mi.on ? 'true' : 'false'" tabindex="-1" data-mi="1" @click="mi.tap()"><Icon :d="mi.d" />{{ mi.l }}<span v-if="mi.on" class="mck"><Icon :d="MI.chk" :size="18" /></span></button>
      </template>
    </div>
  </div>
</template>
