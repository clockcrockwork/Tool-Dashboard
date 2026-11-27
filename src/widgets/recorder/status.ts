/**
 * 録音の実行状態と操作（保存しない）. 登録の `run: 'continuous'`（継続実行）: 「録音を始める」で始め、「録音を止める」まで続く。
 *
 * - 実行状態（録音中か・始めた時刻・録音の一覧・再生中の録音）は Dashboard の実行管理（`runtimeOf(d)`）に置いた1個ごとに持つ。
 *   録音中の MediaRecorder・マイク・再生中の音は、部品ではなくこのモジュール（Dashboard ごとの表）が持つので、置き場所の変更・
 *   画面の移動・前面表示・一時利用を閉じる・部品の unmount では止まらない。止めるのは利用者の操作と、配置が並びから消えたとき
 *   （読み込み・元に戻す）・実行管理を止めたときの後始末（`runtimeOf(d).onDispose`）だけ。
 * - 決まった時刻にすることは無いので `Runner` は持たない（経過は始めた時刻から計算する。描き直しは表示中だけ）。
 * - 録音は保存しない（実装ガイド 6章・付録: 再読み込みで消える、最大6件）。あふれた録音・消した録音の object URL は放す。
 * - マイクの許可のお願い（仕様書 4章「許可のお願い」）は共通の仕組み（`askPerm(d, id, 'mic', …)`、`src/app/runtime/permission.ts`）。
 *   共通の枠がカードを出し、ブラウザに問い合わせるのは「マイクを使う」「もう一度」を押したときだけ。問い合わせはマイクを開いて
 *   録音を始めることそのもの（`request`。二度開かない）。許可の状態は Permissions API で読み、保存しない。
 */
import type { Dashboard } from '../../app/store/store';
import { runtimeOf } from '../../app/runtime/runtime';
import { askPerm, permAskOf, permOf, setPermAsk, type AskOpts, type PermState } from '../../app/runtime/permission';
import { MIC_ASK, REC_IDLE, TAKES_MAX, addTake, restoreTake, type RecRun, type Take } from './recorder';
import { recDevice, type Playback, type RecHandle } from './device';

type Live = {
  rec: RecHandle | null;
  /** The microphone being opened (a second press waits for the same one). */
  opening: Promise<boolean> | null;
  stopping: boolean;
  playback: Playback | null;
  bin: Take[];
  /** Unregisters the cleanup (`onDispose`) while one is registered. */
  off: (() => void) | null;
};

const lives = new WeakMap<Dashboard, Map<string, Live>>();

function liveOf(d: Dashboard, id: string): Live {
  let m = lives.get(d);
  if (!m) {
    m = new Map();
    lives.set(d, m);
  }
  let l = m.get(id);
  if (!l) {
    l = { rec: null, opening: null, stopping: false, playback: null, bin: [], off: null };
    m.set(id, l);
  }
  return l;
}

export function recOf(d: Dashboard, id: string): RecRun {
  return runtimeOf(d).state(id, REC_IDLE);
}
function setRec(d: Dashboard, id: string, r: RecRun): void {
  runtimeOf(d).set(id, r);
}

/** マイクの許可の状態（共通の許可の状態。保存しない）. */
export function micOf(d: Dashboard): PermState {
  return permOf(d, 'mic');
}
/** Input level now (0 while not recording). Read it on the redraw clock. */
export function recLevel(d: Dashboard, id: string): number {
  const h = liveOf(d, id).rec;
  return h ? h.level() : 0;
}

/** The microphone request card of this placement is open. */
export function recAskOf(d: Dashboard, id: string): boolean {
  return permAskOf(d, id)?.perm === 'mic';
}

/**
 * After the placement leaves the order (reading a file, undo) or the runtime stops: stop recording (the take is kept in the
 * run state) and playing. Registered while the microphone or a sound is in use; runs at most once.
 */
function guard(d: Dashboard, id: string, l: Live): void {
  if (l.off) return;
  l.off = runtimeOf(d).onDispose(id, () => {
    l.off = null;
    recStop(d, id);
    stopPlayback(d, id);
    const cur = recOf(d, id);
    if (cur.play !== null) setRec(d, id, { ...cur, play: null });
  });
}

/**
 * Opens the microphone and starts recording (the browser asks here, from 「マイクを使う」「もう一度」, or at once when allowed).
 * Resolves false when refused or failed. Already recording or opening: nothing new (resolves true / the same answer).
 */
function recOpen(d: Dashboard, id: string): Promise<boolean> {
  const l = liveOf(d, id);
  if (l.rec || recOf(d, id).on) return Promise.resolve(true);
  if (l.opening) return l.opening;
  l.opening = recDevice().open().then((h) => {
    l.opening = null;
    l.rec = h;
    stopPlayback(d, id);
    setRec(d, id, { ...recOf(d, id), on: true, start: d.now(), play: null });
    guard(d, id, l);
    return true;
  }, () => {
    l.opening = null;
    return false;
  });
  return l.opening;
}

/** The request of this placement (stories pass the same, so 「マイクを使う」 works there too). */
const micAsk = (d: Dashboard, id: string): AskOpts => ({ copy: MIC_ASK, request: () => recOpen(d, id) });

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
 * 「録音を始める」「録音を止める」 (prototype `recToggle`). Without the microphone allowed, the shared request is shown first (in
 * place of the content); the browser is asked only from its 「マイクを使う」 (or 「もう一度」 after a refusal).
 */
export function recToggle(d: Dashboard, id: string): void {
  if (recOf(d, id).on) { recStop(d, id); return; }
  askPerm(d, id, 'mic', micAsk(d, id));
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
  guard(d, id, l);
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

/** Stories and tests: show the request (`ask`) or the refusal (`no`) as is. */
export function setRecAsk(d: Dashboard, id: string, st: 'ask' | 'no' | null): void {
  setPermAsk(d, id, 'mic', st, micAsk(d, id));
}

/** Stories and tests: put a run state as is (no microphone). */
export function setRecRun(d: Dashboard, id: string, r: RecRun): void {
  setRec(d, id, r);
}
