<script setup lang="ts">
/**
 * 名言 (quote) — 2×1. 左に大きな「「」、右に本文と人の名前（文字だけで伝える型）.
 * Prototype: Main.dc.html section data-w="quote" (markup 945–955). 受動（自分では動かない、記録なし）.
 */
import { useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { QUOTE } from './quote';

const props = defineProps<{ id: string }>();
useWidget(props.id);
</script>

<template>
  <WidgetFrame>
    <div class="in" style="align-items: center; gap: 14px; padding-inline: 18px">
      <div aria-hidden="true" style="flex: none; font-size: min(58cqh, 22cqw); font-weight: 200; line-height: 1">「</div>
      <div style="min-width: 0">
        <div style="font-size: min(21cqh, 22px); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ QUOTE.text }}</div>
        <div class="cap">{{ QUOTE.by }}</div>
      </div>
    </div>
  </WidgetFrame>
</template>
