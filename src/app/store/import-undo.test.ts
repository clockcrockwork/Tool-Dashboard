/**
 * review #3: 読み込みの「元に戻す」. A reading keeps a snapshot of every section (global, each placement's settings and
 * record, the bytes of locked sections) and the toast's 「元に戻す」 puts it back; the restored state is what stays saved.
 * The shared undo history (仕様書 7章) is not widened: records never enter it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { Dashboard } from './store';
import { GLOBAL_KEY, memoryStore, widgetKey, type SectionStore } from './persist';
import { importFromClipboard } from './sheets';
import { WIDGET_DATA } from '../../widgets';
import type { TodoData } from '../../widgets/todo/data';
import type { MemoData } from '../../widgets/memo/data';
import type { AgendaData } from '../../widgets/agenda/data';

const T0 = Date.UTC(2026, 10, 19, 1, 24, 36);
function make(store: SectionStore) {
  let t = T0;
  const d = new Dashboard({ store, dataDefs: WIDGET_DATA, now: () => (t += 1000), setTimeout: () => 0 });
  const stop = d.start();
  return { d, stop };
}
const bytes = (s: SectionStore): Record<string, string | null> => Object.fromEntries(s.keys().sort().map(k => [k, s.get(k)]));
const lastToast = (d: Dashboard) => d.ui.toasts[d.ui.toasts.length - 1];
function clipboardText(text: string): void {
  vi.stubGlobal('navigator', { clipboard: { readText: () => Promise.resolve(text) } });
}

afterEach(() => { vi.unstubAllGlobals(); });

/** A dashboard whose TODO, メモ, 予定 and layout were changed and saved, plus a section from a newer build (locked). */
async function saved() {
  const FUTURE = JSON.stringify({ v: 99, cfg: {}, data: { from: 'newer build' } });
  const store = memoryStore({ [widgetKey('links')]: FUTURE });
  const { d, stop } = make(store);
  d.setData<TodoData>('todo', { items: [{ id: 7, t: '元のTODO', done: false }] });
  d.setData<MemoData>('memo', { text: '# 元のメモ', done: {} });
  d.setData<AgendaData>('agenda', { events: [{ id: 3, ts: T0, hasTime: true, n: '元の予定', c: 'a1' }] });
  d.setCfg('todo', 'hide', true);
  d.setG('acc', 2);
  await nextTick();
  return { d, stop, store, FUTURE };
}

/** An export from another dashboard: different records, a second link placement, all sections valid. */
function otherExport(): string {
  const { d, stop } = make(memoryStore());
  d.setData<TodoData>('todo', { items: [{ id: 1, t: '読み込んだTODO', done: true }] });
  d.setData<MemoData>('memo', { text: '# 読み込んだメモ', done: {} });
  d.setData<AgendaData>('agenda', { events: [] });
  d.setG('acc', 4);
  d.addInstance('links');
  const json = d.exportJson();
  stop();
  return json;
}

describe('読み込み → 元に戻す (review #3)', () => {
  it('puts back TODO, メモ, 予定, settings and layout, and the saved bytes (locked sections included)', async () => {
    const { d, stop, store, FUTURE } = await saved();
    const before = bytes(store);
    expect(before[widgetKey('links')]).toBe(FUTURE);
    expect(d.lockedKeys()).toEqual([widgetKey('links')]);

    clipboardText(otherExport());
    expect(await importFromClipboard(d)).toBe(true);
    await nextTick();
    expect(d.dataOf<TodoData>('todo').items[0]?.t).toBe('読み込んだTODO');
    expect(d.dataOf<MemoData>('memo').text).toBe('# 読み込んだメモ');
    expect(d.dataOf<AgendaData>('agenda').events).toEqual([]);
    expect(d.g.order).toContain('links#2');
    expect(store.get(widgetKey('links'))).not.toBe(FUTURE);
    expect(store.get(widgetKey('links#2'))).not.toBeNull();
    expect(d.lockedKeys()).toEqual([]);

    const t = lastToast(d);
    expect(t).toMatchObject({ text: '読み込みました', act: { label: '元に戻す' } });
    t?.act?.fn();
    await nextTick();
    expect(lastToast(d)?.text).toBe('元に戻しました');

    // In memory.
    expect(d.dataOf<TodoData>('todo').items).toEqual([{ id: 7, t: '元のTODO', done: false }]);
    expect(d.dataOf<MemoData>('memo').text).toBe('# 元のメモ');
    expect(d.dataOf<AgendaData>('agenda').events[0]?.n).toBe('元の予定');
    expect(d.cfgOf('todo', 'hide')).toBe(true);
    expect(d.g.gs.acc).toBe(2);
    expect(d.g.order).not.toContain('links#2');
    expect(d.lockedKeys()).toEqual([widgetKey('links')]);
    // Saved bytes: exactly as before the reading (the newer build's section is back, the created one is gone).
    expect(bytes(store)).toEqual(before);

    // Later changes keep writing normally, and the locked section stays untouched.
    d.setData<MemoData>('memo', { text: '# 戻したあとに書いた', done: {} });
    await nextTick();
    expect(store.get(widgetKey('memo'))).toContain('戻したあとに書いた');
    expect(store.get(widgetKey('links'))).toBe(FUTURE);
    stop();

    // The restored state is what a reload reads.
    const { d: again, stop: stop2 } = make(store);
    expect(again.dataOf<TodoData>('todo').items[0]?.t).toBe('元のTODO');
    expect(again.dataOf<AgendaData>('agenda').events[0]?.n).toBe('元の予定');
    expect(again.g.gs.acc).toBe(2);
    stop2();
  });

  it('pressing 元に戻す twice restores once (a later change is not undone by the old toast)', async () => {
    const { d, stop } = await saved();
    clipboardText(otherExport());
    await importFromClipboard(d);
    await nextTick();
    const undo = d.ui.toasts.find(x => x.text === '読み込みました')?.act;
    undo?.fn();
    await nextTick();
    d.setData<MemoData>('memo', { text: '# その後', done: {} });
    undo?.fn();
    expect(d.dataOf<MemoData>('memo').text).toBe('# その後');
    stop();
  });

  it('keeps the shared history as it was: a reading neither adds to it nor is undone by Ctrl+Z', async () => {
    const { d, stop, store } = await saved();
    const couldUndo = d.canUndo;
    clipboardText(otherExport());
    await importFromClipboard(d);
    await nextTick();
    // Ctrl+Z after a reading has nothing from before it (that state was replaced as a whole).
    expect(d.canUndo).toBe(false);
    d.ui.toasts.find(x => x.text === '読み込みました')?.act?.fn();
    await nextTick();
    expect(d.canUndo).toBe(couldUndo);
    // The common undo still covers settings only, never records.
    expect(store.get(GLOBAL_KEY)).toContain('"acc":2');
    stop();
  });

  it('a refused reading changes nothing and offers no undo', async () => {
    const { d, stop, store } = await saved();
    const before = bytes(store);
    clipboardText('{"format":"lgd-dashboard","v":999}');
    expect(await importFromClipboard(d)).toBe(false);
    await nextTick();
    expect(lastToast(d)?.act).toBeNull();
    expect(bytes(store)).toEqual(before);
    stop();
  });
});
