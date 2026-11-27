/**
 * 録音のブラウザの側（マイク・MediaRecorder・入力レベル・再生）. テストでは `setRecDevice` で差し替える.
 * マイクの許可の状態は共通の許可のお願い（`src/app/runtime/permission.ts`）が読む。
 * 録音した音声は object URL としてメモリにだけ置き、保存しない（実装ガイド 6章）。
 */
import { levelOf } from './recorder';

/** One recording in progress. */
export type RecHandle = Readonly<{
  /** Stops recording and releases the microphone; resolves with the audio (null when nothing was recorded). */
  stop: () => Promise<Blob | null>;
  /** Current input level 0–1 (0 when it cannot be read). */
  level: () => number;
}>;

/** A take being played. */
export type Playback = Readonly<{ stop: () => void }>;

export type RecDevice = Readonly<{
  /** Asks the browser for the microphone (only from 「マイクを使う」/「もう一度」) and starts recording. Rejects when refused. */
  open: () => Promise<RecHandle>;
  /** Plays `url`; `ended` is called when it finishes by itself. Rejects when it cannot play. */
  play: (url: string, ended: () => void) => Promise<Playback>;
  url: (b: Blob) => string;
  revoke: (url: string) => void;
}>;

type AudioCtx = { createAnalyser: () => AnalyserNode; createMediaStreamSource: (s: MediaStream) => MediaStreamAudioSourceNode; close: () => Promise<void> };

function audioContext(): AudioCtx | null {
  try {
    const w = window as Window & { webkitAudioContext?: new () => AudioCtx };
    const AC = (window.AudioContext as (new () => AudioCtx) | undefined) ?? w.webkitAudioContext;
    return AC ? new AC() : null;
  } catch {
    return null;
  }
}

export const BROWSER_REC: RecDevice = {
  open: async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('no recorder');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    let an: AnalyserNode | null = null;
    let buf: Uint8Array<ArrayBuffer> | null = null;
    const ac = audioContext();
    try {
      if (ac) {
        an = ac.createAnalyser();
        an.fftSize = 512;
        ac.createMediaStreamSource(stream).connect(an);
        buf = new Uint8Array(an.fftSize);
      }
    } catch { an = null; }
    mr.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    const release = (): void => {
      stream.getTracks().forEach((t) => { t.stop(); });
      try { void ac?.close(); } catch { /* closed */ }
    };
    mr.start();
    return {
      stop: () => new Promise<Blob | null>((resolve) => {
        mr.onstop = () => { release(); resolve(chunks.length ? new Blob(chunks, { type: mr.mimeType || 'audio/webm' }) : null); };
        try { mr.stop(); } catch { release(); resolve(null); }
      }),
      level: () => {
        if (!an || !buf) return 0;
        an.getByteTimeDomainData(buf);
        return levelOf(buf);
      },
    };
  },
  play: async (url, ended) => {
    const au = new Audio(url);
    au.onended = ended;
    await au.play();
    return { stop: () => { try { au.pause(); } catch { /* gone */ } } };
  },
  url: b => URL.createObjectURL(b),
  revoke: (u) => { try { URL.revokeObjectURL(u); } catch { /* not ours */ } },
};

let device: RecDevice = BROWSER_REC;

export function recDevice(): RecDevice {
  return device;
}
/** Tests and stories: replace the browser side (before the Dashboard's first use). */
export function setRecDevice(dev: RecDevice): void {
  device = dev;
}
export function resetRecDevice(): void {
  device = BROWSER_REC;
}
