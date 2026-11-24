<script setup lang="ts">
/**
 * 天気 (weather) — 2×1, net: data. 朝・昼・夜＋湿度、縦2以上で3時間ごと、縦2以上かつ横3以上または縦3以上で週間.
 * Prototype: Main.dc.html section data-w="weather" (markup 723–747), values `renderVals()` `wd`.
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { stateClass, stateText, weatherTiers, weatherView } from './weather';
import { retryWeather, useWeatherTiers, weatherRuntime } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const rt = weatherRuntime(d);
const tiers = computed(() => {
  const def = w.def.s;
  const pos = d.layout.value.pos[w.id];
  return weatherTiers(pos ? { w: pos.w, h: pos.h } : { w: def[0], h: def[1] }, !!d.g.off[w.id]);
});
// 段のデータは表示中のときだけ取りに行き・更新する（status.ts）. unmount で止まる.
const place = useWeatherTiers(d, w.id, () => tiers.value);
const v = computed(() => weatherView(new Date(d.ui.t), w.cfg('unit') === '°F', tiers.value, place.ready));
const stc = computed(() => stateClass(rt.st));
const st = computed(() => stateText(rt.st, d.ui.t));
</script>

<template>
  <WidgetFrame :state-class="stc" :st-msg="st[0]" :st-act="st[1]" :st-sub="st[2]" @retry="retryWeather(d)">
    <div class="in" style="flex-direction: column; justify-content: center; gap: 10px; padding: 12px 16px">
      <div style="display: flex; align-items: center; gap: 8px">
        <div v-for="wp in v.parts" :key="wp.l" class="wcol" style="flex: 1"><span class="cap">{{ wp.l }}</span><svg class="i" role="img" :aria-label="wp.a" viewBox="0 0 24 24" style="width: 26px; height: 26px; stroke-width: 1.4"><path :d="wp.d" /></svg><span class="num" style="font-size: var(--fs-xl); font-weight: 300; line-height: 1.2">{{ wp.t }}</span></div>
        <div class="wcol whum" style="flex: none; padding-left: 12px; box-shadow: inset 1px 0 0 var(--fill2)"><span class="cap">湿度</span><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 26px; height: 26px; stroke-width: 1.4; color: var(--mut)"><path d="M12 3.5c3.2 4 5.5 6.9 5.5 10a5.5 5.5 0 0 1-11 0c0-3.1 2.3-6 5.5-10z" /></svg><span class="num" style="font-size: var(--fs-xl); font-weight: 300; line-height: 1.2">{{ v.hum }}</span></div>
      </div>
      <div v-if="v.hoursWait" class="skl" role="status" aria-label="3時間ごとの天気を読み込み中" />
      <div v-if="v.hoursOn" style="display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 2px; padding-top: 10px; box-shadow: inset 0 1px 0 var(--fill2)">
        <div v-for="(wh, i) in v.hours" :key="i" class="wcol"><span class="cap num">{{ wh.l }}</span><svg class="i" role="img" :aria-label="wh.a" viewBox="0 0 24 24" style="width: 18px; height: 18px"><path :d="wh.d" /></svg><span class="num" style="font-size: var(--fs-m)">{{ wh.t }}</span></div>
      </div>
      <div v-if="v.weekWait" class="skl" role="status" aria-label="週間天気を読み込み中" />
      <div v-if="v.weekOn" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; padding-top: 10px; box-shadow: inset 0 1px 0 var(--fill2)">
        <div v-for="(ww, i) in v.week" :key="i" class="wcol"><span class="cap">{{ ww.l }}</span><svg class="i" role="img" :aria-label="ww.a" viewBox="0 0 24 24" style="width: 18px; height: 18px"><path :d="ww.d" /></svg><span class="num" style="font-size: var(--fs-m)">{{ ww.hi }}</span><span class="cap num">{{ ww.lo }}</span></div>
      </div>
    </div>
  </WidgetFrame>
</template>
