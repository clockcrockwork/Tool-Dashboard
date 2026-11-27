/**
 * 録音の計算 (prototype `recOn`, `recLabel`, `recD`, `recTime`, `recLevel`, `takes`, `noTakes` in `renderVals()`, `recToggle`,
 * `playTake`). 録音は保存しない（実装ガイド 6章・付録: 再読み込みで消える、最大6件）。
 */
import { fm, mmss } from '../shared/time';
import { swText } from '../stopwatch/stopwatch';

/** One recording: id = the time it started; `url` is an object URL of the audio (memory only). */
export type Take = Readonly<{ id: number; t: number; dur: number; url: string }>;
/** 録音の実行状態（runtime、保存しない）: recording since `start`, the takes, the take being played. */
export type RecRun = Readonly<{ on: boolean; start: number; takes: readonly Take[]; play: number | null }>;

export const REC_IDLE: RecRun = { on: false, start: 0, takes: [], play: null };
/** 保持する件数（仕様書 3章: 録音 6）. */
export const TAKES_MAX = 6;

export type RecView = { label: string; d: string; time: string };

export function recView(run: RecRun, now: number): RecView {
  return {
    label: run.on ? '録音を止める' : '録音を始める',
    d: run.on ? 'M7 7h10v10H7z' : 'M12 6a6 6 0 1 0 0 12a6 6 0 0 0 0-12z',
    time: swText(run.on ? Math.max(0, now - run.start) : 0),
  };
}

/** The level bar's scale (`0.00`–`1.00`; 0 while not recording). */
export function levelScale(on: boolean, level: number): string {
  return (on ? Math.max(0, Math.min(1, level)) : 0).toFixed(2);
}

/** Input level from time-domain samples (0–255, 128 = silence): RMS × 4, at most 1 (prototype `recToggle`). */
export function levelOf(buf: ArrayLike<number>): number {
  if (!buf.length) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) { const x = ((buf[i] ?? 128) - 128) / 128; sum += x * x; }
  return Math.min(1, Math.sqrt(sum / buf.length) * 4);
}

export type TakeRow = { id: number; t: string; dur: string; pl: string; d: string };

/** Newest first. */
export function takeRows(run: RecRun): TakeRow[] {
  return [...run.takes].reverse().map(tk => ({
    id: tk.id,
    t: fm(tk.t),
    dur: mmss(Math.round(tk.dur / 1000)),
    pl: run.play === tk.id ? '再生を止める' : fm(tk.t) + ' の録音を再生',
    d: run.play === tk.id ? 'M8 5v14M16 5v14' : 'M8 5.5v13l11-6.5z',
  }));
}

/** Adds a take, keeping the newest 6; returns the takes that fell out (their URLs are released by the caller). */
export function addTake(takes: readonly Take[], tk: Take): { takes: Take[]; dropped: Take[] } {
  const all = [...takes, tk];
  const cut = Math.max(0, all.length - TAKES_MAX);
  return { takes: all.slice(cut), dropped: all.slice(0, cut) };
}

/** 「元に戻す」 of a deletion: puts the take back in time order (not when it is there already or the list is full). */
export function restoreTake(takes: readonly Take[], tk: Take): Take[] | null {
  if (takes.some(x => x.id === tk.id) || takes.length >= TAKES_MAX) return null;
  return [...takes, tk].sort((a, b) => a.t - b.t);
}

/** 許可のお願いの文（仕様書 4章「許可のお願い」: マイク）. */
export const MIC_ASK = { title: 'マイクを使いますか？', text: '録音はこの端末の中だけに保存します。', ok: 'マイクを使う', alt: 'やめる' } as const;
export const MIC_NO = { title: 'マイクを使えません', text: 'アドレスバー左のボタンで許可できます', ok: 'もう一度', alt: '閉じる' } as const;
/** Line icon of the request (prototype `IX().mic`). */
export const MIC_ICON = 'M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM6 11.5a6 6 0 0 0 12 0M12 17.5V20';
