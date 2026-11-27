<script setup lang="ts">
/**
 * ポモドーロ (pomo) — 2×1. 進行リング＋残り時間＋スタート・一時停止／リセット.
 * Prototype: Main.dc.html section data-w="pomo"; `pomoTime`, `pomoDash`, `pomoD`, `togglePomo`, `resetPomo` in
 * `renderVals()`, `pomoTog()`, `pq.pomo` in `xVals()`, the countdown in `tick()`.
 *
 * - 残りは終わる時刻から計算する（pomo.ts）。描き直しは表示中だけ（`useShownNow`）。
 * - 実行状態は Dashboard の実行管理にあり（status.ts）、完了は runner.ts が期限で判定する。この部品は操作と表示だけなので、
 *   一時利用を閉じても・未配置でも時間どおりに一度だけ終わり、開き直しても二重に始まらない。
 * - 「完了を通知」がオンで通知の許否がまだなら、スタートの前に共通の枠の許可のお願いを出す（共通の通知、仕様書 4章「許可のお願い」）。
 * - 動いているか・終わる時刻・残りは保存しない（再読み込みで止まる。プロトタイプと同じ）。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { useShownNow } from '../shared/time';
import { pomoView } from './pomo';
import { pomoReset, pomoRunOf, pomoToggle, pomoTotal } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const run = computed(() => pomoRunOf(d, w.id));
const total = computed(() => pomoTotal(d, w.id));
const v = computed(() => pomoView(run.value, total.value, now.value));

const toggle = (): void => { pomoToggle(d, w.id); };
const reset = (): void => { pomoReset(d, w.id); };
</script>

<template>
  <WidgetFrame heading="ポモドーロタイマー">
    <div class="in" style="align-items: center; justify-content: center; gap: 16px">
      <div style="position: relative; height: min(84cqh, 46cqw); aspect-ratio: 1; flex: none">
        <svg aria-hidden="true" viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg)"><circle cx="50" cy="50" r="42" fill="none" stroke-width="6" style="stroke: var(--fill2)" /><circle cx="50" cy="50" r="42" fill="none" stroke-width="6" stroke-linecap="round" :stroke-dasharray="v.dash" style="stroke: var(--a2); transition: stroke-dasharray 1s linear" /></svg>
        <div class="num" style="position: absolute; inset: 0; display: grid; place-items: center; font-size: min(22cqh, 12cqw); font-weight: 400">{{ v.time }}</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px">
        <button class="btn on" aria-label="スタート・一時停止" :aria-pressed="run.on" @click="toggle"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path :d="v.d" /></svg></button>
        <button class="btn" aria-label="リセット" @click="reset"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" /></svg></button>
      </div>
    </div>
  </WidgetFrame>
</template>
