/**
 * 録音の実行状態と操作（保存しない）. 登録の `run: 'continuous'`（継続実行）: 「録音を始める」で始め、「録音を止める」まで続く。
 *
 * - 実行状態（録音中か・始めた時刻・録音の一覧・再生中の録音）は Dashboard の実行管理（`runtimeOf(d)`）に置いた1個ごとに持つ。
 *   録音中の MediaRecorder・マイク・再生中の音は、部品ではなくこのモジュール（Dashboard ごとの表）が持つので、置き場所の変更・
 *   画面の移動・前面表示・一時利用を閉じる・部品の unmount では止まらない。止めるのは利用者の操作だけ。
 * - 決まった時刻にすることは無いので `Runner` は持たない（経過は始めた時刻から計算する。描き直しは表示中だけ）。
 * - 録音は保存しない（実装ガイド 6章・付録: 再読み込みで消える、最大6件）。あふれた録音・消した録音の object URL は放す。
 * - マイクの許可のお願い（仕様書 4章「許可のお願い」）: 共通の許可のお願いは通知だけなので、共通の枠の置き換え（`cover`）に
 *   この種類の文を渡す（`recCover`）。ブラウザに問い合わせるのは「マイクを使う」「もう一度」を押したときだけ。許可の状態は
 *   Permissions API で読み、保存しない。
 */
import { reactive } from 'vue';
import type { Dashboard } from '../../app/store/store';
import type { WidgetCover } from '../../app/shell/cover';
import { runtimeOf } from '../../app/runtime/runtime';
import { MIC_ASK, MIC_ICON, MIC_NO, REC_IDLE, TAKES_MAX, addTake, restoreTake, type RecRun, type Take } from './recorder';
import { recDevice, type MicState, type Playback, type RecHandle } from './device';

type Live = { rec: RecHandle | null; opening: boolean; stopping: boolean; playback: Playback | null; bin: Take[] };
type Shared = { s: { mic: MicState; ask: Record<string, boolean> }; live: Map<string, Live>; off: () => void };

const shared = new WeakMap<Dashboard, Shared>();

function sharedOf(d: Dashboard): Shared {
  let x = shared.get(d);
  if (!x) {
    const s = reactive<Shared['s']>({ mic: '', ask: {} });
    const off = recDevice().watchMic((m) => { s.mic = m; });
    x = { s, live: new Map(), off };
    shared.set(d, x);
  }
  return x;
}

function liveOf(d: Dashboard, id: string): Live {
  const sh = sharedOf(d);
  let l = sh.live.get(id);
  if (!l) {
    l = { rec: null, opening: false, stopping: false, playback: null, bin: [] };
    sh.live.set(id, l);
  }
  return l;
}

export function recOf(d: Dashboard, id: string): RecRun {
  return runtimeOf(d).state(id, REC_IDLE);
}
function setRec(d: Dashboard, id: string, r: RecRun): void {
  runtimeOf(d).set(id, r);
}

/** マイクの許可の状態（Permissions API と最後の問い合わせの結果。保存しない）. */
export function micOf(d: Dashboard): MicState {
  return sharedOf(d).s.mic;
}
/** Input level now (0 while not recording). Read it on the redraw clock. */
export function recLevel(d: Dashboard, id: string): number {
  const h = liveOf(d, id).rec;
  return h ? h.level() : 0;
}

function ask(d: Dashboard, id: string, on: boolean): void {
  const s = sharedOf(d).s;
  if (on) s.ask = { ...s.ask, [id]: true };
  else if (s.ask[id]) { const a = { ...s.ask }; delete a[id]; s.ask = a; }
}
export function recAskOf(d: Dashboard, id: string): boolean {
  return !!sharedOf(d).s.ask[id];
}

/** Starts recording now (after the explicit 「マイクを使う」 or when the microphone is allowed already). */
export function recGo(d: Dashboard, id: string): void {
  ask(d, id, false);
  const l = liveOf(d, id);
  if (l.rec || l.opening || recOf(d, id).on) return;
  l.opening = true;
  const sh = sharedOf(d);
  recDevice().open().then((h) => {
    l.opening = false;
    sh.s.mic = 'ok';
    l.rec = h;
    stopPlayback(d, id);
    setRec(d, id, { ...recOf(d, id), on: true, start: d.now(), play: null });
  }, () => {
    l.opening = false;
    sh.s.mic = 'no';
    ask(d, id, true);
  });
}

/** Stops recording; the take is added when the audio is ready (keeping the newest 6). */
export function recStop(d: Dashboard, id: string): void {
  const l = liveOf(d, id);
  const h = l.rec;
  if (!h || l.stopping) return;
  l.stopping = true;
  const start = recOf(d, id).start;
  void h.stop().then((blob) => {
    l.stopping = false;
    l.rec = null;
    const cur = recOf(d, id);
    if (!blob) { setRec(d, id, { ...cur, on: false }); return; }
    const end = d.now();
    const r = addTake(cur.takes, { id: start, t: start, dur: Math.max(0, end - start), url: recDevice().url(blob) });
    for (const x of r.dropped) recDevice().revoke(x.url);
    setRec(d, id, { ...cur, on: false, takes: r.takes });
  });
}

/**
 * 「録音を始める」「録音を止める」 (prototype `recToggle`). Without the microphone allowed, the request is shown first (in place of
 * the content); the browser is asked only from its 「マイクを使う」.
 */
export function recToggle(d: Dashboard, id: string): void {
  if (recOf(d, id).on) { recStop(d, id); return; }
  if (micOf(d) !== 'ok') { ask(d, id, true); return; }
  recGo(d, id);
}

function stopPlayback(d: Dashboard, id: string): void {
  const l = liveOf(d, id);
  l.playback?.stop();
  l.playback = null;
}

/** 再生・再生を止める (prototype `playTake`). One take plays at a time. */
export function playTake(d: Dashboard, id: string, takeId: number): void {
  const cur = recOf(d, id);
  stopPlayback(d, id);
  if (cur.play === takeId) { setRec(d, id, { ...cur, play: null }); return; }
  const tk = cur.takes.find(x => x.id === takeId);
  if (!tk) return;
  setRec(d, id, { ...cur, play: takeId });
  const l = liveOf(d, id);
  recDevice().play(tk.url, () => {
    if (recOf(d, id).play === takeId) { l.playback = null; setRec(d, id, { ...recOf(d, id), play: null }); }
  }).then((p) => {
    if (recOf(d, id).play === takeId) l.playback = p;
    else p.stop();
  }, () => {
    if (recOf(d, id).play === takeId) setRec(d, id, { ...recOf(d, id), play: null });
    d.toast('再生できませんでした', 'warn');
  });
}

/** この録音を削除, with 「元に戻す」 (the take only; recordings made since stay). Deleted takes are released later. */
export function deleteTake(d: Dashboard, id: string, takeId: number): void {
  const cur = recOf(d, id);
  const tk = cur.takes.find(x => x.id === takeId);
  if (!tk) return;
  if (cur.play === takeId) stopPlayback(d, id);
  setRec(d, id, { ...cur, takes: cur.takes.filter(x => x.id !== takeId), play: cur.play === takeId ? null : cur.play });
  const l = liveOf(d, id);
  l.bin.push(tk);
  // Keeps the last few deleted takes for 「元に戻す」; older ones are released.
  while (l.bin.length > TAKES_MAX) { const x = l.bin.shift(); if (x) recDevice().revoke(x.url); }
  d.toast('録音を削除しました', 'info', {
    label: '元に戻す',
    fn: () => {
      const i = l.bin.findIndex(x => x.id === takeId);
      const back = i >= 0 ? restoreTake(recOf(d, id).takes, tk) : null;
      if (!back) return;
      l.bin.splice(i, 1);
      setRec(d, id, { ...recOf(d, id), takes: back });
    },
  });
}

/** The request card in place of the content (prototype `pq.recorder`), or null. */
export function recCover(d: Dashboard, id: string): WidgetCover | null {
  if (!recAskOf(d, id)) return null;
  const close = (): void => { ask(d, id, false); };
  const go = (): void => { recGo(d, id); };
  const t = micOf(d) === 'no' ? MIC_NO : MIC_ASK;
  return { icon: MIC_ICON, title: t.title, text: t.text, ok: { label: t.ok, fn: go }, alt: { label: t.alt, fn: close }, ...(micOf(d) === 'no' ? { warn: true } : {}) };
}

/** Stories and tests: show the request (`ask`) or the refusal (`no`) as is. */
export function setRecAsk(d: Dashboard, id: string, st: 'ask' | 'no' | null): void {
  const sh = sharedOf(d);
  if (st === 'no') sh.s.mic = 'no';
  else if (st === 'ask' && sh.s.mic === 'no') sh.s.mic = '';
  ask(d, id, st !== null);
}

/** Stories and tests: put a run state as is (no microphone). */
export function setRecRun(d: Dashboard, id: string, r: RecRun): void {
  setRec(d, id, r);
}
