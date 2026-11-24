<script setup lang="ts">
/**
 * 確認と警告のダイアログ `.dscrim` `.dlg` (仕様書 3章, 5章). Markup: Main.dc.html 692–697.
 * Focus goes to OK for a notice and to キャンセル for an irreversible confirmation; Esc and the dark
 * backdrop cancel; focus returns to the opener. While open, `.sheet` gets inert (`.pages` and `.nav`
 * already follow `d.ui.dlg`). A `<dialog>` + showModal() swap is planned for P3.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useDash } from '../../context';

const d = useDash();
const el = ref<HTMLElement | null>(null);
const spec = computed(() => d.ui.dlg);
const okCls = computed(() => (spec.value ? (spec.value.bad ? 'bad' : 'pri') : ''));

let ret: HTMLElement | null = null;
let inerted: Element[] = [];

// Remember the opener synchronously, before inert moves focus away.
watch(() => d.ui.dlg, (v, old) => {
  if (v && !old && !ret && document.activeElement instanceof HTMLElement) ret = document.activeElement;
}, { flush: 'sync' });

watch(() => d.ui.dlg, (v, old) => {
  const root = el.value?.closest('.dash');
  if (!root) return;
  if (v) {
    root.querySelectorAll('.sheet').forEach((s) => {
      if (s instanceof HTMLElement && !s.inert) { s.inert = true; inerted.push(s); }
    });
    if (!old) {
      void nextTick(() => {
        const bs = root.querySelectorAll<HTMLElement>('.dlg.open .dla .chip');
        const b = bs.length > 1 ? bs[0] : bs[bs.length - 1];
        b?.focus();
      });
    }
    return;
  }
  inerted.forEach((s) => { if (s instanceof HTMLElement) s.inert = false; });
  inerted = [];
  const r = ret;
  ret = null;
  if (r?.isConnected) r.focus();
}, { flush: 'post' });
onBeforeUnmount(() => { inerted.forEach((s) => { if (s instanceof HTMLElement) s.inert = false; }); });

function onKey(e: KeyboardEvent): void {
  e.stopPropagation();
  if (e.key === 'Escape') { e.preventDefault(); d.dialogCancel(); }
}
</script>

<template>
  <div class="dscrim" :class="{ open: !!spec }" aria-hidden="true" @click="d.dialogCancel()" />
  <div ref="el" class="dlg" :class="{ open: !!spec }" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg" @keydown="onKey">
    <h2 id="dlg-title">{{ spec?.title }}</h2>
    <p id="dlg-msg">{{ spec?.msg }}</p>
    <div class="dla"><button v-if="spec?.two" class="chip" @click="d.dialogCancel()">キャンセル</button><button class="chip" :class="okCls" @click="d.dialogOk()">{{ spec?.okLabel }}</button></div>
  </div>
</template>
