<script setup lang="ts">
/**
 * 打刻 (punch) — 2×2. 業務の種類（選択チップ）＋状態＋勤務時間＋このセッションの打刻／前回＋今日・今月の合計＋出勤・退勤／休憩・再開.
 * Prototype: Main.dc.html section data-w="punch" (`pnState`, `pnWorked`, `pnLine`, `pnMain*`, `pnBreak*`, `stamp()`), 作り直し:
 * docs/lgd/p2a-followup.md 4章（出勤から退勤までを1セッション、業務の種類、出勤の時刻で集計）。種類のチップ・追加・名前と削除は
 * プロトタイプのスクリプトの切替チップ（`.tgts .chip`、＋、「名前とショートカット」の `.nb` と `.inp`）と同じ作り.
 *
 * 段階表示: 1×1 は状態・時間・出勤／退勤だけ。横2以上・縦1は休憩も。縦2以上でチップと2行（打刻・合計）。横3以上は右に、
 * 横2・縦3以上は下に最近のセッションの一覧.
 * 設定「タイムログにも記録」がオンなら「出勤（本業）」のような文をタイムログにも足す。トーストの「元に戻す」はその打刻で変えた
 * ところだけを戻す（transfer.ts、review #3）.
 */
import { computed, ref } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { fm, useShownNow } from '../shared/time';
import { timelogData, type TimelogData } from '../timelog/data';
import { TYPE_MAX, TYPE_NAME_MAX, type PunchData } from './data';
import { addType, breakOp, canRemoveType, curType, mainOp, openSession, punchTier, punchView, recentRows, removeType, renameType, restoreType, selectType, type PunchOp } from './punch';
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
const v = computed(() => punchView(data.value, now.value));
const tier = computed(() => {
  const pos = d.layout.value.pos[w.id];
  return punchTier(pos ? { w: pos.w, h: pos.h } : { w: w.def.s[0], h: w.def.s[1] });
});
const cur = computed(() => curType(data.value));
const onDuty = computed(() => !!openSession(data.value));
const rows = computed(() => (tier.value.list ? recentRows(data.value, now.value) : []));
const canAdd = computed(() => data.value.types.length < TYPE_MAX && !onDuty.value);
const canDel = computed(() => !!cur.value && canRemoveType(data.value, cur.value.id));
const edHint = computed(() =>
  data.value.types.length <= 1 ? '種類は1つ以上必要です'
  : onDuty.value && openSession(data.value)?.ty === cur.value?.id ? '勤務中の種類は消せません'
  : '消しても、その種類のセッションは種類名のまま残ります');
/** 種類の名前と削除の欄が開いているか（画面の一時状態。保存しない）. */
const ed = ref(false);
const nameInp = ref<HTMLInputElement | null>(null);

function cap(): string {
  return tier.value.chips || !v.value.typeName ? v.value.state : v.value.state + '・' + v.value.typeName;
}

function targets(): PunchTargets {
  // Only an existing, readable time log record is written to (an unknown or broken one is left as it is).
  const raw = d.dataOf<unknown>(TIMELOG_ID);
  return { punch: w.data<PunchData>(), logs: raw === undefined ? null : timelogData.sanitize(raw, d.now()) };
}
function apply(before: PunchTargets, next: PunchTargets): void {
  if (next.punch !== before.punch) w.setData<PunchData>(next.punch);
  if (next.logs && next.logs !== before.logs) d.setData<TimelogData>(TIMELOG_ID, next.logs);
}
function stamp(op: PunchOp): void {
  const before = targets();
  const r = stampPunch(before, op, d.now(), !!w.cfg('log'));
  if (!r) return;
  apply(before, r.next);
  const { receipt } = r;
  d.toast(receipt.text.replace('（', ' ' + fm(receipt.t) + '（'), 'ok', {
    label: '元に戻す',
    fn: () => { const c = targets(); apply(c, undoPunch(c, receipt)); },
  });
}
function main(): void {
  stamp(mainOp(data.value));
}
function brk(): void {
  const op = breakOp(data.value);
  if (op) stamp(op);
}

function sel(id: number): void {
  const next = selectType(data.value, id);
  if (next !== data.value) w.setData<PunchData>(next);
}
function add(): void {
  const next = addType(data.value);
  if (!next) return;
  w.setData<PunchData>(next);
  ed.value = true;
  requestAnimationFrame(() => { nameInp.value?.select(); });
}
function rename(e: Event): void {
  const el = e.target as HTMLInputElement;
  const ty = cur.value;
  if (!ty) return;
  const next = renameType(data.value, ty.id, el.value);
  if (next) w.setData<PunchData>(next);
  else el.value = ty.n;
}
function nameKey(e: KeyboardEvent): void {
  e.stopPropagation();
  if (e.isComposing || e.keyCode === 229) return;
  const el = e.target as HTMLInputElement;
  if (e.key === 'Enter') el.blur();
  else if (e.key === 'Escape') { el.value = cur.value?.n ?? ''; el.blur(); }
}
function del(): void {
  const before = data.value;
  const ty = cur.value;
  if (!ty) return;
  const next = removeType(before, ty.id);
  if (!next) return;
  const at = before.types.findIndex(t => t.id === ty.id);
  const wasLast = before.last === ty.id;
  w.setData<PunchData>(next);
  d.toast('「' + ty.n + '」を削除しました', 'info', {
    label: '元に戻す',
    fn: () => { w.setData<PunchData>(restoreType(w.data<PunchData>(), ty, at, wasLast)); },
  });
}
</script>

<template>
  <WidgetFrame>
    <div class="in" :style="tier.list === 'side' ? 'flex-direction: row; gap: 14px; padding: 16px' : 'flex-direction: column; justify-content: space-between; align-items: center; gap: 6px; padding: 16px'">
      <!-- 横3以上は打刻の列と一覧を横に並べる。それ以外はこの包みを display: contents にして、プロトタイプと同じ1列にする. -->
      <div :style="tier.list === 'side' ? 'display: flex; flex-direction: column; justify-content: space-between; align-items: center; gap: 6px; flex: 1; min-width: 0; min-height: 0' : 'display: contents'">
        <template v-if="tier.chips">
          <div style="display: flex; align-items: center; gap: 4px; flex: none; width: 100%; min-width: 0">
            <div class="tgts" role="group" aria-label="業務の種類" style="flex: 1; min-width: 0">
              <button v-for="t in data.types" :key="t.id" class="chip" :class="t.id === cur?.id ? 'on' : ''" :aria-pressed="t.id === cur?.id" @click="sel(t.id)">{{ t.n }}</button>
              <button class="chip sm" aria-label="業務の種類を追加" :disabled="!canAdd" style="min-width: 36px; padding: 0 8px" @click="add"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 16px; height: 16px"><path d="M6 12h12M12 6v12" /></svg></button>
            </div>
            <button class="nb" :class="ed ? 'on' : ''" aria-label="種類の名前と削除" :aria-expanded="ed" @click="ed = !ed"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 18px; height: 18px"><path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" /></svg></button>
          </div>
          <div v-if="ed" style="display: flex; gap: 6px; align-items: center; flex: none; width: 100%">
            <input ref="nameInp" class="inp" aria-label="種類の名前" :value="cur?.n ?? ''" :maxlength="TYPE_NAME_MAX" style="min-height: 40px; flex: 1" @keydown="nameKey" @change="rename">
            <button class="nb" aria-label="この種類を削除" :disabled="!canDel" @click="del"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 18px; height: 18px"><path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" /></svg></button>
          </div>
        </template>
        <div style="text-align: center"><div class="cap" aria-live="polite">{{ cap() }}</div><div class="num" :style="{ fontSize: tier.list === 'side' ? 'min(22cqh, 9cqw)' : 'min(22cqh, 17cqw)', fontWeight: 300, lineHeight: 1.15 }">{{ v.worked }}</div></div>
        <template v-if="tier.lines">
          <div v-if="ed" class="cap" style="text-align: center">{{ edHint }}</div>
          <template v-else>
            <div class="num mut" style="font-size: var(--fs-s); white-space: nowrap; overflow: hidden; max-width: 100%">{{ v.line }}</div>
            <div class="num cap" style="white-space: nowrap; overflow: hidden; max-width: 100%">{{ v.sum }}</div>
          </template>
        </template>
        <div style="display: flex; gap: 8px; width: 100%; order: 2">
          <button class="chip" :class="v.mainCls" style="flex: 2; padding: 0" @click="main">{{ v.mainLabel }}</button>
          <button v-if="tier.break" class="chip pnbrk" :disabled="v.off" style="flex: 1; padding: 0" @click="brk">{{ v.breakLabel }}</button>
        </div>
      </div>
      <!-- 最近のセッション（order: 1 で、1列のときはボタンの上、横に並べるときは右）. -->
      <div v-if="tier.list" class="scr" :class="tier.list === 'side' ? 'pnside' : ''" role="list" aria-label="最近のセッション" :style="tier.list === 'side' ? 'display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; order: 1; padding-left: 14px; box-shadow: inset 1px 0 0 var(--fill2)' : 'display: flex; flex-direction: column; flex: 1; min-height: 0; width: 100%; order: 1'">
        <p v-if="!rows.length" class="empt">出勤すると、ここにセッションが並びます</p>
        <div v-for="r in rows" :key="r.id" class="row" role="listitem"><span class="mut num" style="width: 64px; flex: none; font-size: var(--fs-s)">{{ r.day }}</span><span class="tt">{{ r.n }}</span><span class="mut num pnspan" style="font-size: var(--fs-s); white-space: nowrap">{{ r.span }}</span><span class="num" style="width: 44px; flex: none; text-align: right">{{ r.len }}</span></div>
      </div>
    </div>
  </WidgetFrame>
</template>

<style scoped>
/* 横に並べた一覧が狭いとき（3×2 など）は、出勤〜退勤の時刻を省いて日付・種類・長さだけにする. */
@container (max-width: 640px) {
  .pnside .pnspan { display: none; }
}
/* 1マス幅（登録の最小は横2だが、置かずに使う・Storybook などで1×1に描かれたとき）は出勤・退勤だけ. */
@container (max-width: 240px) {
  .pnbrk { display: none; }
}
</style>
