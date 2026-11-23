<script setup lang="ts">
/** 折りたたみの節 `.dsh` / `.dsc` / `.dsb` (全体の設定). */
import Icon from './LineIcon.vue';

defineProps<{ title: string; open: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
</script>

<template>
  <h3 class="dsh"><button class="dsc" :aria-expanded="open ? 'true' : 'false'" @click="emit('toggle')">{{ title }}<Icon d="M6 9.5l6 6 6-6" /></button></h3>
  <div v-if="open" class="dsb"><slot /></div>
</template>
