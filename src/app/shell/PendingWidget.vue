<script setup lang="ts">
/**
 * 未実装の種類の面 (review #9; 仕様書 3章「ウィジェット全体が使えない」). DashboardRoot renders it for a kind that has no
 * implementation yet, whether placed (e.g. from a saved or imported layout) or used without placing (一時利用), so the face
 * is never empty: the frame replaces the content with 「準備中です」. In 1×1 the faded icon stays and a toast says it.
 */
import { useWidget } from '../context';
import { IC } from '../parts/icons';
import Icon from '../parts/LineIcon.vue';
import WidgetFrame from './WidgetFrame.vue';
import { PENDING_COVER } from './cover';

const props = defineProps<{ id: string }>();
useWidget(props.id);
</script>

<template>
  <WidgetFrame :cover="PENDING_COVER">
    <div class="in" style="align-items: center; justify-content: center"><Icon :d="IC.soon" /></div>
  </WidgetFrame>
</template>
