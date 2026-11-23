<script setup lang="ts">
/** ウィジェットを追加 (仕様書 2章「ウィジェットを探す」・7章「ウィジェットを追加」, prototype markup Main.dc.html 1893–1917). */
import { computed, ref } from 'vue';
import { useDash } from '../../context';
import { REGISTRY } from '../../registry/registry';
import {
  boardNameOf, boardOf, catalogGroups, goToWidget, placeAt, rememberQuery, selectExpanded, targetBoard, useWithoutPlacing,
} from '../../store/sheets';
import { IC } from '../../parts/icons';
import Icon from '../../parts/LineIcon.vue';
import SelectButton from '../../parts/SelectButton.vue';
import { SI } from './sheetIcons';
import { openSel } from './selectMenu';

defineProps<{ dock: string }>();
const d = useDash();
const box = ref<HTMLElement | null>(null);

const tgt = computed(() => targetBoard(d));
const groups = computed(() => catalogGroups(d.ui.catQ));
const searching = computed(() => d.ui.catQ.trim() !== '');
const rows = computed(() => {
  const t = tgt.value;
  const seen = new Set(d.g.seenW);
  return groups.value.map(g => ({
    n: g.n,
    items: g.ids.map(id => {
      const def = REGISTRY[id];
      const n = def?.n ?? id;
      const off = !!d.g.off[id];
      const gid = boardOf(d, id);
      const here = !off && gid === t.id;
      const isNew = !seen.has(id);
      return {
        id, n, off, here, isNew,
        state: (off ? '未配置' : '配置済み、' + boardNameOf(d, gid) + (here ? '（追加先のボード）' : '')) + (isNew ? '、新しく追加された道具' : ''),
        tryAl: n + 'を置かずに使う', addAl: n + 'を「' + t.n + '」に追加', moveAl: n + 'を「' + t.n + '」へ移動',
      };
    }),
  }));
});

function open(id: string, off: boolean): void {
  rememberQuery(d);
  if (off) useWithoutPlacing(d, id);
  else goToWidget(d, id);
}
function tryIt(id: string): void { rememberQuery(d); useWithoutPlacing(d, id); }
function act(id: string): void { rememberQuery(d); placeAt(d, id, tgt.value.id, true); }
function onKey(e: KeyboardEvent): void {
  e.stopPropagation();
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  const f = box.value?.querySelector<HTMLButtonElement>('.crow .cnb');
  if (f) { e.preventDefault(); f.click(); }
}
</script>

<template>
  <aside ref="box" class="sheet" :class="[dock, d.ui.panel === 'add' ? 'open' : '']" aria-label="ウィジェットを追加">
    <div class="sh"><button v-if="d.ui.addFrom === 'index'" class="bk" @click="d.back()"><Icon :d="IC.back" />一覧</button><span class="st">ウィジェットを追加</span><button class="nb" aria-label="閉じる" @click="d.closePanel()"><Icon :d="IC.close" /></button></div>
    <div class="fld" style="min-height: 44px"><span class="cap">追加先</span>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end">
        <template v-if="d.g.groups.length <= 4"><button v-for="gr in d.g.groups" :key="gr.id" class="chip sm" :class="gr.id === tgt.id ? 'on' : ''" :aria-pressed="gr.id === tgt.id ? 'true' : 'false'" @click="d.ui.tgt = gr.id">{{ gr.n }}</button></template>
        <SelectButton v-else label="追加先" :value="tgt.n" :expanded="selectExpanded(d, 'tgt')" @open="e => openSel(d, 'tgt', '追加先', e)" />
      </div>
    </div>
    <div class="catq"><input class="inp" type="search" aria-label="ウィジェットを探す" placeholder="名前や用途で探す" enterkeyhint="search" :value="d.ui.catQ" @input="d.ui.catQ = ($event.target as HTMLInputElement).value" @keydown="onKey"></div>
    <div v-if="!searching && d.g.catHist.length" class="cath" role="group" aria-label="最近の検索"><button v-for="q in d.g.catHist" :key="q" class="chip sm" @click="d.ui.catQ = q">{{ q }}</button><button class="nb" aria-label="最近の検索を消す" @click="d.g.catHist = []"><Icon :d="IC.close" /></button></div>
    <p v-if="searching && !groups.length" class="cap" role="status" style="margin: 12px 4px">見つかりません。ほかの言葉で探してください。</p>
    <template v-for="cg in rows" :key="cg.n">
      <div class="sl">{{ cg.n }}</div>
      <div>
        <div v-for="ci in cg.items" :key="ci.id" class="crow">
          <button class="cnb" :aria-describedby="'cd-' + ci.id" @click="open(ci.id, ci.off)"><span class="ckm" :class="ci.off ? '' : 'on'" aria-hidden="true"><svg class="i" viewBox="0 0 24 24"><path :d="IC.check" /></svg></span><span class="cnm">{{ ci.n }}</span><span v-if="ci.isNew" class="newdot" aria-hidden="true" /></button>
          <span :id="'cd-' + ci.id" class="vh">{{ ci.state }}</span>
          <button v-if="ci.off" class="nb" :aria-label="ci.tryAl" @click="tryIt(ci.id)"><Icon :d="IC.play" /></button>
          <button v-if="ci.off" class="nb ad" :aria-label="ci.addAl" @click="act(ci.id)"><Icon :d="IC.plus" /></button>
          <button v-if="!ci.off && !ci.here" class="nb" :aria-label="ci.moveAl" @click="act(ci.id)"><Icon :d="SI.moveHere" /></button>
        </div>
      </div>
    </template>
  </aside>
</template>
