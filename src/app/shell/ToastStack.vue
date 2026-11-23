<script setup lang="ts">
/** トースト `.toasts` + オフラインの帯 `.offp` (仕様書 2章・5章, 部品シート 6章). Action toasts stay 10s and while hovered/focused. */
import { computed } from 'vue';
import { useDash } from '../context';
import { IC } from '../parts/icons';
import Icon from '../parts/LineIcon.vue';
import type { Toast } from '../store/types';

const d = useDash();
const ICON = { info: IC.toastInfo, ok: IC.toastOk, warn: IC.toastWarn } as const;
const COLOR = { info: 'var(--text)', ok: 'var(--a1)', warn: 'var(--a2)' } as const;
const bottom = computed(() => d.cfgOf('toast', 'pos') === '下');
function run(t: Toast): void {
  t.act?.fn();
  d.dropToast(t.id);
}
</script>

<template>
  <div
    class="toasts" :class="{ btm: bottom }" role="status" aria-live="polite"
    @pointerenter="d.holdToasts(true)" @pointerleave="d.holdToasts(false)" @focusin="d.holdToasts(true)" @focusout="d.holdToasts(false)"
  >
    <div class="offp" :class="{ open: !d.ui.online }"><Icon :d="IC.offline" :size="18" style="color: var(--a2)" /><span>オフライン。前回の内容を表示しています</span></div>
    <div v-for="t in d.ui.toasts" :key="t.id" class="toast" :class="{ out: t.out }">
      <span v-if="t.spin" class="sp" aria-hidden="true" />
      <svg v-else class="i" aria-hidden="true" viewBox="0 0 24 24" :style="{ color: COLOR[t.kind] }"><path :d="ICON[t.kind]" /></svg>
      <span>{{ t.text }}</span>
      <button v-if="t.act" class="chip" style="margin: -8px -12px -8px 4px; font-weight: 600; background: none" @click="run(t)">{{ t.act.label }}</button>
    </div>
  </div>
</template>
