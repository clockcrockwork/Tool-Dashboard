/**
 * 共通の通知（notify.ts、p2a-followup.md 2・3章）: 通知の設定、許可の状態（保存しない）、人前では隠すの伏せ方、
 * トーストとブラウザの通知の出し分け、重複の防止、許可のお願い（共通の枠の cover、明示の操作から）.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { Dashboard } from '../store/store';
import { memoryStore } from '../store/persist';
import { REGISTRY } from '../registry/registry';
import { WIDGET_DATA } from '../../widgets';
import {
  OPEN_ONLY_NOTE, VEILED_BODY, VEILED_TAG, VEILED_TITLE, VEILED_TOAST, askNotify, notify, notifyAskOf, notifyCover, notifyOn,
  notifyPermOf, notifySettingKey, resetNotifyApi,
} from './notify';
import { fakeNotify, toastTexts } from './test-fixtures';

const T0 = new Date(2026, 10, 19, 10, 24, 36).getTime();
const make = (): Dashboard => new Dashboard({ store: memoryStore(), dataDefs: WIDGET_DATA });
const MSG = { key: 'alarm:alarm:0:1', text: 'アラーム 07:00', title: 'アラーム', body: '07:00' };

beforeEach(() => { vi.useFakeTimers({ now: T0 }); });
afterEach(() => { vi.useRealTimers(); resetNotifyApi(); });

describe('通知の設定（cfg）と対象の種類', () => {
  it('kinds with perm notify only; the tg field `notify` is the setting, kinds without it are always on', () => {
    const notifying = Object.values(REGISTRY).filter(r => r.perm.includes('notify')).map(r => r.id).sort();
    expect(notifying).toEqual(['alarm', 'habit', 'pomo']);
    expect(notifySettingKey(REGISTRY.pomo)).toBe('notify');
    expect(notifySettingKey(REGISTRY.habit)).toBe('notify');
    expect(notifySettingKey(REGISTRY.alarm)).toBeNull();
    fakeNotify('granted');
    const d = make();
    expect(notifyOn(d, 'alarm')).toBe(true);
    expect(notifyOn(d, 'pomo')).toBe(true);
    expect(notifyOn(d, 'clock')).toBe(false);
    d.setCfg('pomo', 'notify', false);
    expect(notifyOn(d, 'pomo')).toBe(false);
    expect(notify(d, 'pomo', { key: 'p1', text: 'ポモドーロ完了' })).toBe('off');
    expect(notify(d, 'clock', { key: 'c1', text: 'x' })).toBe('off');
    expect(d.ui.toasts).toEqual([]);
  });
  it('the open-only sentence of the settings panel', () => {
    expect(OPEN_ONLY_NOTE).toBe('ダッシュボードを開いている間だけ知らせます');
  });
});

describe('許可の状態（ブラウザから読む。保存しない）', () => {
  it('granted / denied / default / not available, and a change in the browser settings', async () => {
    const f = fakeNotify('granted');
    const d = make();
    expect(notifyPermOf(d)).toBe('ok');
    f.change('denied');
    expect(notifyPermOf(d)).toBe('no');
    f.change('default');
    expect(notifyPermOf(d)).toBe('');
    fakeNotify(null);
    expect(notifyPermOf(make())).toBe('no');
    fakeNotify('default');
    const d2 = make();
    expect(notifyPermOf(d2)).toBe('');
    await nextTick();
    expect(JSON.stringify([d2.g, d2.cfg, d2.data])).not.toMatch(/perm|granted|denied/);
  });
});

describe('出し分け: トーストは必ず、ブラウザの通知はタブが裏で許可済みのときだけ', () => {
  it('visible tab: toast only', () => {
    const f = fakeNotify('granted');
    const d = make();
    expect(notify(d, 'alarm', MSG)).toBe('shown');
    expect(toastTexts(d)).toEqual(['アラーム 07:00']);
    expect(f.shown).toEqual([]);
  });
  it('background tab and allowed: toast and a browser notification with the kind\'s text', () => {
    const f = fakeNotify('granted');
    f.tabHidden = true;
    const d = make();
    notify(d, 'alarm', MSG);
    expect(toastTexts(d)).toEqual(['アラーム 07:00']);
    expect(f.shown).toEqual([{ title: 'アラーム', body: '07:00', tag: 'lgd-' + MSG.key }]);
  });
  it('not allowed / not available: the toast still tells it (nothing stops)', () => {
    for (const p of ['denied', 'default', null] as const) {
      const f = fakeNotify(p);
      f.tabHidden = true;
      const d = make();
      expect(notify(d, 'alarm', MSG)).toBe('shown');
      expect(toastTexts(d)).toEqual(['アラーム 07:00']);
      expect(f.shown).toEqual([]);
    }
  });
  it('the toast takes the weight', () => {
    fakeNotify('granted');
    const d = make();
    notify(d, 'pomo', { key: 'p', text: 'ポモドーロ完了', kind: 'ok' });
    expect(d.ui.toasts[0]?.kind).toBe('ok');
  });
});

describe('人前では隠す: 判定と知らせは続け、中身は伏せる（どの種類でも同じ文）', () => {
  it('toast and browser notification use the generic texts; no widget name, time or content', () => {
    const f = fakeNotify('granted');
    f.tabHidden = true;
    const d = make();
    d.setG('veil', true);
    d.setCfg('alarm', 'veil', true);
    expect(notify(d, 'alarm', MSG)).toBe('veiled');
    expect(toastTexts(d)).toEqual([VEILED_TOAST]);
    expect(VEILED_TOAST).toBe('通知があります。人前では隠すがオンなので、内容はウィジェットで確認してください');
    expect(f.shown).toEqual([{ title: VEILED_TITLE, body: VEILED_BODY, tag: VEILED_TAG }]);
    expect(VEILED_TITLE).toBe('通知があります');
    expect(VEILED_BODY).toBe('人前では隠すがオンなので、内容はダッシュボードで確認してください');
    const all = JSON.stringify([d.ui.toasts, f.shown]);
    for (const secret of ['アラーム', '07:00', 'ポモドーロ']) expect(all).not.toContain(secret);
  });
  it('several hidden notices at once: one toast while it shows (the browser one is replaced by its tag)', () => {
    const f = fakeNotify('granted');
    f.tabHidden = true;
    const d = make();
    d.setG('veil', true);
    d.setCfg('alarm', 'veil', true);
    d.setCfg('pomo', 'veil', true);
    notify(d, 'alarm', MSG);
    notify(d, 'alarm', { ...MSG, key: 'alarm:alarm:1:1' });
    notify(d, 'pomo', { key: 'pomo:pomo:3', text: 'ポモドーロ完了' });
    expect(toastTexts(d)).toEqual([VEILED_TOAST]);
    expect(new Set(f.shown.map(s => s.tag))).toEqual(new Set([VEILED_TAG]));
    // Once the toast is gone, a later hidden notice shows again.
    vi.advanceTimersByTime(4_000);
    expect(d.ui.toasts).toEqual([]);
    notify(d, 'alarm', { ...MSG, key: 'alarm:alarm:0:2' });
    expect(toastTexts(d)).toEqual([VEILED_TOAST]);
  });
  it('「表示する」 shows the content again: the kind\'s text', () => {
    fakeNotify('granted');
    const d = make();
    d.setG('veil', true);
    d.setCfg('alarm', 'veil', true);
    d.ui.peek = { alarm: true };
    expect(notify(d, 'alarm', MSG)).toBe('shown');
  });
});

describe('重複の防止', () => {
  it('the same key is sent once', () => {
    const f = fakeNotify('granted');
    f.tabHidden = true;
    const d = make();
    expect(notify(d, 'alarm', MSG)).toBe('shown');
    expect(notify(d, 'alarm', MSG)).toBe('dup');
    expect(d.ui.toasts).toHaveLength(1);
    expect(f.shown).toHaveLength(1);
  });
});

describe('許可のお願い（共通の枠の cover、明示の操作から）', () => {
  it('asked only when the kind notifies, its setting is on, not answered yet and not hidden; otherwise continues at once', () => {
    fakeNotify('default');
    const d = make();
    const go = vi.fn();
    expect(askNotify(d, 'clock', { title: 't', text: '' }, go)).toBe(false);
    expect(go).toHaveBeenCalledTimes(1);
    d.setCfg('pomo', 'notify', false);
    expect(askNotify(d, 'pomo', { title: 't', text: '' }, go)).toBe(false);
    expect(go).toHaveBeenCalledTimes(2);
    d.setCfg('pomo', 'notify', true);
    d.setG('veil', true);
    d.setCfg('pomo', 'veil', true);
    expect(askNotify(d, 'pomo', { title: 't', text: '' }, go)).toBe(false);
    d.setCfg('pomo', 'veil', false);
    expect(askNotify(d, 'pomo', { title: '終わったら通知しますか？', text: '理由' }, go)).toBe(true);
    expect(go).toHaveBeenCalledTimes(3);
    expect(notifyAskOf(d, 'pomo')).toBe('ask');
    fakeNotify('granted');
    expect(askNotify(make(), 'pomo', { title: 't', text: '' }, go)).toBe(false);
    fakeNotify('denied');
    expect(askNotify(make(), 'alarm', { title: 't', text: '' })).toBe(false);
  });
  it('「通知を許可」 asks the browser; allowed → the operation continues and the card closes', async () => {
    const f = fakeNotify('default');
    const d = make();
    const go = vi.fn();
    askNotify(d, 'pomo', { title: '終わったら通知しますか？', text: 'このタブを見ていないときも' }, go);
    const c = notifyCover(d, 'pomo');
    expect(c?.title).toBe('終わったら通知しますか？');
    expect(c?.ok?.label).toBe('通知を許可');
    expect(c?.alt?.label).toBe('通知しない');
    expect(f.requests).toBe(0);
    c?.ok?.fn();
    await Promise.resolve();
    await Promise.resolve();
    expect(f.requests).toBe(1);
    expect(go).toHaveBeenCalledTimes(1);
    expect(notifyCover(d, 'pomo')).toBeNull();
    expect(notifyPermOf(d)).toBe('ok');
  });
  it('refused → 「通知を出せません」 with 「このまま始める」 (runs) or 「閉じる」; the permission is not saved', async () => {
    const f = fakeNotify('default');
    f.answer = 'denied';
    const d = make();
    const go = vi.fn();
    askNotify(d, 'pomo', { title: 't', text: '', go: 'このまま始める' }, go);
    notifyCover(d, 'pomo')?.ok?.fn();
    await Promise.resolve();
    await Promise.resolve();
    const c = notifyCover(d, 'pomo');
    expect(c?.title).toBe('通知を出せません');
    expect(c?.warn).toBe(true);
    expect(c?.ok?.label).toBe('このまま始める');
    expect(go).not.toHaveBeenCalled();
    c?.ok?.fn();
    expect(go).toHaveBeenCalledTimes(1);
    expect(notifyPermOf(d)).toBe('no');
    // Not asked again in this session.
    expect(askNotify(d, 'pomo', { title: 't', text: '' }, go)).toBe(false);
  });
  it('a prompt dismissed without an answer (stays default) counts as no for this session only', async () => {
    const f = fakeNotify('default');
    f.answer = 'default';
    const d = make();
    askNotify(d, 'alarm', { title: 't', text: '' });
    notifyCover(d, 'alarm')?.ok?.fn();
    await Promise.resolve();
    await Promise.resolve();
    expect(notifyPermOf(d)).toBe('no');
    // Nothing waits for the answer (the alarm is on already): only 「閉じる」.
    const c = notifyCover(d, 'alarm');
    expect(c?.ok?.label).toBe('閉じる');
    expect(c?.alt).toBeUndefined();
    c?.ok?.fn();
    expect(notifyCover(d, 'alarm')).toBeNull();
    expect(notifyPermOf(make())).toBe('');
  });
  it('「通知しない」: turns the kind\'s setting off (ポモドーロ), or stops asking this placement in this session (アラーム)', () => {
    fakeNotify('default');
    const d = make();
    const go = vi.fn();
    askNotify(d, 'pomo', { title: 't', text: '' }, go);
    notifyCover(d, 'pomo')?.alt?.fn();
    expect(go).toHaveBeenCalledTimes(1);
    expect(d.cfgOf('pomo', 'notify')).toBe(false);
    askNotify(d, 'alarm', { title: 't', text: '' });
    notifyCover(d, 'alarm')?.alt?.fn();
    expect(notifyCover(d, 'alarm')).toBeNull();
    expect(askNotify(d, 'alarm', { title: 't', text: '' })).toBe(false);
    expect(d.cfg.alarm).toEqual({});
  });
});
