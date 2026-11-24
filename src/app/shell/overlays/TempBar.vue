<script setup lang="ts">
/** 一時利用の帯 `.tmpbar` 「‹ 戻る／名前／「ボード名」に追加」 (仕様書 2章「置かずに使う」). Markup: Main.dc.html 691. */
import { computed } from 'vue';
import { useDash } from '../../context';
import { defOf } from '../../registry/instances';
import { IC } from '../../parts/icons';
import Icon from '../../parts/LineIcon.vue';
import { collapse, placeTemp } from '../../store/overlays';
import { targetBoard } from '../../store/sheets';

const d = useDash();
const open = computed(() => !!d.ui.temp && d.ui.big === d.ui.temp);
const name = computed(() => (d.ui.temp ? defOf(d.ui.temp)?.n ?? '' : ''));
const place = computed(() => '「' + targetBoard(d).n + '」に追加');
</script>

<template>
  <div class="tmpbar" :class="{ open }" style="padding-left: 4px"><button class="bk" style="margin-left: 0; padding: 0 10px 0 6px" @click="collapse(d)"><Icon :d="IC.back" />戻る</button><span class="tx">{{ name }}</span><button class="chip" style="min-height: 40px; background: var(--a1); color: var(--on-a); font-weight: 600; font-size: var(--fs-m)" @click="placeTemp(d)">{{ place }}</button></div>
</template>
