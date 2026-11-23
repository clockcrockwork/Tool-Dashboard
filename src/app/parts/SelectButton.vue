<script setup lang="ts">
/** 選択メニューを開くボタン `.chip.sel` (5個以上の択一). The menu itself is drawn by the overlays layer. */
import Icon from './LineIcon.vue';

defineProps<{ label: string; value: string; expanded: boolean }>();
const emit = defineEmits<{ open: [e: MouseEvent] }>();
</script>

<template>
  <button class="chip sel" aria-haspopup="listbox" :aria-expanded="expanded ? 'true' : 'false'" @click="emit('open', $event)"><span class="vh">{{ label }}：</span><span class="sv">{{ value }}</span><Icon d="M6 9.5l6 6 6-6" /></button>
</template>
