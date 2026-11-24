<script setup lang="ts">
/** TODO (todo) — 2×2. Prototype: Main.dc.html section data-w="todo" (markup 815–830), `todoKey`, `todoPhrases`, `none.todo`. */
import { computed, ref } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import type { TodoData } from './data';
import { TODO_PHRASES, addTodo, applyPhrase, todoEmptyText, toggleTodo, visibleTodos } from './todo';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const inp = ref<HTMLInputElement | null>(null);
const data = computed(() => w.data<TodoData>());
const hide = computed(() => !!w.cfg('hide'));
const items = computed(() => visibleTodos(data.value.items, hide.value));
const empty = computed(() => todoEmptyText(data.value.items, hide.value));
const bar = computed(() => !!w.cfg('bar'));

function onKey(e: KeyboardEvent): void {
  e.stopPropagation();
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  const el = e.target as HTMLInputElement;
  const next = addTodo(data.value.items, el.value, d.now());
  if (!next) return;
  el.value = '';
  w.setData<TodoData>({ items: next });
}
function toggle(id: number): void {
  w.setData<TodoData>({ items: toggleTodo(data.value.items, id) });
}
function phrase(t: string): void {
  const el = inp.value;
  if (!el) return;
  el.value = applyPhrase(el.value, t);
  el.focus();
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; gap: 6px">
      <input ref="inp" class="inp" placeholder="追加…" aria-label="TODOを追加" @keydown="onKey">
      <div class="ab" :class="bar ? 'show' : ''" style="margin: -4px -6px -4px">
        <button v-for="t in TODO_PHRASES" :key="t" class="abb" @pointerdown.prevent @click="phrase(t)">{{ t }}</button>
      </div>
      <div class="scr" style="display: flex; flex-direction: column; flex: 1; min-height: 0">
        <p v-if="empty" class="empt">{{ empty }}</p>
        <button v-for="it in items" :key="it.id" class="todo" :class="it.done ? 'done' : ''" :aria-pressed="it.done" @click="toggle(it.id)"><span class="ck"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke-width: 2.4"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span><span class="tx">{{ it.t }}</span></button>
      </div>
    </div>
  </WidgetFrame>
</template>
