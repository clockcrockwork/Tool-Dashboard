<script setup lang="ts">
import DashboardRoot from './app/shell/DashboardRoot.vue';
import type { Dashboard } from './app/store/store';

defineProps<{ dash: Dashboard }>();
</script>

<template>
  <DashboardRoot :dash="dash" />
</template>
