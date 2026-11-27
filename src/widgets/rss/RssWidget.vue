<script setup lang="ts">
/**
 * RSS (rss) — 3×3, net: data. フィードの切替チップ＋選んだフィードの行（行の領域だけを縦に送る）.
 * Prototype: Main.dc.html section data-w="rss" (markup 1021–1039), values `renderVals()` `feeds` `feedItems`.
 *
 * - 見本のデータ（接続の点で見本と示す）。取得・更新は表示中だけ（`status.ts`・`source.ts`、登録の `refresh`）。
 * - 5つの状態は共通の枠の覆い（`stateClass`）。選んでいるフィードは保存しない（プロトタイプと同じ。配置ごとの runtime）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { stateClass, stateText } from '../weather/weather';
import { rssView } from './rss';
import { RSS_KEY, retryRss, rssFeedOf, rssSource, setRssFeed } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const rt = rssSource.runtime(d);
const place = rssSource.use(d, w.id, () => RSS_KEY);
const v = computed(() => rssView(place.val, rssFeedOf(d, w.id)));
const stc = computed(() => stateClass(rt.st));
const st = computed(() => stateText(rt.st, d.ui.t));
</script>

<template>
  <WidgetFrame heading="RSS ピッカー" :state-class="stc" :st-msg="st[0]" :st-act="st[1]" :st-sub="st[2]" @retry="retryRss(d, w.id)">
    <div class="in" style="flex-direction: column; gap: 10px; padding: 16px">
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
        <svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="color: var(--a2); margin-right: 2px"><path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8M5.5 18.5h.1" /></svg>
        <button v-for="(f, i) in v.feeds" :key="f.name" class="chip" :class="f.cls" :aria-pressed="f.on" @click="setRssFeed(d, w.id, i)">{{ f.name }}</button>
      </div>
      <div class="scr" style="flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px">
        <div v-for="(n, i) in v.items" :key="i" style="display: flex; align-items: baseline; gap: 12px; min-height: 40px; padding: 0 4px"><span style="flex: 1; min-width: 0; font-size: var(--fs-l); white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ n.t }}</span><span class="cap num">{{ n.m }}</span></div>
      </div>
    </div>
  </WidgetFrame>
</template>
