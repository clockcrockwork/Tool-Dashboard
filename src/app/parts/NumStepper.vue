<script setup lang="ts">
/**
 * 数のステッパー `.stp` (仕様書 4章「部品の使い場所」): − / 数の入力 / ＋.
 * Holding a button repeats after 0.5s every 90ms; out-of-range input is ignored; PageUp/PageDown step by 10.
 */
import { onBeforeUnmount } from 'vue';
import Icon from './LineIcon.vue';

const props = withDefaults(defineProps<{ modelValue: number; min: number; max: number; step?: number; unit?: string; label: string }>(), { step: 1, unit: '' });
const emit = defineEmits<{ 'update:modelValue': [v: number] }>();

let cur = props.modelValue;
function by(m: number): void {
  const c = Number.isFinite(cur) ? cur : props.modelValue;
  const nv = Math.min(props.max, Math.max(props.min, c + m));
  if (nv !== c) { cur = nv; emit('update:modelValue', nv); }
}
let holdT: ReturnType<typeof setTimeout> | undefined;
let holdI: ReturnType<typeof setInterval> | undefined;
let held = false;
function end(): void {
  clearTimeout(holdT);
  clearInterval(holdI);
  window.removeEventListener('pointerup', end);
  window.removeEventListener('pointercancel', end);
}
function hold(e: PointerEvent, m: number): void {
  if (e.button) return;
  end();
  held = false;
  cur = props.modelValue;
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  holdT = setTimeout(() => { held = true; holdI = setInterval(() => { by(m); }, 90); }, 500);
}
function tap(m: number): void {
  if (held) { held = false; return; }
  cur = props.modelValue;
  by(m);
}
function onInput(e: Event): void {
  const nv = parseInt((e.target as HTMLInputElement).value, 10);
  if (nv >= props.min && nv <= props.max) emit('update:modelValue', nv);
}
function onKey(e: KeyboardEvent): void {
  e.stopPropagation();
  if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); cur = props.modelValue; by((e.key === 'PageUp' ? 10 : -10) * props.step); }
}
onBeforeUnmount(end);
</script>

<template>
  <div class="stp" role="group" :aria-label="label"><button class="sg" aria-label="減らす" :disabled="modelValue <= min" @click="tap(-step)" @pointerdown="hold($event, -step)"><Icon d="M6 12h12" /></button><input class="stv num" type="number" inputmode="numeric" :min="min" :max="max" :step="step" :aria-label="label" :value="modelValue" @input="onInput" @keydown="onKey"><span v-if="unit" class="stu" aria-hidden="true">{{ unit }}</span><button class="sg" aria-label="増やす" :disabled="modelValue >= max" @click="tap(step)" @pointerdown="hold($event, step)"><Icon d="M6 12h12M12 6v12" /></button></div>
</template>
