<script setup lang="ts">
/** 下部バー `.nav` (仕様書 4章「下部バーの並び」). Normal: ⌂ ‹ dots › 一覧 編集 設定. Edit mode: 元に戻す ボード ウィジェット 完了. */
import { computed } from 'vue';
import { useDash } from '../context';
import { IC } from '../parts/icons';
import Icon from '../parts/LineIcon.vue';

const d = useDash();
const L = computed(() => d.layout.value);
const page = computed(() => d.page);
/** Tour step → highlighted control (仕様書 2章「はじめて開いたとき」). */
const TOUR_HL = ['pg', 'index', 'edit', 'gear'] as const;
const hl = (key: (typeof TOUR_HL)[number]): string => (d.ui.tour >= 0 && TOUR_HL[d.ui.tour] === key ? 'hl' : '');
const showDots = computed(() => L.value.total <= 7 && L.value.total <= Math.max(3, Math.floor((d.env.width - 294) / 24)));
const dots = computed(() => Array.from({ length: L.value.total }, (_v, i) => {
  const focus = i === L.value.focusIdx || i === L.value.boardIdx;
  return {
    i,
    cls: [focus ? 'pg' : '', i === page.value ? 'on' : ''].filter(Boolean).join(' '),
    label: d.screenLabel(i, 'の'),
    tip: focus ? '' : d.screenLabel(i, '-'),
    cur: i === page.value ? 'page' : 'false',
  };
}));
const unread = computed(() => {
  const share = d.dataOf<{ items?: { dir: string; seen: boolean; pending?: boolean }[] } | undefined>('share');
  return (share?.items ?? []).filter(y => y.dir === 'in' && !y.seen && !y.pending).length;
});
const pgLabel = computed(() => d.screenLabel(page.value, 'の') + '、' + String(page.value + 1) + ' / ' + String(L.value.total) + '。押すと一覧を開きます');
const k1 = computed(() => d.g.gs.keys1);
const curGid = computed(() => {
  let gi = 0;
  L.value.first.forEach((fi, j) => { if (fi <= page.value) gi = j; });
  return d.g.groups[gi]?.id ?? null;
});

function togglePanel(p: 'index' | 'global'): void {
  Object.assign(d.ui, { panel: d.ui.panel === p ? 'none' : p, sel: null, edit: false });
}
function addBoard(): void {
  const id = d.addBoard();
  requestAnimationFrame(() => {
    const gi = d.g.groups.findIndex(g => g.id === id);
    const f = d.layout.value.first[gi];
    if (f !== undefined) d.go(f);
  });
}
</script>

<template>
  <nav class="nav" :inert="!!d.ui.dlg || undefined" aria-label="ボードの切替と設定">
    <div class="ebar" role="toolbar" aria-label="編集">
      <button class="chip" aria-label="元に戻す" :disabled="!d.canUndo" @click="d.undo()"><Icon :d="IC.undo" :size="18" /><span class="lbl">元に戻す</span></button>
      <span class="sep" aria-hidden="true" />
      <button class="chip" aria-label="ボードを追加" @click="addBoard"><Icon :d="IC.addBoard" :size="18" /><span class="lbl">ボード</span></button>
      <button class="chip" @click="d.openPanel('add', { addFrom: 'edit', tgt: curGid, sel: null })"><Icon :d="IC.plus" :size="18" />ウィジェット</button>
      <button class="chip pri" @click="Object.assign(d.ui, { edit: false, panel: 'none', sel: null })">完了</button>
    </div>
    <div class="nbar">
      <button class="nb" aria-label="ホームへ" aria-keyshortcuts="Home" :disabled="page === d.homeIndex()" @click="d.goHome()"><Icon :d="IC.home" /></button>
      <button class="nb" :class="hl('pg')" aria-label="前の画面" @click="d.prev()"><Icon :d="IC.back" /></button>
      <div v-if="showDots" class="dots">
        <button v-for="dt in dots" :key="dt.i" class="dot" :class="dt.cls" :aria-label="dt.label" :data-tip="dt.tip" :aria-current="dt.cur === 'page' ? 'page' : undefined" @click="d.go(dt.i)"><span /></button>
      </div>
      <button v-else class="pgc" :aria-label="pgLabel" @click="Object.assign(d.ui, { panel: 'index', sel: null, edit: false })">
        <b class="num">{{ page + 1 }}</b><span class="num">/ {{ L.total }}</span><i class="pgm" aria-hidden="true"><i :style="{ width: Math.round((page + 1) / L.total * 100) + '%' }" /></i>
      </button>
      <button class="nb" :class="hl('pg')" aria-label="次の画面" @click="d.next()"><Icon :d="IC.chevR" /></button>
      <span class="bdgw">
        <button
          class="nb" :class="[d.ui.panel === 'index' ? 'on' : '', hl('index')]"
          :aria-label="'ウィジェット一覧から移動' + (unread ? '、未読' + unread + '件' : '')"
          :aria-keyshortcuts="k1 ? '/' : undefined" :data-key="k1 ? '/' : ''"
          :aria-pressed="d.ui.panel === 'index'" @click="togglePanel('index')"
        ><Icon :d="IC.grid" /></button>
        <span v-if="unread > 0" class="bdg" aria-hidden="true">{{ unread > 99 ? '99+' : unread }}</span>
      </span>
      <button
        class="nb" :class="[d.ui.edit ? 'on' : '', hl('edit')]" aria-label="ウィジェットを編集"
        :aria-keyshortcuts="k1 ? 'e' : undefined" :data-key="k1 ? 'E' : ''" :aria-pressed="d.ui.edit" @click="d.toggleEdit()"
      ><Icon :d="IC.pen" /></button>
      <button
        class="nb" :class="[d.ui.panel === 'global' ? 'on' : '', hl('gear')]" aria-label="全体の設定"
        :aria-keyshortcuts="k1 ? ',' : undefined" :data-key="k1 ? ',' : ''" :aria-pressed="d.ui.panel === 'global'" @click="togglePanel('global')"
      ><Icon :d="IC.sliders" /></button>
    </div>
  </nav>
</template>
