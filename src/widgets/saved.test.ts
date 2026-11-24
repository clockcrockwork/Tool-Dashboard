/**
 * 保存しないもの (実装ガイド 6章の除外, review #7) を今ある記録の定義（todo・links・memo・agenda）で確かめる。
 * 画面の一時状態（開いているシート・今の画面・前面表示・再生中かどうか・プレビューか・カーソル）、録音、画像変換の一覧と画像、現在地、
 * スクリプトの結果、会話保存オフの会話、生成途中の応答は data に入らない。書き方は src/widgets/README.md「保存しないもの」。
 */
import { describe, expect, it } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { Dashboard } from '../app/store/store';
import { memoryStore, widgetKey } from '../app/store/persist';
import { WIDGET_DATA } from './index';

const NOW = new Date(2026, 10, 19, 10, 24, 36).getTime();

/** Fields a widget might be tempted to keep next to its record. None of them may be saved. */
const TEMP = {
  view: 'preview', caret: 3, scrollY: 120, big: true, panel: 'widget', page: 2, peek: true, playing: true, sel: 1,
  recording: { blob: 'audio' }, images: ['data:image/png;base64,AAAA'], geo: { lat: 35.68, lon: 139.76 },
  result: 'スクリプトの結果', partial: '生成途中の…', token: 'secret-key',
};
const ITEM_TEMP = { editing: true, open: true, dragging: true, token: 'secret-key' };

/** The keys each record keeps (record, then each list item). */
const SHAPE: Readonly<Record<string, readonly [record: readonly string[], list: string, item: readonly string[]]>> = {
  todo: [['items'], 'items', ['done', 'id', 't']],
  links: [['items'], 'items', ['ic', 'id', 'img', 'label', 'url']],
  memo: [['done', 'text'], '', []],
  agenda: [['events'], 'events', ['c', 'hasTime', 'id', 'n', 'ts']],
};

const saved = (kind: string, data: unknown): unknown => {
  const def = WIDGET_DATA[kind];
  if (!def) throw new Error(kind);
  return def.toSaved ? def.toSaved(data, () => undefined) : data;
};

describe('記録の定義: 保存しないものは data に入らない', () => {
  it('covers every record definition', () => {
    expect(Object.keys(WIDGET_DATA).sort()).toEqual(Object.keys(SHAPE).sort());
  });

  for (const [kind, [rec, list, item]] of Object.entries(SHAPE)) {
    it(kind + ': the initial record holds only its own fields', () => {
      const def = WIDGET_DATA[kind];
      const data = saved(kind, def?.initial(NOW)) as Record<string, unknown>;
      expect(Object.keys(data).sort()).toEqual([...rec]);
      if (list) for (const x of data[list] as Record<string, unknown>[]) expect(item).toEqual(expect.arrayContaining(Object.keys(x)));
    });

    it(kind + ': restoring / importing drops temporary fields (sanitize), so they are never written back', () => {
      const def = WIDGET_DATA[kind];
      const init = def?.initial(NOW) as Record<string, unknown>;
      const raw: Record<string, unknown> = { ...init, ...TEMP };
      if (list) raw[list] = (init[list] as Record<string, unknown>[]).map(x => ({ ...x, ...ITEM_TEMP }));
      const clean = def?.sanitize(raw, NOW);
      expect(clean).toEqual(init);
      const text = JSON.stringify(saved(kind, clean));
      for (const k of [...Object.keys(TEMP), ...Object.keys(ITEM_TEMP)]) expect(text).not.toContain('"' + k + '"');
      expect(text).not.toContain('secret-key');
    });
  }
});

describe('画面の一時状態は保存されない (区画の bytes が変わらない)', () => {
  it('opening sheets, moving screens, front display, peeking and toasts write nothing', async () => {
    const store = memoryStore();
    const d = new Dashboard({ store, dataDefs: WIDGET_DATA, now: () => NOW, setTimeout: () => 0 });
    const scope = effectScope();
    const stop = scope.run(() => d.start());
    // Write each record once so every section exists in the store.
    for (const id of ['todo', 'links', 'memo', 'agenda']) {
      const def = WIDGET_DATA[id];
      const v = def?.initial(NOW) as Record<string, unknown>;
      d.setData(id, id === 'memo' ? { ...v, text: 'x' } : { ...v, [Object.keys(v)[0] ?? '']: [] });
    }
    await nextTick();
    const before = Object.fromEntries(store.keys().map(k => [k, store.get(k)]));
    expect(Object.keys(before)).toEqual(expect.arrayContaining(['todo', 'links', 'memo', 'agenda'].map(widgetKey)));

    d.openPanel('widget', { sel: 'memo' });
    d.go(1);
    Object.assign(d.ui, { big: 'memo', peek: { memo: true }, edit: true });
    d.toast('テスト');
    await nextTick();
    const after = Object.fromEntries(store.keys().map(k => [k, store.get(k)]));
    expect(after).toEqual(before);
    for (const id of ['todo', 'links', 'memo', 'agenda']) {
      const sec = JSON.parse(store.get(widgetKey(id)) ?? '{}') as Record<string, unknown>;
      expect(Object.keys(sec).sort()).toEqual(['cfg', 'data', 'dv', 'v']);
    }
    stop?.();
    scope.stop();
  });
});
