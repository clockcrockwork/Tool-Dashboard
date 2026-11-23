<script setup lang="ts">
/**
 * Mount point for all sheets (全体設定・一覧・追加・ウィジェットの設定・操作ヒント・端末をつなぐ).
 * Sheets stay in the DOM and slide in with `.open` (CSS transitions). While a dialog is open they are inert;
 * when a sheet closes, focus returns to the control that opened it (仕様書 5章). Closing 「ウィジェットを追加」
 * marks every widget as seen (新しい印を消す).
 */
import { computed, nextTick, watch } from 'vue';
import { useDash } from '../../context';
import { isWide, markSeen } from '../../store/sheets';
import GlobalSheet from './GlobalSheet.vue';
import HelpSheet from './HelpSheet.vue';
import DevicesSheet from './DevicesSheet.vue';
import IndexSheet from './IndexSheet.vue';
import AddSheet from './AddSheet.vue';
import WidgetSheet from './WidgetSheet.vue';

const d = useDash();
const gDock = computed(() => (isWide(d) ? 'right' : 'bottom'));
const inert = computed(() => !!d.ui.dlg || undefined);

let ret: HTMLElement | null = null;
watch(() => d.ui.panel, (p, prev) => {
  if (prev === 'add' && p !== 'add') markSeen(d);
  const open = p !== 'none';
  const was = prev !== 'none';
  if (open && !was) {
    const a = document.activeElement;
    ret = a instanceof HTMLElement && a !== document.body ? a : null;
  }
  if (!open && was && ret) {
    const r = ret;
    ret = null;
    void nextTick(() => {
      const a = document.activeElement;
      const lost = !a || a === document.body || !!a.closest('.sheet:not(.open)') || !a.isConnected;
      try { if (r.isConnected && lost) r.focus({ preventScroll: true }); } catch { /* ignore */ }
    });
  }
});
</script>

<template>
  <DevicesSheet :dock="gDock" :inert="inert" />
  <HelpSheet :dock="gDock" :inert="inert" />
  <GlobalSheet :dock="gDock" :inert="inert" />
  <IndexSheet :dock="gDock" :inert="inert" />
  <AddSheet :dock="gDock" :inert="inert" />
  <WidgetSheet :inert="inert" />
</template>
