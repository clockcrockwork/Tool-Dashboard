import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { Dashboard } from '../../app/store/store';
import { memoryStore } from '../../app/store/persist';
import { WIDGET_DATA } from '../index';
import { REC_IDLE, TAKES_MAX, addTake, levelOf, levelScale, recView, restoreTake, takeRows, type Take } from './recorder';
import { resetRecDevice, setRecDevice, type MicState, type RecDevice } from './device';
import { deleteTake, micOf, playTake, recAskOf, recCover, recLevel, recOf, recToggle } from './status';

const T0 = new Date(2026, 10, 19, 10, 24, 36).getTime();
const make = (store = memoryStore()): Dashboard => new Dashboard({ store, dataDefs: WIDGET_DATA });

type Fake = RecDevice & { allow: boolean; opened: number; stopped: number; urls: string[]; revoked: string[]; playing: string[]; ended: (() => void) | null; mic: (s: MicState) => void };
function fakeDevice(): Fake {
  let n = 0;
  let micFn: ((s: MicState) => void) | null = null;
  const f: Fake = {
    allow: true, opened: 0, stopped: 0, urls: [], revoked: [], playing: [], ended: null,
    mic: (s) => { micFn?.(s); },
    open: () => {
      f.opened++;
      if (!f.allow) return Promise.reject(new Error('NotAllowedError'));
      return Promise.resolve({ stop: () => { f.stopped++; return Promise.resolve(new Blob(['x'])); }, level: () => 0.42 });
    },
    play: (url, ended) => { f.playing.push(url); f.ended = ended; return Promise.resolve({ stop: () => { f.playing.push('stop:' + url); } }); },
    url: () => { const u = 'blob:' + String(++n); f.urls.push(u); return u; },
    revoke: (u) => { f.revoked.push(u); },
    watchMic: (fn) => { micFn = fn; return () => { micFn = null; }; },
  };
  setRecDevice(f);
  return f;
}
const flush = async (): Promise<void> => { for (let i = 0; i < 4; i++) await Promise.resolve(); };

beforeEach(() => { vi.useFakeTimers({ now: T0 }); });
afterEach(() => { vi.useRealTimers(); resetRecDevice(); });

describe('録音の計算', () => {
  it('view: label, icon, elapsed from the start time', () => {
    expect(recView(REC_IDLE, T0)).toEqual({ label: '録音を始める', d: 'M12 6a6 6 0 1 0 0 12a6 6 0 0 0 0-12z', time: '00:00.0' });
    expect(recView({ ...REC_IDLE, on: true, start: T0 - 83_450 }, T0)).toMatchObject({ label: '録音を止める', time: '01:23.4' });
    expect([levelScale(false, 0.9), levelScale(true, 0.4567), levelScale(true, 3)]).toEqual(['0.00', '0.46', '1.00']);
    expect(levelOf([128, 128])).toBe(0);
    expect(levelOf([255, 0])).toBe(1);
    expect(levelOf([])).toBe(0);
  });
  it('takes: newest first, at most 6 (the dropped ones are returned to release)', () => {
    let takes: Take[] = [];
    const out: Take[] = [];
    for (let i = 0; i < 8; i++) { const r = addTake(takes, { id: i, t: T0 + i * 60_000, dur: 61_400, url: 'u' + String(i) }); takes = r.takes; out.push(...r.dropped); }
    expect(takes.map(x => x.id)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(out.map(x => x.url)).toEqual(['u0', 'u1']);
    const rows = takeRows({ ...REC_IDLE, takes, play: 7 });
    expect(rows[0]).toEqual({ id: 7, t: '10:31', dur: '01:01', pl: '再生を止める', d: 'M8 5v14M16 5v14' });
    expect(rows[1]?.pl).toBe('10:30 の録音を再生');
    expect(restoreTake(takes, { id: 1, t: 0, dur: 0, url: '' })).toBeNull();
    expect(restoreTake(takes.slice(1), takes[0]!)?.map(x => x.id)).toEqual([2, 3, 4, 5, 6, 7]);
  });
});

describe('録音の実行（継続実行・保存しない）', () => {
  it('asks in the widget before the browser; 「マイクを使う」 starts; refused shows how to fix it', async () => {
    const f = fakeDevice();
    const d = make();
    recToggle(d, 'recorder');
    expect(f.opened).toBe(0);
    expect(recCover(d, 'recorder')).toMatchObject({ title: 'マイクを使いますか？', ok: { label: 'マイクを使う' }, alt: { label: 'やめる' } });
    f.allow = false;
    recCover(d, 'recorder')?.ok?.fn();
    await flush();
    expect(f.opened).toBe(1);
    expect(micOf(d)).toBe('no');
    expect(recCover(d, 'recorder')).toMatchObject({ warn: true, title: 'マイクを使えません', ok: { label: 'もう一度' }, alt: { label: '閉じる' } });
    expect(recOf(d, 'recorder').on).toBe(false);
    recCover(d, 'recorder')?.alt?.fn();
    expect(recAskOf(d, 'recorder')).toBe(false);
    f.allow = true;
    recToggle(d, 'recorder');
    recCover(d, 'recorder')?.ok?.fn();
    await flush();
    expect(micOf(d)).toBe('ok');
    expect(recOf(d, 'recorder')).toMatchObject({ on: true, start: T0 });
    expect(recCover(d, 'recorder')).toBeNull();
  });
  it('with the microphone allowed, starts at once; stop adds a take; keeps the newest 6 and releases the rest', async () => {
    const f = fakeDevice();
    const d = make();
    micOf(d); f.mic('ok');
    for (let i = 0; i < TAKES_MAX + 1; i++) {
      recToggle(d, 'recorder');
      recToggle(d, 'recorder'); // a second press while the microphone opens does not open it twice
      await flush();
      expect(recLevel(d, 'recorder')).toBe(0.42);
      vi.advanceTimersByTime(5_000);
      recToggle(d, 'recorder');
      recToggle(d, 'recorder');
      await flush();
    }
    expect(f.opened).toBe(TAKES_MAX + 1);
    expect(f.stopped).toBe(TAKES_MAX + 1);
    const run = recOf(d, 'recorder');
    expect(run.on).toBe(false);
    expect(run.takes).toHaveLength(TAKES_MAX);
    expect(run.takes[0]).toMatchObject({ dur: 5_000, url: 'blob:2' });
    expect(f.revoked).toEqual(['blob:1']);
    expect(recLevel(d, 'recorder')).toBe(0);
  });
  it('keeps recording without any view (state in the runtime); nothing is saved; a reload starts empty', async () => {
    const f = fakeDevice();
    const store = memoryStore();
    const d = make(store);
    const stop = d.start();
    await nextTick();
    micOf(d); f.mic('ok');
    recToggle(d, 'recorder');
    await flush();
    // Board changes (unplace, move to another screen, front display) do not touch the run.
    d.g.off = { ...d.g.off, recorder: true };
    d.ui.big = 'recorder';
    d.go(2);
    expect(recOf(d, 'recorder').on).toBe(true);
    vi.advanceTimersByTime(2_000);
    recToggle(d, 'recorder');
    await flush();
    expect(recOf(d, 'recorder').takes).toHaveLength(1);
    d.g.off = { ...d.g.off, recorder: false };
    await nextTick();
    const all = store.keys().map(k => store.get(k) ?? '').join();
    expect(all).toContain('"order"');
    expect(all).not.toContain('blob:');
    expect(all).not.toContain('takes');
    expect(WIDGET_DATA.recorder).toBeUndefined();
    expect(recOf(make(store), 'recorder')).toEqual(REC_IDLE);
    stop();
  });
  it('play / stop playing; deleting a take offers 元に戻す (only that take); later recordings stay', async () => {
    const f = fakeDevice();
    const d = make();
    micOf(d); f.mic('ok');
    for (let i = 0; i < 2; i++) { recToggle(d, 'recorder'); await flush(); vi.advanceTimersByTime(1_000); recToggle(d, 'recorder'); await flush(); }
    const [a, b] = recOf(d, 'recorder').takes;
    playTake(d, 'recorder', a!.id);
    await flush();
    expect(recOf(d, 'recorder').play).toBe(a!.id);
    f.ended?.();
    expect(recOf(d, 'recorder').play).toBeNull();
    playTake(d, 'recorder', a!.id);
    await flush();
    deleteTake(d, 'recorder', a!.id);
    expect(f.playing.at(-1)).toBe('stop:' + a!.url);
    expect(recOf(d, 'recorder')).toMatchObject({ play: null, takes: [b] });
    const undo = d.ui.toasts.find(t => t.text === '録音を削除しました')?.act;
    recToggle(d, 'recorder'); await flush(); vi.advanceTimersByTime(1_000); recToggle(d, 'recorder'); await flush();
    undo?.fn();
    expect(recOf(d, 'recorder').takes.map(x => x.id)).toEqual([a!.id, b!.id, recOf(d, 'recorder').takes[2]!.id]);
    expect(f.revoked).toEqual([]);
  });
});
