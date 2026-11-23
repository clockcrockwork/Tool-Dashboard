<script setup lang="ts">
/**
 * Mount point for the overlay layers: ページ読み込みの帯, 一時利用の帯, ダイアログ, ツールチップ, 最初の案内,
 * 上部の帯, その他メニュー・選択メニュー, and the selection ring inside `.pages`.
 * Root listeners (tooltip, widget menu, notices) attach to the `.dash` element on mount, so DashboardRoot
 * needs no changes. Ported from Main.dc.html (markup 689–698, 1700–1709, 1772–1783, 1975–1984;
 * componentDidMount `_tl` / `mnL`, componentDidUpdate `--tw` `--th` and dialog focus).
 */
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useDash } from '../../context';
import {
  DIALOG_SAMPLES, installPrompt, pageLoading, sampleNotice, showNotice, tempSize, type Tip,
} from '../../store/overlays';
import { attachPointer } from './pointer';
import { watchNotices } from './notices';
import MenuLayer from './MenuLayer.vue';
import DialogLayer from './DialogLayer.vue';
import TourCard from './TourCard.vue';
import TempBar from './TempBar.vue';
import TopBars from './TopBars.vue';
import SelectionRing from './SelectionRing.vue';

const d = useDash();
const anchor = ref<HTMLElement | null>(null);
const pagesEl = shallowRef<HTMLElement | null>(null);
const tip = ref<Tip | null>(null);
const cleanups: (() => void)[] = [];
let root: HTMLElement | null = null;

// The menu hides any tooltip (prototype mnOpen: `tip: null`).
watch(() => d.ui.mn, (mn) => { if (mn) tip.value = null; });

// Flash ring for 1.6 s (prototype `flashOn`).
let ft: ReturnType<typeof setTimeout> | undefined;
watch(() => d.ui.flash, (id) => {
  clearTimeout(ft);
  if (id) ft = setTimeout(() => { if (d.ui.flash === id) d.ui.flash = null; }, 1600);
});

// --tw / --th for temporary use (componentDidUpdate `tp !== this._tpv`).
watch(() => d.ui.temp, (tp) => {
  const sz = tp ? tempSize(tp) : null;
  if (!root || !sz) return;
  root.style.setProperty('--tw', sz.tw);
  root.style.setProperty('--th', sz.th);
}, { flush: 'post' });

onMounted(() => {
  root = anchor.value?.closest<HTMLElement>('.dash') ?? null;
  if (!root) return;
  pagesEl.value = root.querySelector<HTMLElement>(':scope > .pages');
  const p = attachPointer(root, d, tip);
  cleanups.push(p.detach);
  cleanups.push(watchNotices(root, d));
  const bip = (e: Event): void => { e.preventDefault(); installPrompt.value = e as typeof installPrompt.value; };
  const inst = (): void => { installPrompt.value = null; d.toast('アプリとして入れました', 'ok'); };
  window.addEventListener('beforeinstallprompt', bip);
  window.addEventListener('appinstalled', inst);
  cleanups.push(() => { window.removeEventListener('beforeinstallprompt', bip); window.removeEventListener('appinstalled', inst); });
  const tp = d.ui.temp ? tempSize(d.ui.temp) : null;
  if (tp) { root.style.setProperty('--tw', tp.tw); root.style.setProperty('--th', tp.th); }
  if (import.meta.env.DEV) {
    // Display-test hooks (表示テスト) until the share widget and the Service Worker exist.
    const w = window as unknown as Record<string, unknown>;
    w.__lgdOverlays = {
      notice: () => { showNotice(d, sampleNotice(d)); },
      upd: () => { Object.assign(d.ui, { upd: true, updLater: false, panel: 'none' }); },
      page: () => { pageLoading(d); },
      alert: () => { d.ui.panel = 'none'; d.confirm(DIALOG_SAMPLES.alert()); },
      confirm: () => { d.ui.panel = 'none'; d.confirm(DIALOG_SAMPLES.confirm(d)); },
    };
    cleanups.push(() => { delete w.__lgdOverlays; });
  }
});
onBeforeUnmount(() => { clearTimeout(ft); cleanups.forEach((f) => { f(); }); });
</script>

<template>
  <div ref="anchor" class="pgb" :class="{ open: !!d.ui.pageLoad }" role="progressbar" aria-label="ページを読み込み中"><div /></div>
  <TempBar />
  <DialogLayer />
  <div class="tip" :class="{ open: !!tip }" role="tooltip" :style="{ left: (tip?.x ?? 0) + 'px', top: (tip?.y ?? 0) + 'px' }">{{ tip?.text }}<kbd v-if="tip?.key">{{ tip.key }}</kbd></div>
  <TourCard />
  <TopBars />
  <MenuLayer />
  <Teleport v-if="pagesEl" :to="pagesEl"><SelectionRing /></Teleport>
</template>
