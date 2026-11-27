<script setup lang="ts">
/**
 * 日の出・日の入り (sun) — 2×1. 一文＋時刻＋24時間の帯、縦2で太陽の通り道と3つの数、縦3以上・大きく表示で7日間（仕様書 11章）.
 * Prototype: Main.dc.html section data-w="sun" (markup 765–797), values `renderVals()` `sunV` and `sunAt()`, `pq.sun` in `xVals()`.
 *
 * - 端末の中の計算だけ（通信しない。接続の点を出さない、登録の `net` なし）。描き直しは表示中だけ（`useShownNow`、登録の `refresh`）。
 * - 場所は設定「場所」（`cfg.loc`）。「現在地」の位置は保存しない（`status.ts` の runtime）。許可のお願いは共通の仕組み（`askPerm`）で、
 *   共通の枠が中身の置き換えに出す（登録の `perm: ['geo']`）。
 * - 出ていない段（縦2・縦3）は要素を作らず、計算もしない（`sunTiers`）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { useShownNow } from '../shared/time';
import { sunTiers, sunView, sunWhere } from './sun';
import { sunRuntime, useSunGeo } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const rt = sunRuntime(d);
const now = useShownNow(d, w.id);
const tiers = computed(() => {
  const temp = d.ui.temp === w.id;
  const big = d.ui.big === w.id && (!d.g.off[w.id] || temp);
  const def = w.def.ts ?? w.def.s;
  const pos = d.layout.value.pos[w.id];
  const cells = temp || !pos ? { w: def[0], h: def[1] } : { w: pos.w, h: pos.h };
  return sunTiers(cells, big, temp);
});
const sun = computed(() => sunView(now.value, sunWhere(w.cfg('loc'), rt.geo), tiers.value));
useSunGeo(d, w.id, () => w.cfg('loc'));
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; justify-content: center; gap: 10px; padding: 12px 16px">
      <div style="display: flex; align-items: center; gap: 12px; flex: none">
        <svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: min(44cqh, 52px); height: min(44cqh, 52px); stroke-width: 1.3"><path :d="sun.icon" /></svg>
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
          <div style="font-size: min(17cqh, 19px); font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ sun.head }}</div>
          <div class="cap num" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ sun.sub }}</div>
          <div class="sunb" role="img" :aria-label="sun.label" :style="{ background: sun.band }"><span class="tk" style="left: 25%" /><span class="tk" style="left: 50%" /><span class="tk" style="left: 75%" /><span class="nw" :style="{ left: sun.nowL }" /></div>
        </div>
      </div>
      <div v-if="sun.t2" style="flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; padding-top: 10px; box-shadow: inset 0 1px 0 var(--fill2)">
        <span class="cap" style="flex: none">{{ sun.place }}</span>
        <svg class="sunarc" viewBox="0 0 240 84" role="img" :aria-label="sun.arcLabel">
          <line x1="0" x2="240" :y1="sun.aHy" :y2="sun.aHy" style="stroke: var(--fill2); stroke-width: 1.5" />
          <path :d="sun.aAll" style="fill: none; stroke: var(--mut); stroke-width: 1.5; stroke-dasharray: 2 4; opacity: .55" />
          <path :d="sun.aUp" style="fill: none; stroke: var(--sun-d); stroke-width: 2.5; stroke-linecap: round" />
          <circle :cx="sun.aCx" :cy="sun.aCy" r="6" :style="'fill: ' + sun.aDot + '; stroke: var(--sun-d); stroke-width: 2'" />
          <text :x="sun.aRx" :y="sun.aTy">{{ sun.aRt }}</text><text :x="sun.aSx" :y="sun.aTy">{{ sun.aSt }}</text>
        </svg>
        <div class="sung">
          <div v-for="sx in sun.stats" :key="sx.l"><span class="cap">{{ sx.l }}</span><b>{{ sx.v }}</b><span class="cap">{{ sx.s }}</span></div>
        </div>
      </div>
      <div v-if="sun.t3" class="sunw" aria-label="7日間の日の出と日の入り" role="group">
        <div v-for="(sd, i) in sun.week" :key="i" class="sunr"><span class="cap">{{ sd.l }}</span><span class="sunb" aria-hidden="true" :style="{ background: sd.band }" /><span class="num"><span class="vh">日の出</span>{{ sd.r }}</span><span class="num"><span class="vh">日の入り</span>{{ sd.s }}</span></div>
      </div>
    </div>
  </WidgetFrame>
</template>
