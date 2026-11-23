<script setup lang="ts">
/**
 * 部品シートの1項目 `.ps-pt`（見出し・クラス名・使う場面・見本・決まり）。
 * kind は見本の描き方: 'vue' = 実際の Vue 部品、'mix' = 一部が Vue 部品（残りはクラスだけ）、
 * 'markup' = プロトタイプのクラスを付けた素の要素、'todo' = まだ無い。
 */
import { KIND_CLS, KIND_LABEL, type PatternKind } from './kinds';

defineProps<{ id: string; title: string; code?: string; kind?: PatternKind }>();
const LABEL = KIND_LABEL;
const CLS = KIND_CLS;
</script>

<template>
  <section :id="id" class="ps-pt">
    <header><h3>{{ title }}</h3><code v-if="code">{{ code }}</code><span v-if="kind" class="tag" :class="CLS[kind]">{{ LABEL[kind] }}</span></header>
    <p v-if="$slots.use" class="use"><slot name="use" /></p>
    <slot />
  </section>
</template>
