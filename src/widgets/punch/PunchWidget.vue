<script setup lang="ts">
/**
 * 打刻 (punch) — 2×2. 状態＋勤務時間＋最近の打刻＋出勤・退勤／休憩・再開.
 * Prototype: Main.dc.html section data-w="punch"; `pnState`, `pnWorked`, `pnLine`, `pnMain*`, `pnBreak*`, `stamp()`.
 * 設定「タイムログにも記録」がオンなら、同じ文（出勤・休憩開始・休憩終了・退勤）をタイムログにも足す。打刻のトーストの「元に戻す」は
 * その打刻で足した行だけを消す（transfer.ts、review #3）.
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { fm, useShownNow } from '../shared/time';
import { timelogData, type TimelogData } from '../timelog/data';
import type { PunchData, PunchKind } from './data';
import { PUNCH_LABEL, breakKind, mainKind, punchView } from './punch';
import { stampPunch, undoPunch, type PunchTargets } from './transfer';

/**
 * Where 「タイムログにも記録」 writes: the time log's placement. タイムログは1つだけ置ける種類（`multi: false`）なので、
 * その配置 ID は種類 ID と同じ。選べるようにするのは複数配置（P3）と一緒に.
 */
const TIMELOG_ID = 'timelog';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const data = computed(() => w.data<PunchData>());
const v = computed(() => punchView(data.value.stamps, now.value));

function cur(): PunchTargets {
  // Only an existing, readable time log record is written to (an unknown or broken one is left as it is).
  const raw = d.dataOf<unknown>(TIMELOG_ID);
  return { punch: w.data<PunchData>(), logs: raw === undefined ? null : timelogData.sanitize(raw, d.now()) };
}
function apply(before: PunchTargets, next: PunchTargets): void {
  if (next.punch !== before.punch) w.setData<PunchData>(next.punch);
  if (next.logs && next.logs !== before.logs) d.setData<TimelogData>(TIMELOG_ID, next.logs);
}
function stamp(k: PunchKind): void {
  const t = d.now();
  const before = cur();
  const { next, receipt } = stampPunch(before, k, t, !!w.cfg('log'));
  apply(before, next);
  d.toast(PUNCH_LABEL[k] + ' ' + fm(t), 'ok', {
    label: '元に戻す',
    fn: () => { const c = cur(); apply(c, undoPunch(c, receipt)); },
  });
}
function main(): void {
  stamp(mainKind(data.value.stamps));
}
function brk(): void {
  const k = breakKind(data.value.stamps);
  if (k) stamp(k);
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; justify-content: space-between; align-items: center; gap: 6px; padding: 16px">
      <div style="text-align: center"><div class="cap" aria-live="polite">{{ v.state }}</div><div class="num" style="font-size: min(22cqh, 17cqw); font-weight: 300; line-height: 1.15">{{ v.worked }}</div></div>
      <div class="num mut" style="font-size: var(--fs-s); white-space: nowrap; overflow: hidden; max-width: 100%">{{ v.line }}</div>
      <div style="display: flex; gap: 8px; width: 100%">
        <button class="chip" :class="v.mainCls" style="flex: 2; padding: 0" @click="main">{{ v.mainLabel }}</button>
        <button class="chip" :disabled="v.off" style="flex: 1; padding: 0" @click="brk">{{ v.breakLabel }}</button>
      </div>
    </div>
  </WidgetFrame>
</template>
