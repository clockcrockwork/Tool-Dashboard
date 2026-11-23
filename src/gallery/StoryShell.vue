<script setup lang="ts">
/**
 * Storybook の共通の入れ物。メモリ上の Dashboard を provideDash し、`.dash[data-theme]` で包む
 * （トークンは `.dash` の中でしか効かない）。theme='both' なら左ライト・右ダークで同じ見本を2つ並べる。
 *
 * layout:
 *  - 'grid'  … ウィジェット用。1マス 166×153px・すき間 14px（1440×900 の画面と同じ）のマス目に置く。
 *              位置は本物のレイアウト計算（`d.layout`）から来るので、`solo()` で左上に1つだけ置いておく。
 *  - 'stage' … 部品をそのまま置く（余白つき）。
 *  - 'bar'   … 下部バーやトーストのように `.dash` の端に絶対配置される部品用。高さ `height` の箱。
 */
import { computed } from 'vue';
import { provideDash } from '../app/context';
import type { Dashboard } from '../app/store/store';
import type { ShellLayout, ShellTheme } from './types';

const props = withDefaults(defineProps<{
  dash: Dashboard;
  theme?: ShellTheme;
  layout?: ShellLayout;
  /** grid: [横, 縦] マス */
  grid?: readonly [number, number];
  /** bar: 箱の高さ(px) */
  height?: number;
  /** bar: 箱の幅(px)。0 は列いっぱい */
  width?: number;
}>(), { theme: 'both', layout: 'stage', grid: () => [2, 1] as const, height: 120, width: 0 });

provideDash(props.dash);

const CELL_W = 166;
const CELL_H = 153;
const GAP = 14;

const themes = computed(() => (props.theme === 'both' ? (['light', 'dark'] as const) : [props.theme]));
const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(' + String(props.grid[0]) + ', ' + String(CELL_W) + 'px)',
  gridTemplateRows: 'repeat(' + String(props.grid[1]) + ', ' + String(CELL_H) + 'px)',
  gap: String(GAP) + 'px',
}));
const boxStyle = computed(() => {
  if (props.layout === 'bar') return { position: 'relative' as const, height: String(props.height) + 'px', ...(props.width ? { width: String(props.width) + 'px' } : {}) };
  if (props.layout === 'grid') return gridStyle.value;
  return { display: 'flex', flexWrap: 'wrap' as const, alignItems: 'flex-start', gap: '18px 22px' };
});
</script>

<template>
  <div class="sb-row">
    <div
      v-for="t in themes"
      :key="t"
      class="dash sb-col"
      :class="{ edit: dash.ui.edit }"
      :data-theme="t"
      :style="dash.rootVars()"
    >
      <div class="amb" aria-hidden="true" />
      <div class="sb-box" :class="'sb-' + layout" :style="boxStyle"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.sb-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch; }
.sb-col { position: relative; flex: 1 1 0; min-width: 0; overflow: hidden; border-radius: 18px; padding: 24px; }
.sb-col:has(.sb-grid) { flex: 0 0 auto; }
.sb-box { position: relative; }
</style>
