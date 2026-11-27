/**
 * 共通の許可のお願い（permission.ts、仕様書 4章「許可のお願い」、p2a-followup.md 3章）: 許可の状態（ブラウザから読む。保存しない）、
 * お願いのカード（共通の枠の cover）、明示の操作でだけブラウザに問い合わせる、断られたときの直し方と代わりの手段、
 * 断られても実行を止めない、登録の `perm` と `states: 'perm'` の一致.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { Dashboard } from '../store/store';
import { memoryStore } from '../store/persist';
import { REGISTRY, type Permission } from '../registry/registry';
import { WIDGET_DATA } from '../../widgets';
import {
  PERMS, SCRIPT_CLIP_ASK, SUN_GEO_ASK, askPerm, closePermAsk, permAskOf, permCover, permOf, resetPermBrowser, setPermAsk,
  type BrowserPerm,
} from './permission';
import { askNotify } from './notify';
import { fakePerms } from './test-fixtures';
import { runtimeOf } from './runtime';

const T0 = new Date(2026, 10, 19, 10, 24, 36).getTime();
const make = (): Dashboard => new Dashboard({ store: memoryStore(), dataDefs: WIDGET_DATA });
const flush = async (): Promise<void> => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
const ALL: readonly Permission[] = ['geo', 'notify', 'mic', 'clipboard'];
/** One kind for each permission (the ones 仕様書 4章 names, and the recorder). */
const KIND: Readonly<Record<Permission, string>> = { geo: 'sun', notify: 'pomo', mic: 'recorder', clipboard: 'clip' };

beforeEach(() => { vi.useFakeTimers({ now: T0 }); });
afterEach(() => { vi.useRealTimers(); resetPermBrowser(); });

describe('登録の perm と、お願いを出せる種類・states の一致', () => {
  it('every kind with a permission can wait for it (states perm), and only those kinds', () => {
    const by = (p: Permission): string[] => Object.values(REGISTRY).filter(r => r.perm.includes(p)).map(r => r.id).sort();
    expect(by('geo')).toEqual(['rain', 'sun', 'weather']);
    expect(by('notify')).toEqual(['alarm', 'habit', 'pomo']);
    expect(by('mic')).toEqual(['recorder']);
    expect(by('clipboard')).toEqual(['clip', 'share']);
    for (const r of Object.values(REGISTRY)) expect(r.states.includes('perm'), r.id).toBe(r.perm.length > 0);
  });
  it('a card is shown for exactly the kinds listing the permission (geo・mic・clipboard・notify)', () => {
    fakePerms();
    for (const p of ALL) {
      const d = make();
      for (const r of Object.values(REGISTRY)) {
        const shown = askPerm(d, r.id, p, { then: () => {} });
        expect(shown, r.id + ' ' + p).toBe(r.perm.includes(p));
        expect(permAskOf(d, r.id), r.id + ' ' + p).toEqual(r.perm.includes(p) ? { perm: p, st: 'ask' } : null);
      }
    }
  });
  it('a kind asking for a permission it does not list: nothing happens (no card, no run, no browser)', () => {
    const f = fakePerms({ mic: 'granted' });
    const d = make();
    const go = vi.fn();
    expect(askPerm(d, 'clock', 'mic', { then: go })).toBe(false);
    expect(askPerm(d, 'recorder', 'geo', { then: go })).toBe(false);
    expect(go).not.toHaveBeenCalled();
    expect(f.requests).toEqual({ geo: 0, notify: 0, mic: 0, clipboard: 0 });
  });
  it('every permission has an icon and the full texts (request and refused)', () => {
    for (const p of ALL) {
      const c = PERMS[p].copy;
      for (const k of ['title', 'ok', 'alt', 'noTitle', 'noText', 'noOk', 'noAlt'] as const) expect(c[k], p + '.' + k).not.toBe('');
      expect(PERMS[p].icon).toMatch(/^M/);
    }
    expect(ALL.filter(p => PERMS[p].need)).toEqual(['geo', 'mic', 'clipboard']);
  });
});

describe('許可の状態（ブラウザから読む。保存しない）', () => {
  it.each(ALL)('%s: granted / denied / prompt / not available, and a change in the browser settings', async (p) => {
    const cases: [BrowserPerm, string][] = [['granted', 'ok'], ['denied', 'no'], ['prompt', ''], ['none', 'no']];
    for (const [b, want] of cases) {
      fakePerms({ [p]: b });
      expect(permOf(make(), p), b).toBe(want);
    }
    const f = fakePerms({ [p]: 'prompt' });
    const d = make();
    f.change(p, 'granted');
    expect(permOf(d, p)).toBe('ok');
    f.change(p, 'denied');
    expect(permOf(d, p)).toBe('no');
    f.change(p, 'prompt');
    expect(permOf(d, p)).toBe('');
    await nextTick();
    expect(JSON.stringify([d.g, d.cfg, d.data])).not.toMatch(/perm|granted|denied|prompt/);
  });
  it('a prompt dismissed without an answer counts as no for this Dashboard only', async () => {
    const f = fakePerms();
    f.answer.mic = 'prompt';
    const d = make();
    askPerm(d, 'recorder', 'mic', { then: () => {} });
    permCover(d, 'recorder')?.ok?.fn();
    await flush();
    expect(permOf(d, 'mic')).toBe('no');
    expect(permOf(make(), 'mic')).toBe('');
  });
});

describe('明示の操作でだけ問い合わせる（許可が要る: マイク・現在地・クリップボード）', () => {
  it.each(['geo', 'mic', 'clipboard'] as const)('%s: allowed already → runs at once; not asked → card first, the browser only from its button', async (p) => {
    const id = KIND[p];
    fakePerms({ [p]: 'granted' });
    const d0 = make();
    const go0 = vi.fn();
    expect(askPerm(d0, id, p, { then: go0 })).toBe(false);
    expect(go0).toHaveBeenCalledTimes(1);
    expect(permCover(d0, id)).toBeNull();

    const f = fakePerms();
    const d = make();
    // Reading the state, drawing and placing ask nothing.
    expect(permOf(d, p)).toBe('');
    expect(permCover(d, id)).toBeNull();
    const go = vi.fn();
    expect(askPerm(d, id, p, { then: go })).toBe(true);
    expect(f.requests[p]).toBe(0);
    const c = permCover(d, id);
    expect(c).toMatchObject({ icon: PERMS[p].icon, title: PERMS[p].copy.title, ok: { label: PERMS[p].copy.ok }, alt: { label: PERMS[p].copy.alt } });
    expect(c?.warn).toBeUndefined();
    c?.ok?.fn();
    c?.ok?.fn(); // a second press while the browser asks does not ask twice
    await flush();
    expect(f.requests[p]).toBe(1);
    expect(go).toHaveBeenCalledTimes(1);
    expect(permOf(d, p)).toBe('ok');
    expect(permCover(d, id)).toBeNull();
  });
  it.each(['geo', 'mic', 'clipboard'] as const)('%s: refused → how to fix it, 「もう一度」 asks again, the alternative; the operation does not run', async (p) => {
    const id = KIND[p];
    const f = fakePerms();
    f.answer[p] = 'denied';
    const d = make();
    const go = vi.fn();
    const other = vi.fn();
    askPerm(d, id, p, { then: go, noAlt: other });
    permCover(d, id)?.ok?.fn();
    await flush();
    expect(go).not.toHaveBeenCalled();
    const c = permCover(d, id);
    expect(c).toMatchObject({ warn: true, title: PERMS[p].copy.noTitle, text: PERMS[p].copy.noText, ok: { label: 'もう一度' }, alt: { label: PERMS[p].copy.noAlt } });
    expect(c?.text).toContain('アドレスバー左のボタンで許可できます');
    // Asked again later: the refused card at once (not the browser).
    closePermAsk(d, id);
    expect(askPerm(d, id, p, { then: go, noAlt: other })).toBe(true);
    expect(permAskOf(d, id)).toEqual({ perm: p, st: 'no' });
    expect(f.requests[p]).toBe(1);
    f.answer[p] = 'granted';
    permCover(d, id)?.ok?.fn();
    await flush();
    expect(f.requests[p]).toBe(2);
    expect(go).toHaveBeenCalledTimes(1);
    // The alternative closes the card and runs.
    f.change(p, 'denied');
    askPerm(d, id, p, { then: go, noAlt: other });
    permCover(d, id)?.alt?.fn();
    expect(other).toHaveBeenCalledTimes(1);
    expect(permCover(d, id)).toBeNull();
  });
  it('「やめる」 closes the card without asking the browser and without running', () => {
    const f = fakePerms();
    const d = make();
    const go = vi.fn();
    askPerm(d, 'recorder', 'mic', { then: go });
    permCover(d, 'recorder')?.alt?.fn();
    expect(permCover(d, 'recorder')).toBeNull();
    expect(go).not.toHaveBeenCalled();
    expect(f.requests.mic).toBe(0);
  });
  it('an operation that asks the browser itself (`request`, e.g. opening the microphone) replaces the request and `then`', async () => {
    const f = fakePerms();
    const d = make();
    let answer = false;
    const req = vi.fn(() => Promise.resolve(answer));
    const go = vi.fn();
    askPerm(d, 'recorder', 'mic', { request: req, then: go });
    expect(req).not.toHaveBeenCalled();
    permCover(d, 'recorder')?.ok?.fn();
    await flush();
    expect(req).toHaveBeenCalledTimes(1);
    expect(f.requests.mic).toBe(0);
    expect(permAskOf(d, 'recorder')).toEqual({ perm: 'mic', st: 'no' });
    answer = true;
    permCover(d, 'recorder')?.ok?.fn();
    await flush();
    expect(req).toHaveBeenCalledTimes(2);
    expect(permOf(d, 'mic')).toBe('ok');
    expect(permCover(d, 'recorder')).toBeNull();
    expect(go).not.toHaveBeenCalled();
    // Allowed: it runs at once; a failure (no device, revoked) shows the refused card.
    answer = false;
    expect(askPerm(d, 'recorder', 'mic', { request: req })).toBe(false);
    await flush();
    expect(req).toHaveBeenCalledTimes(3);
    expect(permAskOf(d, 'recorder')).toEqual({ perm: 'mic', st: 'no' });
  });
  it('hidden in public: no card (it could not be seen) and nothing runs', () => {
    fakePerms();
    const d = make();
    d.setG('veil', true);
    d.setCfg('recorder', 'veil', true);
    const go = vi.fn();
    expect(askPerm(d, 'recorder', 'mic', { then: go })).toBe(false);
    expect(permCover(d, 'recorder')).toBeNull();
    expect(go).not.toHaveBeenCalled();
  });
});

describe('通知（許可が無くても続けられる）: 断られても実行を止めない', () => {
  it('refused → 「このまま始める」 runs; refused before or hidden → runs at once without a card', async () => {
    const f = fakePerms();
    f.answer.notify = 'denied';
    const d = make();
    const go = vi.fn();
    askPerm(d, 'pomo', 'notify', { then: go });
    permCover(d, 'pomo')?.ok?.fn();
    await flush();
    expect(permCover(d, 'pomo')).toMatchObject({ warn: true, title: '通知を出せません', ok: { label: 'このまま始める' }, alt: { label: '閉じる' } });
    permCover(d, 'pomo')?.ok?.fn();
    expect(go).toHaveBeenCalledTimes(1);
    expect(askPerm(d, 'pomo', 'notify', { then: go })).toBe(false);
    expect(go).toHaveBeenCalledTimes(2);
    fakePerms();
    const d2 = make();
    d2.setG('veil', true);
    d2.setCfg('pomo', 'veil', true);
    expect(askPerm(d2, 'pomo', 'notify', { then: go })).toBe(false);
    expect(go).toHaveBeenCalledTimes(3);
  });
  it('a refused microphone leaves the other runs as they are (a running ポモドーロ keeps going)', async () => {
    const f = fakePerms({ notify: 'granted' });
    f.answer.mic = 'denied';
    const d = make();
    const rt = runtimeOf(d);
    rt.set('pomo', { on: true, endAt: T0 + 60_000, left: null });
    askPerm(d, 'recorder', 'mic', { then: () => {} });
    permCover(d, 'recorder')?.ok?.fn();
    await flush();
    expect(permAskOf(d, 'recorder')?.st).toBe('no');
    expect(rt.state('pomo', null)).toMatchObject({ on: true });
    expect(askNotify(d, 'pomo', {}, () => {})).toBe(false);
  });
});

describe('種類ごとの文（登録かウィジェットから渡す）', () => {
  it('the kind\'s sentences over the permission defaults (録音: 保存すると言わない)', async () => {
    fakePerms();
    const d = make();
    askPerm(d, 'recorder', 'mic', { copy: { text: '録音はこの端末の中だけで扱い、外に送りません。' } });
    expect(permCover(d, 'recorder')).toMatchObject({ title: 'マイクを使いますか？', text: '録音はこの端末の中だけで扱い、外に送りません。', ok: { label: 'マイクを使う' }, alt: { label: 'やめる' } });
    const { MIC_ASK } = await import('../../widgets/recorder/recorder');
    expect(MIC_ASK.text).toBe('録音はこの端末の中だけで扱い、外に送りません。');
    expect(MIC_ASK.text).not.toContain('保存');
  });
  it('日の出・日の入り（P2c）: 現在地 — 「位置を使う」/「都市を選ぶ」; refused shows the city used now', async () => {
    const f = fakePerms();
    f.answer.geo = 'denied';
    const d = make();
    const pick = vi.fn();
    askPerm(d, 'sun', 'geo', { copy: SUN_GEO_ASK('大阪'), alt: pick, noAlt: pick });
    expect(permCover(d, 'sun')).toMatchObject({ title: '現在地を使いますか？', text: '位置は端末の外に送りません', ok: { label: '位置を使う' }, alt: { label: '都市を選ぶ' } });
    permCover(d, 'sun')?.ok?.fn();
    await flush();
    expect(permCover(d, 'sun')).toMatchObject({ warn: true, title: '現在地を使えません', text: 'アドレスバー左のボタンで許可できます。いまは大阪で表示中', ok: { label: 'もう一度' }, alt: { label: '都市を選ぶ' } });
    permCover(d, 'sun')?.alt?.fn();
    expect(pick).toHaveBeenCalledTimes(1);
    expect(SUN_GEO_ASK().noText).toContain('いまは東京で表示中');
  });
  it('スクリプト（P2d）: クリップボード — 「クリップボードを使う」/「手入力にする」; reading is the request (once)', async () => {
    const f = fakePerms();
    const d = make();
    const manual = vi.fn();
    const read = vi.fn(() => Promise.resolve(true));
    askPerm(d, 'clip', 'clipboard', { copy: SCRIPT_CLIP_ASK, request: read, alt: manual, noAlt: manual });
    expect(permCover(d, 'clip')).toMatchObject({ title: 'クリップボードを読みますか？', ok: { label: 'クリップボードを使う' }, alt: { label: '手入力にする' } });
    expect(permCover(d, 'clip')?.text).toContain('端末の外には送りません');
    permCover(d, 'clip')?.alt?.fn();
    expect(manual).toHaveBeenCalledTimes(1);
    askPerm(d, 'clip', 'clipboard', { copy: SCRIPT_CLIP_ASK, request: read, alt: manual, noAlt: manual });
    permCover(d, 'clip')?.ok?.fn();
    await flush();
    expect(read).toHaveBeenCalledTimes(1);
    expect(f.requests.clipboard).toBe(0);
    expect(permOf(d, 'clipboard')).toBe('ok');
    setPermAsk(d, 'clip', 'clipboard', 'no', { copy: SCRIPT_CLIP_ASK, alt: manual, noAlt: manual });
    expect(permCover(d, 'clip')).toMatchObject({ warn: true, title: 'クリップボードを読めません', ok: { label: 'もう一度' }, alt: { label: '手入力にする' } });
    expect(permCover(d, 'clip')?.text).toContain('手入力');
  });
});
