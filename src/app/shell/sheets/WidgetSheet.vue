<script setup lang="ts">
/**
 * ウィジェットの設定 (仕様書 3章「設定パネルの構成は固定」, prototype markup Main.dc.html 1919–1973).
 * Fixed order: サイズ, 大きさを固定, 位置を固定 (+矢印), 人前では隠す, 固有の項目, 項目の編集, 置くボード, 並び順, このボードから外す.
 * No scrim: tapping another widget re-selects. Docked opposite the selected widget.
 */
import { computed } from 'vue';
import { useDash } from '../../context';
import { REGISTRY, type Field, type FieldValue } from '../../registry/registry';
import { ITEM_ICONS, iconPath } from '../../registry/icons';
import {
  ITEM_WIDGETS, addItem, bulkAddLinks, canNudge, fieldCheck, hideSelected, itemsOf, moveToBoard, nudgePin, parseBulkLinks, patchItem,
  readIconFile, removeItem, selectExpanded, selectLabel, setFullScreenOn, setWidgetSize, settingsOpen, settingsTarget, sheetState,
  shiftOrder, togglePin, toggleSizeLock, toggleWidgetVeil, widgetDock,
} from '../../store/sheets';
import { IC } from '../../parts/icons';
import Icon from '../../parts/LineIcon.vue';
import FieldRow from '../../parts/FieldRow.vue';
import NumStepper from '../../parts/NumStepper.vue';
import SegChoice from '../../parts/SegChoice.vue';
import SelectButton from '../../parts/SelectButton.vue';
import SizeGrid from '../../parts/SizeGrid.vue';
import SwitchToggle from '../../parts/SwitchToggle.vue';
import { SI } from './sheetIcons';
import { openSel } from './selectMenu';

const d = useDash();
const st = sheetState(d);

const sel = computed(() => settingsTarget(d));
const def = computed(() => (sel.value ? REGISTRY[sel.value] : undefined));
const open = computed(() => settingsOpen(d));
const dock = computed(() => widgetDock(d, sel.value));
const L = computed(() => d.layout.value);
const full = computed(() => !!sel.value && d.pgOn(sel.value));
const size = computed(() => (sel.value ? d.sizeOf(sel.value) : ([1, 1] as const)));
const sizeText = computed(() => (full.value ? '全画面' : String(size.value[0]) + '×' + String(size.value[1])));
const locked = computed(() => !!sel.value && !!d.g.lockSz[sel.value]);
const pin = computed(() => (sel.value ? d.g.pins[sel.value] : undefined));
const pinPos = computed(() => (pin.value ? String(pin.value[1] + 1) + '列 ' + String(pin.value[2] + 1) + '行' : ''));
const pinMiss = computed(() => !!sel.value && !!L.value.pinMiss[sel.value]);
const MOVES = [['左へ', -1, 0, SI.left], ['上へ', 0, -1, SI.up], ['下へ', 0, 1, SI.down], ['右へ', 1, 0, SI.right]] as const;
const veilOn = computed(() => !!sel.value && d.veilOf(sel.value));
const curGi = computed(() => (sel.value ? L.value.pos[sel.value]?.gi ?? -1 : -1));

// ----- fields (registry f: tg / sg / st / rg / tx / tm / dt)
type FieldView = { f: Field; v: FieldValue | undefined; kind: 'tg' | 'seg' | 'sel' | 'st' | 'rg' | 'fx'; fid: string };
const fields = computed<FieldView[]>(() => {
  const id = sel.value;
  if (!id || !def.value) return [];
  return def.value.f.map(f => {
    const v = d.cfgOf(id, f.k);
    const kind: FieldView['kind'] = f.t === 'tg' ? 'tg' : f.t === 'sg' ? ((f.o ?? []).length > 4 ? 'sel' : 'seg') : f.t === 'st' ? 'st' : f.t === 'rg' ? 'rg' : 'fx';
    return { f, v, kind, fid: 'ff-' + id + '-' + f.k };
  });
});
const segOpts = (f: Field): readonly (readonly [string, string])[] => (f.o ?? []).map(o => [o, o] as const);
function fx(fv: FieldView): { it: string; w: string; bad: boolean; err: string; hint: string; desc: string } {
  const id = sel.value ?? '';
  const ck = fieldCheck(id, fv.f.k, fv.v, d.ui.t);
  const bad = !!(ck.err && st.touched[id + '.' + fv.f.k]);
  const t = fv.f.t;
  return {
    it: t === 'dt' ? 'date' : t === 'tm' ? 'time' : fv.f.k === 'url' ? 'url' : 'text',
    w: t === 'tm' ? '9.5em' : t === 'dt' ? '12em' : '100%',
    bad, err: bad ? ck.err ?? '' : '', hint: bad ? '' : ck.hint ?? '',
    desc: bad ? fv.fid + '-e' : ck.hint ? fv.fid + '-h' : '',
  };
}
function touch(k: string): void { st.touched = { ...st.touched, [k]: true }; }
function setField(k: string, v: FieldValue): void { if (sel.value) d.setCfg(sel.value, k, v); }
const val = (e: Event): string => (e.target as HTMLInputElement).value;

// ----- items (ハビット・クイックリンク)
const hasItems = computed(() => !!sel.value && ITEM_WIDGETS.includes(sel.value));
const isLinks = computed(() => sel.value === 'links');
const items = computed(() => {
  const id = sel.value;
  if (!id || !hasItems.value) return [];
  return itemsOf(d, id).map((it, i) => {
    const u = String(it.url ?? '').trim();
    const bad = !!(u && !u.startsWith('http://') && !u.startsWith('https://') && st.touched['link.' + String(it.id)]);
    return { it, i, d: iconPath(it.ic), open: st.pick === it.id, ubad: bad };
  });
});
const bulkNo = computed(() => !parseBulkLinks(st.bulkTx).length);
function onFile(e: Event, itemId: number): void {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  const id = sel.value;
  if (!id) return;
  readIconFile(d, f, url => { patchItem(d, id, itemId, { img: url }); st.pick = null; });
}
</script>

<template>
  <aside class="sheet" :class="[dock, open ? 'open' : '']" aria-label="ウィジェットの設定">
    <div class="sh"><span class="st">{{ def?.n ?? '' }}</span><button class="nb" aria-label="設定を閉じる" @click="d.closePanel()"><Icon :d="IC.close" /></button></div>
    <div class="fld" style="align-items: flex-start; margin-top: 8px"><span style="padding-top: 10px">サイズ <span class="num mut">{{ sizeText }}</span></span>
      <SizeGrid :size="size" :min="def?.min ?? [1, 1]" :max="def?.max ?? [4, 3]" :cols="L.cols" :rows="L.rows" :locked="locked" :can-full="!!def?.pg" :full="full" @pick="(w, h) => sel && setWidgetSize(d, sel, w, h)" @full="sel && setFullScreenOn(d, sel)" />
    </div>
    <FieldRow label="大きさを固定"><SwitchToggle :model-value="locked" label="大きさを固定" @update:model-value="sel && toggleSizeLock(d, sel)" /></FieldRow>
    <FieldRow label="位置を固定"><SwitchToggle :model-value="!!pin" label="位置を固定" :disabled="full" @update:model-value="sel && togglePin(d, sel)" /></FieldRow>
    <template v-if="pin">
      <FieldRow><template #label>位置 <span class="num mut">{{ pinPos }}</span></template><div role="group" aria-label="位置を動かす" style="display: flex; gap: 4px">
        <button v-for="m in MOVES" :key="m[0]" class="btn" :aria-label="'1マス' + m[0] + '動かす'" :disabled="!sel || !canNudge(d, sel, m[1], m[2])" @click="sel && nudgePin(d, sel, m[1], m[2])"><Icon :d="m[3]" /></button>
      </div></FieldRow>
      <p v-if="pinMiss" class="cap" style="margin: 0 0 6px">この画面の大きさでは固定した位置に置けないため、空いている場所に並べています。</p>
    </template>
    <FieldRow label="人前では隠す"><SwitchToggle :model-value="veilOn" label="人前では隠す" @update:model-value="sel && toggleWidgetVeil(d, sel)" /></FieldRow>

    <template v-for="fv in fields" :key="fv.f.k">
      <div v-if="fv.kind === 'fx'" class="fld2"><label :for="fv.fid">{{ fv.f.l }}</label><input :id="fv.fid" class="inp" :class="fx(fv).bad ? 'err' : ''" :type="fx(fv).it" :value="String(fv.v ?? '')" :aria-invalid="fx(fv).bad ? 'true' : 'false'" :aria-describedby="fx(fv).desc || undefined" :style="{ width: fx(fv).w }" @input="setField(fv.f.k, val($event))" @blur="touch(sel + '.' + fv.f.k)" @keydown.stop><span v-if="fx(fv).hint" :id="fv.fid + '-h'" class="cap">{{ fx(fv).hint }}</span><span v-if="fx(fv).bad" :id="fv.fid + '-e'" class="ferr"><Icon :d="SI.err" />{{ fx(fv).err }}</span></div>
      <FieldRow v-else :label="fv.f.l">
        <SelectButton v-if="fv.kind === 'sel'" :label="fv.f.l" :value="selectLabel(d, 'f:' + fv.f.k)" :expanded="selectExpanded(d, 'f:' + fv.f.k)" @open="e => openSel(d, 'f:' + fv.f.k, fv.f.l, e)" />
        <NumStepper v-else-if="fv.kind === 'st'" :model-value="Number(fv.v)" :min="fv.f.min ?? 0" :max="fv.f.max ?? 100" :step="fv.f.step ?? 1" :unit="fv.f.u ?? ''" :label="fv.f.l" @update:model-value="v => setField(fv.f.k, v)" />
        <SwitchToggle v-else-if="fv.kind === 'tg'" :model-value="!!fv.v" :label="fv.f.l" @update:model-value="v => setField(fv.f.k, v)" />
        <SegChoice v-else-if="fv.kind === 'seg'" :options="segOpts(fv.f)" :model-value="String(fv.v)" :label="fv.f.l" @update:model-value="v => setField(fv.f.k, v)" />
        <div v-else-if="fv.kind === 'rg'" class="cvr"><input class="rg" type="range" :min="fv.f.min" :max="fv.f.max" :aria-label="fv.f.l" :value="Number(fv.v)" @input="setField(fv.f.k, Number(val($event)))"><span class="cap num" style="width: 20px; text-align: right">{{ fv.v }}</span></div>
      </FieldRow>
    </template>

    <template v-if="hasItems && sel">
      <div class="sl">項目</div>
      <template v-for="ir in items" :key="ir.it.id">
        <div class="itr"><button class="btn" :class="ir.open ? 'on' : ''" aria-label="アイコンを選ぶ" :aria-expanded="ir.open ? 'true' : 'false'" @click="st.pick = ir.open ? null : ir.it.id"><Icon v-if="!ir.it.img" :d="ir.d" /><img v-else class="hbi" alt="" :src="ir.it.img"></button><input class="inp" aria-label="名前" placeholder="名前" :value="ir.it.label" @input="patchItem(d, sel, ir.it.id, { label: val($event) })" @keydown.stop><button class="nb" aria-label="この項目を削除" @click="removeItem(d, sel, ir.it.id)"><Icon :d="IC.close" :size="16" /></button></div>
        <template v-if="isLinks"><div class="itr" style="margin-top: 4px"><input class="inp" :class="ir.ubad ? 'err' : ''" type="url" inputmode="url" aria-label="リンク先のURL" :aria-invalid="ir.ubad ? 'true' : 'false'" :aria-describedby="ir.ubad ? 'lu-' + ir.i : undefined" placeholder="https://" :value="ir.it.url ?? ''" @input="patchItem(d, sel, ir.it.id, { url: val($event) })" @blur="touch('link.' + ir.it.id)" @keydown.stop></div><span v-if="ir.ubad" :id="'lu-' + ir.i" class="ferr" style="margin-top: 4px"><Icon :d="SI.err" />「https://」で始まるURLを入れてください</span></template>
        <div v-if="ir.open" class="ipg" role="group" aria-label="アイコン">
          <button v-for="ic in ITEM_ICONS" :key="ic[0]" class="nb" :class="!ir.it.img && ir.it.ic === ic[0] ? 'on' : ''" :aria-label="ic[1]" :aria-pressed="!ir.it.img && ir.it.ic === ic[0] ? 'true' : 'false'" @click="patchItem(d, sel, ir.it.id, { ic: ic[0], img: null }); st.pick = null"><Icon :d="ic[2]" /></button>
          <label class="nb" aria-label="画像を読み込む" style="cursor: pointer"><Icon :d="SI.image" /><input class="vh" type="file" accept="image/*" @change="onFile($event, ir.it.id)"></label>
        </div>
      </template>
      <template v-if="isLinks">
        <div class="sl">まとめて追加</div>
        <textarea class="inp" aria-label="URLをまとめて貼り付け" aria-describedby="bulkn" placeholder="https://example.com 例のサイト" :value="st.bulkTx" style="min-height: 76px; padding: 8px 12px; resize: vertical" @input="st.bulkTx = val($event)" @keydown.stop />
        <p id="bulkn" class="cap" style="margin: 4px 0 0">1行に1つ。URLと名前は空白で区切ります。ブラウザのブックマークを書き出したファイル（HTML）の中身も貼れます。</p>
        <button class="chip" :disabled="bulkNo" style="width: 100%; margin-top: 6px" @click="bulkAddLinks(d)">貼り付けたリンクを追加</button>
      </template>
      <button class="chip" style="width: 100%; margin-top: 8px" @click="addItem(d, sel)"><Icon :d="IC.plus" :size="18" />項目を追加</button>
    </template>

    <div class="sl">置くボード</div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px">
      <template v-if="d.g.groups.length <= 4"><button v-for="(gr, gi) in d.g.groups" :key="gr.id" class="chip sm" :class="curGi === gi ? 'on' : ''" :aria-pressed="curGi === gi ? 'true' : 'false'" @click="sel && moveToBoard(d, sel, gr.id)">{{ gr.n }}</button></template>
      <SelectButton v-else label="置くボード" :value="selectLabel(d, 'move')" :expanded="selectExpanded(d, 'move')" @open="e => openSel(d, 'move', '置くボード', e)" />
    </div>
    <div class="fld" style="margin-top: 6px"><span>並び順</span><div style="display: flex; gap: 6px"><button class="btn" aria-label="前へ移動" @click="sel && shiftOrder(d, sel, -1)"><Icon :d="SI.left" /></button><button class="btn" aria-label="後ろへ移動" @click="sel && shiftOrder(d, sel, 1)"><Icon :d="SI.right" /></button></div></div>
    <button class="chip" style="width: 100%; margin-top: 12px" @click="sel && hideSelected(d, sel)"><Icon :d="SI.hide" :size="18" />このボードから外す</button>
    <p class="cap" style="margin: 8px 0 0; text-align: center">外したウィジェットは「ウィジェットを追加」からいつでも戻せます。</p>
  </aside>
</template>
