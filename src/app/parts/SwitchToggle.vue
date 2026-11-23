<script setup lang="ts">
/** スイッチ `.sw` (role=switch). */
defineProps<{ modelValue: boolean; label: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>();
</script>

<template>
  <button class="sw" :class="modelValue ? 'on' : ''" role="switch" :aria-checked="modelValue ? 'true' : 'false'" :aria-label="label" :disabled="disabled" @click="emit('update:modelValue', !modelValue)"><span class="tr"><span class="kn" /></span></button>
</template>
