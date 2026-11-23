<script setup lang="ts">
/**
 * Root `.dash`: wallpaper, the horizontally snapping screen grid, widgets, and the operation layer
 * (bottom bar, sheets, toasts…). Ported from design/claude-design/Main.dc.html (markup 686–2016).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { provideDash } from '../context';
import type { Dashboard } from '../store/store';
import { REGISTRY } from '../registry/registry';
import { FULLSCREEN, WIDGETS } from '../../widgets';
import { IC } from '../parts/icons';
import Icon from '../parts/LineIcon.vue';
import BottomNav from './BottomNav.vue';
import ToastStack from './ToastStack.vue';
import SheetsHost from './sheets/SheetsHost.vue';
import OverlaysHost from './overlays/OverlaysHost.vue';

const props = defineProps<{ dash: Dashboard }>();
const d = props.dash;
provideDash(d);

const root = ref<HTMLElement | null>(null);
const pages = ref<HTMLElement | null>(null);
const sap = ref<HTMLElement | null>(null);

const L = computed(() => d.layout.value);
const theme = computed(() => d.g.gs.theme ?? 'auto');
const hg = computed(() => L.value.gap / 2);
const padT = computed(() => 14 + d.env.sat);
const padB = computed(() => 66 + d.env.sab);
const gridStyle = computed(() => ({
  gridTemplateColumns: 'repeat(' + String(L.value.total * L.value.cols) + ', ' + String(L.value.cw) + 'px)',
  gridTemplateRows: 'repeat(' + String(L.value.rows) + ', minmax(0, 1fr))',
  gap: String(L.value.gap) + 'px',
  padding: String(padT.value) + 'px ' + String(hg.value) + 'px ' + String(padB.value) + 'px',
  scrollPaddingInline: String(hg.value) + 'px',
}));
const snaps = computed(() => Array.from({ length: L.value.total }, (_v, i) => '1 / ' + String(i * L.value.cols + 1) + ' / span 1 / span 1'));
/** Widgets rendered in the grid: implemented ones that are placed, or open for temporary use. */
const shown = computed(() => Object.keys(REGISTRY).filter(id => WIDGETS[id] && (!d.g.off[id] || d.ui.temp === id)));
/** Edit-mode marks for pinned / size-locked / hidden-in-public widgets (部品シート 7章「編集中の固定の印」). */
const marks = computed(() => {
  if (!d.ui.edit) return [];
  return shown.value.filter(id => !d.g.off[id] && !d.pgOn(id)).map(id => ({
    id, area: L.value.area[id] ?? '', p: !!d.g.pins[id], l: !!d.g.lockSz[id], v: d.veilOf(id),
  })).filter(m => m.p || m.l || m.v);
});
const empties = computed(() => L.value.empty.map((e, gi) => (e ? { gi, area: '1 / ' + String((L.value.first[gi] ?? 0) * L.value.cols + 1) + ' / span ' + String(L.value.rows) + ' / span ' + String(L.value.cols) } : null)).filter(x => x !== null));
const fullScreenIds = computed(() => Object.keys(FULLSCREEN));
const sheetModal = computed(() => ['global', 'index', 'add', 'help', 'devices'].includes(d.ui.panel));
const scrimOpen = computed(() => !!d.ui.big && (!d.g.off[d.ui.big] || d.ui.temp === d.ui.big));

function openAddFor(gi: number): void {
  d.openPanel('add', { addFrom: 'empty', tgt: d.g.groups[gi]?.id ?? null, sel: null });
}

// ----- screen movement: animate only the last screen (実装ガイド 2章「画面切替」) -----
let pend: number | null = null;
let pendTimer: ReturnType<typeof setTimeout> | undefined;
function scrollTo(p: number, smooth: boolean): void {
  const sc = pages.value;
  if (!sc) return;
  pend = p;
  clearTimeout(pendTimer);
  pendTimer = setTimeout(() => { pend = null; }, 900);
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim = smooth && !calm;
  const cw = sc.clientWidth || 1;
  const cur = Math.round(sc.scrollLeft / cw);
  if (anim && Math.abs(p - cur) > 1) sc.scrollTo({ left: (p - Math.sign(p - cur)) * cw, behavior: 'auto' });
  sc.scrollTo({ left: p * cw, behavior: anim ? 'smooth' : 'auto' });
}
let scrollTimer: ReturnType<typeof setTimeout> | undefined;
let raf = 0;
function onScroll(e: Event): void {
  const el = e.currentTarget as HTMLElement;
  if (!el.clientWidth) return;
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    pend = null;
    const q = Math.round(el.scrollLeft / el.clientWidth);
    if (q !== d.ui.page) d.ui.page = q;
  }, 140);
  if (pend !== null || raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const p = Math.round(el.scrollLeft / el.clientWidth);
    if (p !== d.ui.page) d.ui.page = p;
  });
}
let wheelAt = 0;
function onWheel(e: WheelEvent): void {
  if (!d.g.gs.wheel) return;
  const t = e.target as Element | null;
  const box = t?.closest?.('.scr,.pvw,.mdta,.sheet,.tbw') as HTMLElement | null;
  if (box && box.scrollHeight > box.clientHeight + 1) {
    const top = Math.abs(box.scrollTop), room = box.scrollHeight - box.clientHeight;
    if (box.classList.contains('rev') || (e.deltaY < 0 ? top > 0 : top < room - 1)) return;
  }
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || Math.abs(e.deltaY) < 24) return;
  const now = Date.now();
  if (wheelAt && now - wheelAt < 650) return;
  wheelAt = now;
  d.go(d.page + (e.deltaY > 0 ? 1 : -1));
}
function onKey(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === 'ArrowRight') { e.preventDefault(); d.next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); d.prev(); }
  else if (e.key === 'Home') { e.preventDefault(); d.goHome(); }
  else if (e.key === 'Escape') { e.preventDefault(); d.back(); }
  else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); d.undo(); }
  else if (!d.g.gs.keys1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) return;
  else if (e.key === '/') { e.preventDefault(); Object.assign(d.ui, { panel: d.ui.panel === 'index' ? 'none' : 'index', sel: null, edit: false }); }
  else if (e.key === ',') Object.assign(d.ui, { panel: d.ui.panel === 'global' ? 'none' : 'global', sel: null, edit: false });
  else if (e.key === 'e') Object.assign(d.ui, { edit: !d.ui.edit, panel: 'none', sel: null });
  else if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) d.go(Number(e.key) - 1);
}
function onGridClick(e: MouseEvent): void {
  if (!d.ui.edit || d.ui.big) return;
  const el = (e.target as Element | null)?.closest?.('[data-w]');
  if (!el) { Object.assign(d.ui, { panel: 'none', sel: null }); return; }
  Object.assign(d.ui, { sel: el.getAttribute('data-w'), panel: 'widget' });
}

// ----- environment -----
const cleanups: (() => void)[] = [];
function measure(): void {
  const sc = pages.value;
  d.env.width = sc?.clientWidth || window.innerWidth || 1440;
  d.env.height = sc?.clientHeight || window.innerHeight || 900;
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  d.env.fontScale = fs / 16;
  if (sap.value) {
    const cs = getComputedStyle(sap.value);
    d.env.sat = Math.round(parseFloat(cs.paddingTop) || 0);
    d.env.sab = Math.round(parseFloat(cs.paddingBottom) || 0);
  }
}
function listen<K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, capture = false): void {
  window.addEventListener(type, fn, capture);
  cleanups.push(() => { window.removeEventListener(type, fn, capture); });
}

onMounted(() => {
  cleanups.push(d.start());
  d.onGo = (p, smooth) => { scrollTo(p, smooth); };
  measure();
  const ro = new ResizeObserver(() => { measure(); fixScroll(); });
  if (pages.value) ro.observe(pages.value);
  cleanups.push(() => { ro.disconnect(); });
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  const mqFine = window.matchMedia('(pointer: fine)');
  const sync = (): void => { d.env.prefersDark = mqDark.matches; d.env.finePointer = mqFine.matches; };
  sync();
  mqDark.addEventListener('change', sync);
  cleanups.push(() => { mqDark.removeEventListener('change', sync); });
  d.ui.online = navigator.onLine;
  listen('online', () => { d.ui.online = true; });
  listen('offline', () => { d.ui.online = false; });
  const iv = setInterval(() => { d.ui.t = d.now(); }, 1000);
  cleanups.push(() => { clearInterval(iv); });
  // #p=3 opens that screen in this tab only (仕様書 2章).
  const m = /[#&]p=(\d+)/.exec(window.location.hash);
  const start = m ? Math.max(0, Number(m[1]) - 1) : d.homeIndex();
  if (start > 0) d.go(start, false);
  // Focus the search box on open for mouse users (仕様書 2章).
  if (mqFine.matches && d.g.gs.autoq && d.ui.tour < 0 && !d.g.off.search) {
    // Widgets load asynchronously; wait (up to ~2s) until the search box exists.
    let tries = 0;
    const tryFocus = (): void => {
      const q = root.value?.querySelector<HTMLInputElement>('[data-w="search"] input');
      if (q) { q.focus({ preventScroll: true }); return; }
      if (++tries < 120) requestAnimationFrame(tryFocus);
    };
    requestAnimationFrame(tryFocus);
  }
});
onBeforeUnmount(() => { cleanups.forEach(f => { f(); }); d.onGo = null; });

function fixScroll(): void {
  const sc = pages.value;
  if (!sc) return;
  const x = d.page * sc.clientWidth;
  if (Math.abs(sc.scrollLeft - x) > 1) sc.scrollLeft = x;
}
watch(() => [L.value.total, L.value.cols, L.value.cw], () => { requestAnimationFrame(fixScroll); });
watch(() => d.ui.page, p => {
  try { window.history.replaceState(null, '', '#p=' + String(p + 1)); } catch { /* sandboxed */ }
});
</script>

<template>
  <div
    ref="root"
    class="dash"
    :class="{ edit: d.ui.edit }"
    :data-theme="theme"
    tabindex="0"
    :style="[{ position: 'relative', height: '100vh', minHeight: '480px', overflow: 'hidden' }, d.rootVars()]"
    @keydown="onKey"
  >
    <div class="amb" aria-hidden="true" />
    <div ref="sap" class="sap" aria-hidden="true" />
    <div class="scrim" :class="{ open: scrimOpen }" aria-hidden="true" @click="d.back()" />

    <div
      ref="pages"
      class="pages"
      :inert="!!d.ui.dlg || (sheetModal && !d.ui.big) || undefined"
      :style="gridStyle"
      @scroll="onScroll"
      @wheel="onWheel"
      @click="onGridClick"
    >
      <div v-for="(area, i) in snaps" :key="'s' + i" class="snap" aria-hidden="true" :style="{ gridArea: area }" />
      <div v-for="mk in marks" :key="'m' + mk.id" class="wmk" aria-hidden="true" :style="{ gridArea: mk.area }">
        <Icon v-if="mk.p" :d="IC.pin" /><Icon v-if="mk.l" :d="IC.lock" /><Icon v-if="mk.v" :d="IC.eyeOff" />
      </div>
      <div v-for="em in empties" :key="'e' + em.gi" :style="{ gridArea: em.area, display: 'grid', placeItems: 'center', zIndex: 1 }">
        <button class="chip" @click="openAddFor(em.gi)"><Icon :d="IC.plus" :size="18" />ウィジェットを追加</button>
      </div>
      <component :is="WIDGETS[id]" v-for="id in shown" :key="id" />
      <component :is="FULLSCREEN[id]" v-for="id in fullScreenIds" :key="'fs-' + id" />
    </div>

    <div class="sscrim" :class="{ open: sheetModal }" aria-hidden="true" @click="d.back()" />
    <div class="epill" :class="{ open: d.ui.edit && d.ui.panel === 'none' && !d.ui.big }" role="status">編集中：ウィジェットをタップすると設定できます</div>
    <SheetsHost />
    <ToastStack />
    <OverlaysHost />
    <BottomNav />
  </div>
</template>
