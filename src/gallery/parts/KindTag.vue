<script setup lang="ts">
/** 見本の描き方の印 `.tag`（Vue 部品／一部 Vue 部品／クラスだけ）。 */
import { KIND_CLS, KIND_LABEL, type PatternKind } from './kinds';

defineProps<{ kind: PatternKind }>();
</script>

<template>
  <span class="tag" :class="KIND_CLS[kind]">{{ KIND_LABEL[kind] }}</span>
</template>
