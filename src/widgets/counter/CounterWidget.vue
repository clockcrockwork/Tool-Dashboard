<script setup lang="ts">
/**
 * カウンター (counter) — 2×2. 名前つきの行ごとに数のステッパー（0より下にしない）。行の追加と削除モード（入力補助の帯）.
 * Prototype: Main.dc.html section data-w="counter" (markup 1147–1162); `counters`, `cnAdd`, `cnDel`, `cnDelTog`, `stTap`,
 * `stHold` in `renderVals()`. ステッパーは押し続けると0.5秒後から連続、PageUp/PageDown で10段（仕様書 4章「数のステッパー」）。
 * 行の削除にはトーストの「元に戻す」（消した行だけを戻す）。削除モードは保存しない。
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import type { CounterData, CounterItem } from './data';
import { COUNTER_EMPTY, addRow, bump, countLabel, deleteLabel, rename, setCount, stepOf } from './counter';
import { counterRemove } from './actions';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
/** 削除モード (not saved, like the prototype `cnDel`). */
const del = ref(false);
const items = computed(() => w.data<CounterData>().items);
const step = computed(() => stepOf(w.cfg('step')));

const rows = (): CounterItem[] => w.data<CounterData>().items;
const put = (next: CounterItem[]): void => { w.setData<CounterData>({ ...w.data<CounterData>(), items: next }); };
const by = (id: number, m: number): void => { put(bump(rows(), id, m)); };

// ----- 押し続けると連続 (prototype stTap / stHold: 0.5 s, then every 90 ms) -----
let holdT: ReturnType<typeof setTimeout> | undefined;
let holdI: ReturnType<typeof setInterval> | undefined;
let held = false;
function endHold(): void {
  clearTimeout(holdT);
  clearInterval(holdI);
  window.removeEventListener('pointerup', endHold);
  window.removeEventListener('pointercancel', endHold);
}
function hold(e: PointerEvent, id: number, m: number): void {
  if (e.button) return;
  endHold();
  held = false;
  window.addEventListener('pointerup', endHold);
  window.addEventListener('pointercancel', endHold);
  holdT = setTimeout(() => { held = true; holdI = setInterval(() => { by(id, m); }, 90); }, 500);
}
function tap(id: number, m: number): void {
  if (held) { held = false; return; }
  by(id, m);
}
onBeforeUnmount(endHold);

function onSet(e: Event, x: CounterItem): void {
  const el = e.target as HTMLInputElement;
  const next = setCount(rows(), x.id, el.value);
  if (next) put(next);
  else el.value = String(x.v);
}
function onValKey(e: KeyboardEvent, x: CounterItem): void {
  e.stopPropagation();
  if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); by(x.id, (e.key === 'PageUp' ? 10 : -10) * step.value); }
}
function onName(e: Event, x: CounterItem): void {
  put(rename(rows(), x.id, (e.target as HTMLInputElement).value));
}
function add(): void {
  const next = addRow(rows(), d.now());
  if (next) put(next);
  else d.toast('項目はこれ以上増やせません', 'info');
  del.value = false;
}
function remove(x: CounterItem): void {
  counterRemove(d, w.id, x.id);
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; gap: 2px; padding: 10px 12px 8px">
      <div class="scr" style="flex: 1; min-height: 0; display: flex; flex-direction: column">
        <p v-if="!items.length" class="empt">{{ COUNTER_EMPTY }}</p>
        <div v-for="cn in items" :key="cn.id" class="cnr"><input class="cnn" aria-label="項目名" placeholder="項目名" :value="cn.n" @input="onName($event, cn)" @keydown.stop><button v-if="del" class="nb" :aria-label="deleteLabel(cn)" @click="remove(cn)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg></button><div v-if="!del" class="stp" role="group" :aria-label="countLabel(cn)"><button class="sg" aria-label="減らす" :disabled="cn.v <= 0" @click="tap(cn.id, -step)" @pointerdown="hold($event, cn.id, -step)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 12h12" /></svg></button><input class="stv num" type="number" inputmode="numeric" min="0" :aria-label="countLabel(cn)" :value="cn.v" @change="onSet($event, cn)" @keydown="onValKey($event, cn)"><button class="sg" aria-label="増やす" @click="tap(cn.id, step)" @pointerdown="hold($event, cn.id, step)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 12h12M12 6v12" /></svg></button></div></div>
      </div>
      <div class="ab show">
        <button class="abb" @click="add"><span style="display: flex; align-items: center; gap: 6px"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 16px; height: 16px"><path d="M6 12h12M12 6v12" /></svg>項目</span></button>
        <span class="abs" />
        <button class="abb" :class="del ? 'on' : ''" aria-label="項目を削除するモード" :aria-pressed="del" @click="del = !del"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 18px; height: 18px"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7" /></svg></button>
      </div>
    </div>
  </WidgetFrame>
</template>
