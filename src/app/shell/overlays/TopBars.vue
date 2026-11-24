<script setup lang="ts">
/**
 * 上部の帯 `.rcv`: 受け渡しの知らせ (data from the share widget in P2) and 新しい版の帯.
 * Markup: Main.dc.html 1772–1783. The two bars are adjacent siblings so `.rcv.open+.rcv.open` stacks them.
 */
import { computed } from 'vue';
import { useDash } from '../../context';
import { closeNotice, noticeOpen, updGo, updLater, updOpen } from '../../store/overlays';

const d = useDash();
const bar = computed(() => d.ui.rcv ?? null);
const open = computed(() => noticeOpen(d));
const upd = computed(() => updOpen(d));
</script>

<template>
  <div class="rcv" :class="{ open }" role="status" aria-live="polite">
    <svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 18px; height: 18px; color: var(--a1)"><path :d="bar?.d ?? ''" /></svg>
    <span class="tx">{{ bar?.text }}</span>
    <button class="chip pri" @click="bar?.act()">{{ bar?.al }}</button>
    <button class="nb" aria-label="通知を閉じる" @click="closeNotice(d)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 16px; height: 16px"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg></button>
  </div>
  <div class="rcv" :class="{ open: upd }" role="status" aria-live="polite">
    <svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 18px; height: 18px; color: var(--a1)"><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V9h-4.5" /></svg>
    <span class="tx">新しい版があります</span>
    <button class="chip pri" @click="updGo(d)">再読み込み</button>
    <button class="nb" aria-label="あとで" @click="updLater(d)"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 16px; height: 16px"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg></button>
  </div>
</template>
