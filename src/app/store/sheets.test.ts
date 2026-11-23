import { describe, expect, it } from 'vitest';
import { Dashboard } from './store';
import { memoryStore } from './persist';
import { REGISTRY, REGISTRY_ORDER } from '../registry/registry';
import {
  catalogGroups, deleteBoard, fieldCheck, foldKana, itemsOf, markSeen, matchWidget, parseBulkLinks, placeAt, presetMinimal,
  pushHistory, selectOptions, setWidgetSize, shiftOrder, togglePin, toggleSection, sectionOpen, widgetDock,
} from './sheets';

function make() {
  let t = Date.UTC(2026, 10, 19, 1, 24, 36);
  const d = new Dashboard({ store: memoryStore(), dataDefs: {}, now: () => (t += 1000), setTimeout: () => 0 });
  return d;
}

describe('foldKana / matchWidget (仕様書 2章「ウィジェットを探す」)', () => {
  it('ignores hiragana/katakana, full/half width and case', () => {
    expect(foldKana('トケイ')).toBe('とけい');
    expect(foldKana('ﾄｹｲ')).toBe('とけい');
    expect(foldKana('ＧｉｔＨｕｂ')).toBe('github');
    expect(foldKana('PR')).toBe('pr');
  });
  const clock = REGISTRY.clock;
  const github = REGISTRY.github;
  if (!clock || !github) throw new Error('registry');
  it('matches name, id, keywords and category', () => {
    expect(matchWidget(clock, 'トケイ')).toBe(true);
    expect(matchWidget(clock, 'CLOCK')).toBe(true);
    expect(matchWidget(clock, '時間')).toBe(true);
    expect(matchWidget(github, 'ｐｒ')).toBe(true);
    expect(matchWidget(github, 'ギットハブ')).toBe(true);
  });
  it('requires every space-separated word (full-width space too)', () => {
    expect(matchWidget(clock, 'とけい 時刻')).toBe(true);
    expect(matchWidget(clock, 'とけい　天気')).toBe(false);
    expect(matchWidget(clock, '   ')).toBe(true);
  });
});

describe('catalogGroups', () => {
  it('lists every widget in fixed category order when empty', () => {
    const g = catalogGroups('');
    expect(g.map(x => x.n)).toEqual(['時間', '予定と記録', '情報', '道具', 'ローカルAI', 'データ表示']);
    expect(g.flatMap(x => x.ids)).toEqual([...REGISTRY_ORDER]);
  });
  it('collapses into one 「検索結果」 group while searching', () => {
    const g = catalogGroups('カレンダー');
    expect(g).toHaveLength(1);
    expect(g[0]?.n).toBe('検索結果');
    expect(g[0]?.ids).toEqual(expect.arrayContaining(['month', 'week', 'agenda']));
  });
  it('returns nothing for no match', () => {
    expect(catalogGroups('zzzzqq')).toEqual([]);
  });
});

describe('pushHistory (最近の検索)', () => {
  it('keeps 5, newest first, without duplicates', () => {
    let h: string[] = [];
    for (const q of ['a', 'b', 'c', 'd', 'e', 'f', ' b ']) h = pushHistory(h, q);
    expect(h).toEqual(['b', 'f', 'e', 'd', 'c']);
    expect(pushHistory(h, '  ')).toEqual(h);
  });
});

describe('placement operations', () => {
  it('adds an unplaced widget to the target board at the end of the order', () => {
    const d = make();
    expect(d.g.off.calc).toBe(true);
    placeAt(d, 'calc', 'g0', true);
    expect(d.g.off.calc).toBeUndefined();
    expect(d.g.place.calc).toBe('g0');
    expect(d.g.order.at(-1)).toBe('calc');
    expect(d.ui.flash).toBe('calc');
    expect(d.ui.toasts.at(-1)?.text).toBe('電卓 を「ボード 1」に追加しました');
  });
  it('deleting a board unplaces its widgets and renumbers', () => {
    const d = make();
    const id = d.addBoard();
    d.addBoard();
    placeAt(d, 'calc', id, true);
    deleteBoard(d, id);
    expect(d.g.groups.map(g => g.n)).toEqual(['ボード 1', 'ボード 2']);
    expect(d.g.off.calc).toBe(true);
  });
  it('minimal preset keeps only the starter set on board 1', () => {
    const d = make();
    placeAt(d, 'calc', 'g0', true);
    presetMinimal(d);
    expect(Object.keys(REGISTRY).filter(id => !d.g.off[id]).sort()).toEqual(['clock', 'links', 'memo', 'rain', 'search', 'todo', 'weather']);
  });
  it('size respects min/max and the lock', () => {
    const d = make();
    setWidgetSize(d, 'todo', 1, 1);
    expect(d.sizeOf('todo')).toEqual([2, 2]);
    setWidgetSize(d, 'todo', 3, 2);
    expect(d.sizeOf('todo')).toEqual([3, 2]);
    d.g.lockSz = { todo: true };
    setWidgetSize(d, 'todo', 4, 3);
    expect(d.sizeOf('todo')).toEqual([3, 2]);
  });
  it('shiftOrder swaps with the neighbour on the same board, skipping unplaced ones', () => {
    const d = make();
    const placed = d.g.order.filter(id => !d.g.off[id]);
    const a = placed[1] ?? '', b = placed[2] ?? '';
    shiftOrder(d, b, -1);
    const after = d.g.order.filter(id => !d.g.off[id]);
    expect(after.indexOf(b)).toBeLessThan(after.indexOf(a));
  });
  it('pins at the current position', () => {
    const d = make();
    togglePin(d, 'weather');
    const p = d.layout.value.pos.weather;
    expect(d.g.pins.weather).toEqual([0, p?.c, p?.r]);
    togglePin(d, 'weather');
    expect(d.g.pins.weather).toBeUndefined();
  });
});

describe('widgetDock (仕様書 4章「シートの出る位置」)', () => {
  it('docks opposite the widget when wide, above/below when narrow', () => {
    const d = make();
    d.env.width = 1440; d.env.height = 900;
    const p = d.layout.value.pos.clock;
    expect(p?.c).toBe(0);
    expect(widgetDock(d, 'clock')).toBe('right');
    expect(widgetDock(d, null)).toBe('right');
    d.env.width = 390; d.env.height = 844;
    expect(widgetDock(d, 'clock')).toBe('bottom');
  });
});

describe('fieldCheck (入力欄の補足とエラー)', () => {
  const now = new Date(2026, 10, 19, 10, 24, 36).getTime();
  it('checks the custom search URL', () => {
    expect(fieldCheck('search', 'url', '', now).hint).toContain('検索先');
    expect(fieldCheck('search', 'url', 'example.com', now).err).toContain('https://');
    expect(fieldCheck('search', 'url', 'https://x.jp/?q=', now).err).toContain('%s');
    expect(fieldCheck('search', 'url', 'https://x.jp/?q=%s', now)).toEqual({ hint: '%s のところに検索語が入ります' });
  });
  it('checks tax rates', () => {
    expect(fieldCheck('tax', 'rates', '10, 8', now).hint).toBeDefined();
    expect(fieldCheck('tax', 'rates', '10, abc', now).err).toBeDefined();
    expect(fieldCheck('tax', 'rates', '1,2,3,4,5', now).err).toContain('4つまで');
  });
  it('describes countdown dates and alarm times', () => {
    expect(fieldCheck('countdown', 'date', '2026-12-31', now).hint).toBe('あと42日（12月31日）');
    expect(fieldCheck('countdown', 'date', '2026-11-19', now).hint).toBe('今日です（11月19日）');
    expect(fieldCheck('alarm', 'a1', '07:00', now).hint).toBe('毎日鳴ります。次は明日 7:00（オンのときだけ）');
    expect(fieldCheck('alarm', 'a2', '22:30', now).hint).toBe('毎日鳴ります。次は今日 22:30（オンのときだけ）');
    expect(fieldCheck('alarm', 'a1', '', now).err).toBeDefined();
  });
});

describe('parseBulkLinks', () => {
  it('reads one URL per line with an optional name', () => {
    expect(parseBulkLinks('https://www.example.com 例\nnope\nhttps://a.jp')).toEqual([
      { url: 'https://www.example.com', label: '例' }, { url: 'https://a.jp', label: 'a.jp' },
    ]);
  });
  it('reads a bookmarks HTML export', () => {
    expect(parseBulkLinks('<DT><A HREF="https://b.jp/x" ADD_DATE="1">B</A>')).toEqual([{ url: 'https://b.jp/x', label: 'B' }]);
  });
});

describe('select options and misc', () => {
  it('home: board 1 is stored as empty', () => {
    const d = make();
    const id = d.addBoard();
    selectOptions(d, 'home')[1]?.tap();
    expect(d.g.gs.home).toBe(id);
    expect(selectOptions(d, 'home').map(o => o.on)).toEqual([false, true]);
    selectOptions(d, 'home')[0]?.tap();
    expect(d.g.gs.home).toBe('');
  });
  it('field options use the widget in the settings sheet', () => {
    const d = make();
    Object.assign(d.ui, { sel: 'search', panel: 'widget' });
    const o = selectOptions(d, 'f:eng');
    expect(o.map(x => x.n)).toEqual(['Google', 'Bing', 'DuckDuckGo', 'Yahoo!']);
    o[2]?.tap();
    expect(d.cfgOf('search', 'eng')).toBe('DuckDuckGo');
  });
  it('collapsible sections default to look + layout', () => {
    const d = make();
    expect(sectionOpen(d, 'look')).toBe(true);
    expect(sectionOpen(d, 'ai')).toBe(false);
    toggleSection(d, 'look');
    toggleSection(d, 'ai');
    expect(d.g.dsO).toMatchObject({ look: false, layout: true, ai: true });
  });
  it('markSeen fills seenW', () => {
    const d = make();
    d.g.seenW = ['clock'];
    markSeen(d);
    expect(d.g.seenW).toHaveLength(Object.keys(REGISTRY).length);
  });
  it('items fall back to the prototype samples', () => {
    const d = make();
    expect(itemsOf(d, 'habit').map(x => x.label)).toEqual(['水を飲む', '読書', '運動', '早寝']);
  });
});
