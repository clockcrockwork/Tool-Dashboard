<script setup lang="ts">
/**
 * 部品シートの1項目 `.ps-pt`（見出し・クラス名・使う場面・見本・決まり）。
 * kind は見本の描き方: 'vue' = 実際の Vue 部品、'markup' = プロトタイプのクラスを付けた素の要素、'todo' = まだ無い。
 */
defineProps<{ id: string; title: string; code?: string; kind?: 'vue' | 'markup' | 'todo' }>();
const LABEL = { vue: 'Vue 部品', markup: 'クラスだけ', todo: 'P1 で追加' } as const;
const CLS = { vue: 'fx', markup: 'ex', todo: 'nw' } as const;
</script>

<template>
  <section :id="id" class="ps-pt">
    <header><h3>{{ title }}</h3><code v-if="code">{{ code }}</code><span v-if="kind" class="tag" :class="CLS[kind]">{{ LABEL[kind] }}</span></header>
    <p v-if="$slots.use" class="use"><slot name="use" /></p>
    <slot />
  </section>
</template>
