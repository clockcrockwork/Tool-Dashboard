<script setup lang="ts">
/** 中の Vue 部品に、メモリ上の Dashboard を1つ渡す（`provideDash`）。見本ごとに別の Dashboard にしたいときに包む。 */
import { provideDash } from '../../app/context';
import { makeDash, type DashSetup } from '../dash';

const props = defineProps<{ prepare?: DashSetup }>();
const d = makeDash(props.prepare);
provideDash(d);
</script>

<template>
  <slot :d="d" />
</template>
