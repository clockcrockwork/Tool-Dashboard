<script setup lang="ts">
/**
 * ウィジェットの見本 `.snapf`（部品シート 9章・12章）。そのウィジェットだけを [cols, rows] の大きさで置いた
 * Dashboard を作り、本物のウィジェット（src/widgets の WIDGETS）を描く。まだ無いウィジェットは点線の枠。
 */
import { computed } from 'vue';
import { WIDGETS } from '../../widgets';
import { solo, type DashSetup } from '../dash';
import Icon from '../../app/parts/LineIcon.vue';
import DashScope from './DashScope.vue';

const props = withDefaults(defineProps<{
  id: string;
  cols: number;
  rows: number;
  /** 見本の大きさ(px)。部品シートの値をそのまま使う */
  w: number;
  h: number;
  label: string;
  edit?: boolean;
  /** 編集中の固定の印（アイコンのパス） */
  marks?: readonly string[];
  prepare?: DashSetup;
  /** まだ無いときの文言 */
  missing?: string;
}>(), { edit: false, marks: () => [], prepare: () => {}, missing: 'P1 で追加' });

const comp = computed(() => WIDGETS[props.id]);
const setup: DashSetup = d => {
  solo(d, props.id, [props.cols, props.rows]);
  props.prepare(d);
};
</script>

<template>
  <DashScope v-if="comp" :prepare="setup">
    <div class="snapf" :class="{ edit }" role="img" :aria-label="label" :style="{ width: w + 'px', height: h + 'px' }">
      <div class="snapi" inert>
        <component :is="comp" />
        <div v-if="marks.length" class="wmk" aria-hidden="true"><Icon v-for="(m, i) in marks" :key="i" :d="m" /></div>
      </div>
    </div>
  </DashScope>
  <div v-else class="snapf miss" role="img" :aria-label="label + '（まだありません）'" :style="{ width: w + 'px', height: h + 'px' }">{{ missing }}</div>
</template>
