<script setup lang="ts">
/**
 * ポモドーロ (pomo) — 2×1. 進行リング＋残り時間＋スタート・一時停止／リセット.
 * Prototype: Main.dc.html section data-w="pomo"; `pomoTime`, `pomoDash`, `pomoD`, `togglePomo`, `resetPomo` in
 * `renderVals()`, `pomoTog()`, `pq.pomo` in `xVals()`, the countdown in `tick()`.
 *
 * - 残りは終わる時刻から計算する（pomo.ts）。終わりは終わる時刻に合わせた timer で知る（1秒ごとに数えない、実装ガイド 8章）。
 *   描き直しは表示中だけ（`useShownNow`）。表示中でない画面にあっても時間どおりに終わる。
 * - 「完了を通知」がオンで通知の許否がまだなら、スタートの前に共通の枠の許可のお願い（`cover`）を出す（仕様書 4章「許可のお願い」）。
 *   知らせは開いている間だけ（実装ガイド 7.2）: トーストと、タブが裏にあるときのブラウザの通知。人前では隠している間は知らせない。
 * - 動いているか・終わる時刻・残りは保存しない（status.ts、再読み込みで止まる。プロトタイプと同じ）。
 */
import { computed, onBeforeUnmount, watch } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import type { WidgetCover } from '../../app/shell/cover';
import { notifyIfHidden, notifyPerm, requestNotify } from '../shared/notify';
import { useShownNow } from '../shared/time';
import { POMO_IDLE, pausePomo, pomoFinished, pomoView, startPomo, type PomoRun } from './pomo';
import { pomoAskOf, pomoRunOf, setPomoAsk, setPomoRun } from './status';

/** 鐘の印 (prototype `IX().bell`). */
const BELL = 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const now = useShownNow(d, w.id);
const run = computed(() => pomoRunOf(d, w.id));
const total = computed(() => (Number(w.cfg('min')) || 25) * 60);
const v = computed(() => pomoView(run.value, total.value, now.value));

const set = (r: PomoRun): void => { setPomoRun(d, w.id, r); };

// ----- 終わり -----
let timer: ReturnType<typeof setTimeout> | undefined;
function finish(): void {
  set(POMO_IDLE);
  if (!w.cfg('notify') || d.veiled(w.id)) return;
  d.toast('ポモドーロ完了', 'ok');
  notifyIfHidden('ポモドーロ完了', '集中の時間が終わりました');
}
function check(): void {
  if (pomoFinished(run.value, d.now())) finish();
  else schedule();
}
function schedule(): void {
  clearTimeout(timer);
  timer = undefined;
  const r = run.value;
  if (r.on && r.endAt !== null) timer = setTimeout(check, Math.max(0, r.endAt - d.now()));
}
watch(run, schedule, { immediate: true });
const onVis = (): void => { if (!document.hidden) check(); };
document.addEventListener('visibilitychange', onVis);
onBeforeUnmount(() => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); });

// ----- 操作と許可のお願い -----
/** The permission card (prototype `pmAsk.pomo`; not saved, status.ts). */
const ask = computed(() => pomoAskOf(d, w.id));
const close = (): void => { setPomoAsk(d, w.id, null); };
function go(): void {
  close();
  set(startPomo(run.value, total.value, d.now()));
}
function toggle(): void {
  const r = run.value;
  if (!r.on && w.cfg('notify') && notifyPerm() === '') {
    setPomoAsk(d, w.id, 'ask');
    return;
  }
  set(r.on ? pausePomo(r, d.now()) : startPomo(r, total.value, d.now()));
}
function reset(): void {
  set(POMO_IDLE);
}
async function allow(): Promise<void> {
  const r = await requestNotify();
  if (r === 'ok') go();
  else setPomoAsk(d, w.id, 'no');
}
const cover = computed<WidgetCover | null>(() => {
  if (!ask.value) return null;
  if (ask.value === 'no') {
    return {
      icon: BELL, warn: true, title: '通知を出せません', text: 'ブラウザの設定で許可できます。いまは画面の中だけで知らせます',
      ok: { label: 'このまま始める', fn: go }, alt: { label: '閉じる', fn: close },
    };
  }
  return {
    icon: BELL, title: '終わったら通知しますか？', text: 'このタブを見ていないときも、集中の時間が終わったことを知らせます。',
    ok: { label: '通知を許可', fn: () => { void allow(); } },
    alt: { label: '通知しない', fn: () => { w.setCfg('notify', false); go(); } },
  };
});
</script>

<template>
  <WidgetFrame heading="ポモドーロタイマー" :cover="cover">
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
