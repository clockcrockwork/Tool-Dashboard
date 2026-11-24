<script setup lang="ts">
/** 横スライダー `.rg`. Emits on every input (prototype onChange = input event). */
defineProps<{ modelValue: number; min: number; max: number; label: string; step?: number }>();
const emit = defineEmits<{ 'update:modelValue': [v: number] }>();
function onInput(e: Event): void {
  emit('update:modelValue', Number((e.target as HTMLInputElement).value));
}
</script>

<template>
  <input class="rg" type="range" :min="min" :max="max" :step="step" :aria-label="label" :value="modelValue" @input="onInput">
</template>
