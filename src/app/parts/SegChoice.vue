<script setup lang="ts" generic="T extends string | number | boolean">
/** 選択の並び `.seg` / `.sg` (2〜4個の択一, 部品シート「選択の並び」). 5個以上は SelectButton + 選択メニュー. */
defineProps<{
  /** [value, label] pairs */
  options: readonly (readonly [T, string])[];
  modelValue: T;
  label: string;
  /** extra inline style on `.sg` (prototype markup) */
  btnStyle?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [v: T] }>();
</script>

<template>
  <div class="seg" role="group" :aria-label="label"><button v-for="o in options" :key="String(o[0])" class="sg" :class="o[0] === modelValue ? 'on' : ''" :aria-pressed="o[0] === modelValue ? 'true' : 'false'" :style="btnStyle" @click="emit('update:modelValue', o[0])">{{ o[1] }}</button></div>
</template>
