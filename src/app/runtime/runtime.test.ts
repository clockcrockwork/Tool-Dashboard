/**
 * Dashboard の実行管理（runtime.ts）と、アラーム・ポモドーロ・ストップウォッチの移行（p2a-followup.md 1章、PR #23 の完了条件）.
 * View を描かずに、アプリと同じ Dashboard（保存の watcher ＋ WIDGET_RUNNERS）を fake timers で動かす代表 fixture:
 * 未配置、一時利用を閉じる・もう一度開く、置き場所の変更、画面の移動、人前では隠す、止める・リセット、期限の到来、再読み込み、
 * timer を作る・放す、古い callback、二重の完了の防止、見えないときの描画の停止、設定と記録が保たれること.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, watch } from 'vue';
import { memoryStore } from '../store/persist';
import { useWithoutPlacing } from '../store/sheets';
import { VEILED_TOAST, notifyAskOf, resetNotifyApi } from './notify';
import { permCover } from './permission';
import { runtimeOf } from './runtime';
import { fakeNotify, runDash, toastTexts, type RunDash } from './test-fixtures';
import type { AlarmData } from '../../widgets/alarm/data';
import { switchAlarm } from '../../widgets/alarm/actions';
import { POMO_IDLE } from '../../widgets/pomo/pomo';
import { pomoReset, pomoRunOf, pomoToggle } from '../../widgets/pomo/status';
import { SW_IDLE, elapsed, toggleSw } from '../../widgets/stopwatch/stopwatch';
import { setSw, swOf } from '../../widgets/stopwatch/status';
import { useFaceClock, useShownNow } from '../../widgets/shared/time';

const at = (h: number, m: number, s = 0, day = 19): number => new Date(2026, 10, day, h, m, s).getTime();
const MIN = 60_000;

let r: RunDash | null = null;
function boot(now: number, store = memoryStore()): RunDash {
  vi.setSystemTime(now);
  r = runDash(store);
  return r;
}
const count = (d: RunDash['d'], text: string): number => toastTexts(d).filter(t => t === text).length;
/** Every toast shown from now on (they fade after 3 s, so they are collected as they come). */
function toastLog(d: RunDash['d']): string[] {
  const seen = new Set<number>();
  const log: string[] = [];
  const scope = effectScope(true);
  scope.run(() => {
    watch(() => d.ui.toasts, (ts) => {
      for (const x of ts) if (!seen.has(x.id)) { seen.add(x.id); log.push(x.text); }
    }, { flush: 'sync' });
  });
  for (const x of d.ui.toasts) seen.add(x.id);
  return log;
}

beforeEach(() => { vi.useFakeTimers({ now: at(10, 24, 36) }); });
afterEach(() => { r?.stop(); r = null; vi.useRealTimers(); resetNotifyApi(); });

describe('実行管理の基本', () => {
  it('starts a handler only for kinds that have one (alarm, pomo), unplaced included; no view is needed', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    expect(d.g.off.alarm).toBe(true);
    expect(d.g.off.pomo).toBe(true);
    expect(runtimeOf(d).started().sort()).toEqual(['alarm', 'pomo']);
  });
  it('a placement dropped from the order (reading a file, undo) stops its handler and its deadline', () => {
    fakeNotify('granted');
    const { d } = boot(at(6, 59, 50));
    const rt = runtimeOf(d);
    expect(rt.sched.has('alarm|')).toBe(true);
    d.g.order = d.g.order.filter(id => id !== 'alarm');
    expect(rt.started()).toEqual(['pomo']);
    expect(rt.sched.has('alarm|')).toBe(false);
    vi.advanceTimersByTime(20_000);
    expect(count(d, 'アラーム 07:00')).toBe(0);
  });
  it('stopping the runtime releases the timer and the listeners', () => {
    fakeNotify('granted');
    const { d, stop } = boot(at(6, 59, 50));
    const rt = runtimeOf(d);
    expect(rt.sched.armed).toBe(true);
    stop();
    r = null;
    expect(rt.sched.armed).toBe(false);
    expect(rt.sched.size).toBe(0);
    expect(rt.running).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('run state is not saved: no section changes, nothing in cfg/data, gone after a reload', async () => {
    fakeNotify('granted');
    const store = memoryStore();
    const { d } = boot(at(10, 24, 36), store);
    await nextTick();
    const before = Object.fromEntries(store.keys().map(k => [k, store.get(k)]));
    pomoToggle(d, 'pomo');
    setSw(d, 'stopwatch', toggleSw(SW_IDLE, d.now()));
    await nextTick();
    expect(Object.fromEntries(store.keys().map(k => [k, store.get(k)]))).toEqual(before);
    expect(JSON.stringify([d.g, d.cfg, d.data])).not.toMatch(/endAt|rid|"run"/);
    r?.stop();
    const again = boot(at(10, 25, 0), store);
    expect(pomoRunOf(again.d, 'pomo')).toBe(POMO_IDLE);
    expect(swOf(again.d, 'stopwatch')).toBe(SW_IDLE);
    expect(runtimeOf(again.d).sched.has('pomo|')).toBe(false);
  });
});

describe('後始末（onDispose: Runner を持たない継続実行）', () => {
  it('called once when the placement leaves the order; not for unplacing, moving, the front view or another screen', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    const rt = runtimeOf(d);
    const fn = vi.fn();
    const other = vi.fn();
    rt.onDispose('recorder', fn);
    rt.onDispose('stopwatch', other);
    d.g.off = { ...d.g.off, recorder: true };
    d.ui.big = 'recorder';
    d.go(2);
    useWithoutPlacing(d, 'recorder');
    expect(fn).not.toHaveBeenCalled();
    d.g.order = d.g.order.filter(id => id !== 'recorder');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    d.g.order = [...d.g.order, 'recorder'];
    d.g.order = d.g.order.filter(id => id !== 'recorder');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(rt.disposable()).toEqual(['stopwatch']);
  });
  it('an unregistered cleanup is not called; stopping the runtime calls the rest once; a failing one does not stop the others', () => {
    fakeNotify('granted');
    const { d, stop } = boot(at(10, 24, 36));
    const rt = runtimeOf(d);
    const gone = vi.fn();
    const off = rt.onDispose('recorder', gone);
    off();
    off();
    const bad = vi.fn(() => { throw new Error('x'); });
    const ok = vi.fn();
    rt.onDispose('pomo', bad);
    rt.onDispose('pomo', ok);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    stop();
    r = null;
    err.mockRestore();
    expect(gone).not.toHaveBeenCalled();
    expect(bad).toHaveBeenCalledTimes(1);
    expect(ok).toHaveBeenCalledTimes(1);
    expect(rt.disposable()).toEqual([]);
    rt.dispose('pomo');
    expect(ok).toHaveBeenCalledTimes(1);
  });
  it('active(): the 継続実行 placements whose run state says running (pomo, stopwatch), in board order', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    expect(runtimeOf(d).active()).toEqual([]);
    pomoToggle(d, 'pomo');
    setSw(d, 'stopwatch', toggleSw(SW_IDLE, d.now()));
    expect(runtimeOf(d).active().sort()).toEqual(['pomo', 'stopwatch']);
    pomoToggle(d, 'pomo');
    expect(runtimeOf(d).active()).toEqual(['stopwatch']);
  });
});

describe('アラーム（時刻の監視）', () => {
  it('未配置・部品なしでも、オンの時刻の分に入ると鳴る（timer は次の期限に1本）', () => {
    fakeNotify('granted');
    const { d } = boot(at(6, 59, 50));
    const rt = runtimeOf(d);
    expect(d.dataOf<AlarmData>('alarm').on).toEqual([true, false]);
    expect(rt.sched.when('alarm|')).toBe(at(7, 0));
    vi.advanceTimersByTime(9_999);
    expect(count(d, 'アラーム 07:00')).toBe(0);
    vi.advanceTimersByTime(1);
    expect(count(d, 'アラーム 07:00')).toBe(1);
    // Planned again for tomorrow (22:30 is off).
    expect(rt.sched.when('alarm|')).toBe(at(7, 0, 0, 20));
  });
  it('オフで止める: すべてオフなら期限も timer も無い。オンに戻すと立て直す', () => {
    fakeNotify('granted');
    const { d } = boot(at(6, 59, 50));
    const rt = runtimeOf(d);
    switchAlarm(d, 'alarm', 0);
    expect(d.dataOf<AlarmData>('alarm').on).toEqual([false, false]);
    expect(rt.sched.has('alarm|')).toBe(false);
    expect(rt.sched.armed).toBe(false);
    vi.advanceTimersByTime(20_000);
    expect(count(d, 'アラーム 07:00')).toBe(0);
    switchAlarm(d, 'alarm', 1);
    expect(rt.sched.when('alarm|')).toBe(at(22, 30));
  });
  it('設定を変えたら予定を立て直す（古い時刻では鳴らない）', () => {
    fakeNotify('granted');
    const { d } = boot(at(6, 59, 50));
    expect(d.setCfg('alarm', 'a1', '07:05')).toBe(true);
    expect(runtimeOf(d).sched.when('alarm|')).toBe(at(7, 5));
    const log = toastLog(d);
    vi.advanceTimersByTime(MIN);
    expect(log.some(t => t.startsWith('アラーム'))).toBe(false);
    vi.advanceTimersByTime(4 * MIN + 10_000);
    expect(log.filter(t => t === 'アラーム 07:05')).toHaveLength(1);
  });
  it('タブが裏で timer が遅れた: 戻ったときに時刻から判定し直す。1分より前に過ぎた期限は鳴らさない', () => {
    fakeNotify('granted');
    const { d, page } = boot(at(6, 59, 50));
    page.setHidden(true);
    // The timer is held back: the clock moves on without it.
    vi.setSystemTime(at(7, 2, 0));
    page.setHidden(false);
    expect(toastTexts(d).some(t => t.startsWith('アラーム'))).toBe(false);
    expect(runtimeOf(d).sched.when('alarm|')).toBe(at(7, 0, 0, 20));
  });
  it('少しだけ遅れた（同じ分のうち）なら、戻ったときに一度だけ鳴る', () => {
    fakeNotify('granted');
    const { d, page } = boot(at(6, 59, 50));
    page.setHidden(true);
    vi.setSystemTime(at(7, 0, 30));
    page.setHidden(false);
    expect(count(d, 'アラーム 07:00')).toBe(1);
    page.setHidden(true);
    page.setHidden(false);
    runtimeOf(d).sched.run();
    vi.advanceTimersByTime(1_000);
    expect(count(d, 'アラーム 07:00')).toBe(1);
  });
  it('二度鳴らさない: 鳴った分に設定を変えても、その分はもう鳴らさない', () => {
    fakeNotify('granted');
    const { d } = boot(at(6, 59, 50));
    const log = toastLog(d);
    vi.advanceTimersByTime(10_000);
    expect(log.filter(t => t === 'アラーム 07:00')).toHaveLength(1);
    // Re-planned inside the same minute: the minute that rang is not rung again.
    d.setCfg('alarm', 'a2', '07:00');
    switchAlarm(d, 'alarm', 1);
    vi.advanceTimersByTime(30_000);
    runtimeOf(d).sched.run();
    expect(log.filter(t => t === 'アラーム 07:00')).toHaveLength(1);
  });
  it('二度鳴らさない: 端末の時刻が戻って同じ分がもう一度来ても、最後に鳴らした分は鳴らさない', () => {
    fakeNotify('granted');
    const { d } = boot(at(6, 59, 50));
    const log = toastLog(d);
    vi.advanceTimersByTime(10_000);
    expect(log).toEqual(['アラーム 07:00']);
    vi.setSystemTime(at(6, 59, 55));
    d.setCfg('alarm', 'a2', '23:00');
    expect(runtimeOf(d).sched.when('alarm|')).toBe(at(7, 0));
    vi.advanceTimersByTime(10_000);
    expect(log).toEqual(['アラーム 07:00']);
  });
  it('止めて動かし直しても（Dashboard の起動し直し）、鳴った分は鳴らさない', () => {
    fakeNotify('granted');
    const store = memoryStore();
    const { d } = boot(at(6, 59, 50), store);
    const log = toastLog(d);
    vi.advanceTimersByTime(10_000);
    expect(log).toEqual(['アラーム 07:00']);
    r?.stop();
    const again = boot(at(7, 0, 20), store);
    const log2 = toastLog(again.d);
    vi.advanceTimersByTime(MIN);
    expect(log2).toEqual([]);
  });
  it('置き場所の変更・画面の移動・一時利用で開いて閉じる: 予定は変わらず、鳴る', () => {
    fakeNotify('granted');
    const { d } = boot(at(6, 59, 0));
    const rt = runtimeOf(d);
    const due = rt.sched.when('alarm|');
    d.place('alarm', d.g.groups[0]?.id ?? 'g0');
    d.go(1);
    useWithoutPlacing(d, 'alarm');
    d.back();
    d.unplace('alarm');
    expect(rt.sched.when('alarm|')).toBe(due);
    const log = toastLog(d);
    vi.advanceTimersByTime(MIN);
    expect(log.filter(t => t === 'アラーム 07:00')).toHaveLength(1);
  });
  it('人前では隠す: 隠している間も鳴り、伏せた文だけを出す（時刻・名前を出さない）', () => {
    const f = fakeNotify('granted');
    f.tabHidden = true;
    const { d } = boot(at(6, 59, 50));
    d.setG('veil', true);
    d.setCfg('alarm', 'veil', true);
    vi.advanceTimersByTime(10_000);
    expect(toastTexts(d)).toContain(VEILED_TOAST);
    expect(JSON.stringify([d.ui.toasts, f.shown])).not.toMatch(/アラーム|07:00/);
    expect(f.shown).toHaveLength(1);
  });
  it('スイッチをオンにしたら（明示の操作）許可のお願い。アラームはオンのまま、断っても鳴る', () => {
    fakeNotify('default');
    const { d } = boot(at(22, 29, 0));
    switchAlarm(d, 'alarm', 1);
    expect(d.dataOf<AlarmData>('alarm').on).toEqual([true, true]);
    expect(notifyAskOf(d, 'alarm')).toBe('ask');
    expect(permCover(d, 'alarm')?.title).toBe('鳴ったら通知しますか？');
    permCover(d, 'alarm')?.alt?.fn();
    const log = toastLog(d);
    vi.advanceTimersByTime(MIN);
    expect(log.filter(t => t === 'アラーム 22:30')).toHaveLength(1);
  });
  it('再読み込み: アラームの設定とスイッチは残り、見張りも続く', async () => {
    fakeNotify('granted');
    const store = memoryStore();
    const { d } = boot(at(6, 50, 0), store);
    d.setCfg('alarm', 'a2', '06:55');
    switchAlarm(d, 'alarm', 1);
    await nextTick();
    r?.stop();
    const again = boot(at(6, 52, 0), store);
    expect(again.d.cfgOf('alarm', 'a2')).toBe('06:55');
    expect(again.d.dataOf<AlarmData>('alarm').on).toEqual([true, true]);
    expect(runtimeOf(again.d).sched.when('alarm|')).toBe(at(6, 55));
  });
});

describe('ポモドーロ（継続実行）', () => {
  it('一時利用で始めて閉じても、期限で同じ実行が一度だけ完了する', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    d.setCfg('pomo', 'min', 5);
    useWithoutPlacing(d, 'pomo');
    pomoToggle(d, 'pomo');
    const run = pomoRunOf(d, 'pomo');
    expect(run.on).toBe(true);
    d.back();
    expect(d.ui.temp).toBeNull();
    const log = toastLog(d);
    vi.advanceTimersByTime(5 * MIN - 1);
    expect(log).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(log).toEqual(['ポモドーロ完了']);
    expect(pomoRunOf(d, 'pomo')).toBe(POMO_IDLE);
    runtimeOf(d).sched.run();
    vi.advanceTimersByTime(30 * MIN);
    expect(log).toEqual(['ポモドーロ完了']);
    expect(runtimeOf(d).sched.has('pomo|')).toBe(false);
  });
  it('もう一度開いても二重に始まらない（同じ実行の続きが見える）', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    useWithoutPlacing(d, 'pomo');
    pomoToggle(d, 'pomo');
    const rt = runtimeOf(d);
    const rid = rt.rid('pomo');
    const end = pomoRunOf(d, 'pomo').endAt;
    d.back();
    vi.advanceTimersByTime(MIN);
    useWithoutPlacing(d, 'pomo');
    expect(rt.rid('pomo')).toBe(rid);
    expect(pomoRunOf(d, 'pomo').endAt).toBe(end);
    expect(rt.sched.when('pomo|')).toBe(end);
  });
  it('置き場所の変更・画面の移動では止まらない。未配置のまま完了する', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    d.setCfg('pomo', 'min', 5);
    expect(d.g.off.pomo).toBe(true);
    pomoToggle(d, 'pomo');
    d.place('pomo', d.g.groups[0]?.id ?? 'g0');
    d.go(2);
    d.unplace('pomo');
    const log = toastLog(d);
    vi.advanceTimersByTime(5 * MIN);
    expect(log).toEqual(['ポモドーロ完了']);
  });
  it('一時停止・リセット: 古い期限の callback は何もしない。続きから始めると新しい期限で一度だけ', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    d.setCfg('pomo', 'min', 5);
    const rt = runtimeOf(d);
    pomoToggle(d, 'pomo');
    const first = rt.rid('pomo');
    vi.advanceTimersByTime(2 * MIN);
    pomoToggle(d, 'pomo');
    expect(pomoRunOf(d, 'pomo')).toEqual({ on: false, endAt: null, left: 180 });
    expect(rt.rid('pomo')).not.toBe(first);
    expect(rt.sched.has('pomo|')).toBe(false);
    const log = toastLog(d);
    vi.advanceTimersByTime(10 * MIN);
    expect(log).toEqual([]);
    pomoToggle(d, 'pomo');
    expect(rt.sched.when('pomo|')).toBe(d.now() + 3 * MIN);
    vi.advanceTimersByTime(3 * MIN);
    expect(log).toEqual(['ポモドーロ完了']);
    pomoToggle(d, 'pomo');
    pomoReset(d, 'pomo');
    expect(rt.sched.has('pomo|')).toBe(false);
    vi.advanceTimersByTime(30 * MIN);
    expect(log).toEqual(['ポモドーロ完了']);
  });
  it('タブが裏で遅れても、戻ったときに完了する（一度だけ）', () => {
    fakeNotify('granted');
    const { d, page } = boot(at(10, 24, 36));
    d.setCfg('pomo', 'min', 5);
    pomoToggle(d, 'pomo');
    page.setHidden(true);
    vi.setSystemTime(at(10, 40, 0));
    const log = toastLog(d);
    page.setHidden(false);
    page.setHidden(true);
    page.setHidden(false);
    expect(log).toEqual(['ポモドーロ完了']);
    expect(pomoRunOf(d, 'pomo')).toBe(POMO_IDLE);
  });
  it('人前では隠す: 完了の判定は続け、伏せた文で知らせる。「完了を通知」がオフなら知らせずに止まる', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    d.setCfg('pomo', 'min', 5);
    d.setG('veil', true);
    d.setCfg('pomo', 'veil', true);
    pomoToggle(d, 'pomo');
    const log = toastLog(d);
    vi.advanceTimersByTime(5 * MIN);
    expect(log).toEqual([VEILED_TOAST]);
    expect(pomoRunOf(d, 'pomo')).toBe(POMO_IDLE);
    d.setCfg('pomo', 'notify', false);
    pomoToggle(d, 'pomo');
    vi.advanceTimersByTime(5 * MIN);
    expect(log).toEqual([VEILED_TOAST]);
    expect(pomoRunOf(d, 'pomo')).toBe(POMO_IDLE);
  });
  it('許可の許否がまだなら、スタートで許可のお願い（始まるのは答えのあと）。「通知しない」で設定を切って始める', () => {
    fakeNotify('default');
    const { d } = boot(at(10, 24, 36));
    pomoToggle(d, 'pomo');
    expect(pomoRunOf(d, 'pomo').on).toBe(false);
    expect(permCover(d, 'pomo')?.title).toBe('終わったら通知しますか？');
    permCover(d, 'pomo')?.alt?.fn();
    expect(pomoRunOf(d, 'pomo').on).toBe(true);
    expect(d.cfgOf('pomo', 'notify')).toBe(false);
    // A second answer (e.g. 「このまま始める」 after a refusal) does not start it twice.
    const rid = runtimeOf(d).rid('pomo');
    pomoToggle(d, 'pomo');
    pomoToggle(d, 'pomo');
    expect(runtimeOf(d).rid('pomo')).toBeGreaterThan(rid);
    expect(pomoRunOf(d, 'pomo').on).toBe(true);
  });
});

describe('ストップウォッチ（継続実行、期限なし）と見えないときの描画', () => {
  it('見えなくても・未配置でも基準の時刻を持ち続ける（時を刻まず、始めた時刻から計算する）', () => {
    fakeNotify('granted');
    const { d } = boot(at(10, 24, 36));
    useWithoutPlacing(d, 'stopwatch');
    setSw(d, 'stopwatch', toggleSw(SW_IDLE, d.now()));
    d.back();
    d.go(1);
    vi.advanceTimersByTime(83_400);
    expect(elapsed(swOf(d, 'stopwatch'), d.now())).toBe(83_400);
    expect(runtimeOf(d).sched.size).toBe(1); // only the alarm; the stopwatch has no deadline
  });
  it('0.1 秒の描き直しは、動いていて・表示中で・タブが前にあるときだけ（timer を作る・放す）', () => {
    fakeNotify('granted');
    const { d, page } = boot(at(10, 24, 36));
    const base = vi.getTimerCount();
    const scope = effectScope(true);
    const face = scope.run(() => useFaceClock(d, 'stopwatch', () => swOf(d, 'stopwatch').run, 100));
    if (!face) throw new Error('no face');
    useWithoutPlacing(d, 'stopwatch');
    expect(vi.getTimerCount()).toBe(base);
    setSw(d, 'stopwatch', toggleSw(SW_IDLE, d.now()));
    expect(vi.getTimerCount()).toBe(base + 1);
    vi.advanceTimersByTime(300);
    expect(face.value).toBe(d.now());
    // Background tab: no redraw timer, the face keeps its last time.
    page.setHidden(true);
    expect(vi.getTimerCount()).toBe(base);
    const kept = face.value;
    vi.advanceTimersByTime(5_000);
    expect(face.value).toBe(kept);
    page.setHidden(false);
    expect(face.value).toBe(d.now());
    expect(vi.getTimerCount()).toBe(base + 1);
    // Closing temporary use (not shown): released too.
    d.back();
    expect(vi.getTimerCount()).toBe(base);
    useWithoutPlacing(d, 'stopwatch');
    expect(vi.getTimerCount()).toBe(base + 1);
    scope.stop();
    expect(vi.getTimerCount()).toBe(base);
  });
  it('1 秒ごとの描き直し（ポモドーロの残り）も、見えない・タブが裏の間は止まる', () => {
    fakeNotify('granted');
    const { d, page } = boot(at(10, 24, 36));
    const scope = effectScope(true);
    const now = scope.run(() => useShownNow(d, 'pomo'));
    if (!now) throw new Error('no clock');
    useWithoutPlacing(d, 'pomo');
    d.ui.t = at(10, 24, 40);
    expect(now.value).toBe(at(10, 24, 40));
    page.setHidden(true);
    d.ui.t = at(10, 24, 50);
    expect(now.value).toBe(at(10, 24, 40));
    page.setHidden(false);
    expect(now.value).toBe(at(10, 24, 50));
    d.back();
    d.ui.t = at(10, 25, 0);
    expect(now.value).toBe(at(10, 24, 50));
    scope.stop();
  });
});
