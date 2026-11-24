<script setup lang="ts">
/**
 * 3章「状態の比較」の1マス。押せる部品を、指定の状態のクラス（is-hover / is-press / is-focus / on / disabled）で描く。
 * 'live' は本物の部品（マウス・タッチ・Tab で確かめる）。その状態を持たない部品は「—」。
 */
import { computed } from 'vue';
import Icon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';
import { GIC } from '../icons';
import type { StateCol, StatePart } from '../types';

const props = defineProps<{ part: StatePart; st: StateCol }>();

/** 部品ごとに持たない状態（部品シートの「—」）。 */
const NA: Partial<Record<StatePart, readonly StateCol[]>> = {
  pri: ['on'], bad: ['on'], sw: ['hover', 'press'], inp: ['hover', 'press', 'on'], mi: ['dis'], pgc: ['on', 'dis'],
};
const CLS: Record<StateCol, string> = { n: '', hover: 'is-hover', press: 'is-press', focus: 'is-focus', on: 'on', dis: '', live: '' };
const na = computed(() => NA[props.part]?.includes(props.st) ?? false);
const cls = computed(() => CLS[props.st]);
const dis = computed(() => props.st === 'dis' || undefined);
const on = computed(() => props.st === 'on');
</script>

<template>
  <span v-if="na" class="na">—</span>
  <button v-else-if="part === 'chip'" class="chip" :class="cls" :disabled="dis">書き出し</button>
  <button v-else-if="part === 'pri'" class="chip pri" :class="cls" :disabled="dis">再読み込み</button>
  <button v-else-if="part === 'bad'" class="chip bad" :class="cls" :disabled="dis">削除する</button>
  <button v-else-if="part === 'sm'" class="chip sm" :class="cls" :disabled="dis"><Icon :d="IC.plus" :size="16" />項目</button>
  <button v-else-if="part === 'sel'" class="chip sel" :class="cls" :disabled="dis" :aria-expanded="on"><span class="sv">ボード 1</span><Icon :d="GIC.chevDown" /></button>
  <button v-else-if="part === 'btn'" class="btn" :class="cls" :disabled="dis" aria-label="再生"><Icon :d="IC.play" style="fill: currentColor; stroke: none" /></button>
  <button v-else-if="part === 'nb'" class="nb" :class="cls" :disabled="dis" aria-label="設定"><Icon :d="IC.sliders" /></button>
  <button v-else-if="part === 'abb'" class="abb" :class="cls" :disabled="dis" aria-label="コピー"><Icon :d="GIC.copy" /></button>
  <div v-else-if="part === 'seg'" class="seg"><button class="sg" :class="{ on }">ウェブ</button><button class="sg" :class="on ? '' : cls" :disabled="dis">画像</button></div>
  <button v-else-if="part === 'sw'" class="sw" :class="cls" role="switch" :aria-checked="on" :disabled="dis"><span class="tr"><span class="kn" /></span></button>
  <input v-else-if="part === 'inp'" class="inp" :class="cls" value="リキッド" style="width: 120px" :disabled="dis">
  <div v-else-if="part === 'mi'" class="mnu stx"><div class="mi" :class="cls"><Icon v-if="on" :d="IC.check" />大阪</div></div>
  <button v-else-if="part === 'pgc'" class="pgc" :class="cls"><b class="num">3</b><span class="num">/ 12</span><i class="pgm"><i style="width: 25%" /></i></button>
</template>
