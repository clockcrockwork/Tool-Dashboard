import { describe, expect, it } from 'vitest';
import { MEMO_INITIAL, memoData } from './data';
import { applyFormat, charCount, continueList, lineAt, mdLine, pvLine, segs, toggleCheck } from './memo';
import { candidates, parseCand, pickSuggestion, suggestionText, whenText } from './suggest';

const NOW = new Date(2026, 10, 19, 10, 24, 36); // 2026-11-19 (Thu) 10:24:36
const at = (mo: number, d: number, h = 0, m = 0, y = 2026): number => new Date(y, mo - 1, d, h, m).getTime();

describe('Markdown colour layer (mdLine)', () => {
  it('splits marker and text without changing the text length', () => {
    expect(mdLine('# 今日')).toEqual({ m: '# ', t: '今日', c: 'mh' });
    expect(mdLine('- [ ] 牛乳を買う')).toEqual({ m: '- [ ] ', t: '牛乳を買う', c: '' });
    expect(mdLine('  - [x] 済み')).toEqual({ m: '  - [x] ', t: '済み', c: 'mdn' });
    expect(mdLine('1. 一つめ')).toEqual({ m: '1. ', t: '一つめ', c: '' });
    expect(mdLine('> 引用')).toEqual({ m: '> ', t: '引用', c: 'mq' });
    expect(mdLine('週報は**金曜**まで')).toEqual({ m: '', t: '週報は**金曜**まで', c: '' });
    for (const ln of MEMO_INITIAL.split('\n')) { const l = mdLine(ln); expect(l.m + l.t).toBe(ln); }
  });
});

describe('preview (pvLine, segs, toggleCheck)', () => {
  it('kinds', () => {
    expect(pvLine('# A').k).toBe('h1');
    expect(pvLine('#### A').k).toBe('h3');
    expect(pvLine('- [ ] A')).toMatchObject({ k: 'ck', chk: true, done: false, al: 'A' });
    expect(pvLine('- [x] ')).toMatchObject({ k: 'ck on', done: true, al: 'チェック項目' });
    expect(pvLine('* A').k).toBe('li');
    expect(pvLine('> A').k).toBe('q');
    expect(pvLine('---').k).toBe('hr');
    expect(pvLine('text').k).toBe('p');
  });
  it('inline bold and code', () => {
    expect(segs('週報は**金曜**まで')).toEqual([{ t: '週報は', c: '' }, { t: '金曜', c: 'sb' }, { t: 'まで', c: '' }]);
    expect(segs('run `npm i`')).toEqual([{ t: 'run ', c: '' }, { t: 'npm i', c: 'sc' }]);
  });
  it('check toggles [ ] ⇄ [x] in the text', () => {
    expect(toggleCheck(MEMO_INITIAL, 1).split('\n')[1]).toBe('- [x] 牛乳を買う');
    expect(toggleCheck('- [X] a', 0)).toBe('- [ ] a');
    expect(toggleCheck('a', 5)).toBe('a');
  });
});

describe('Enter carries the list marker (continueList)', () => {
  it('continues bullets, checks (unchecked) and quotes', () => {
    expect(continueList('- a', 3)).toEqual({ value: '- a\n- ', a: 6, b: 6 });
    expect(continueList('- [x] a', 7)).toEqual({ value: '- [x] a\n- [ ] ', a: 14, b: 14 });
    expect(continueList('> q', 3)).toEqual({ value: '> q\n> ', a: 6, b: 6 });
    expect(continueList('  * b', 5)?.value).toBe('  * b\n  * ');
  });
  it('removes the marker on an empty item', () => {
    expect(continueList('- a\n- ', 6)).toEqual({ value: '- a\n', a: 4, b: 4 });
  });
  it('plain lines and selections are left to the browser', () => {
    expect(continueList('abc', 3)).toBeNull();
    expect(continueList('- abc', 2, 4)).toBeNull();
  });
});

describe('format buttons (applyFormat)', () => {
  it('heading cycles # → ## → ### → none', () => {
    let e = applyFormat('h', 'a', 1, 1);
    expect(e).toEqual({ value: '# a', a: 3, b: 3 });
    e = applyFormat('h', e.value, e.a, e.b);
    expect(e.value).toBe('## a');
    e = applyFormat('h', e.value, e.a, e.b);
    expect(e.value).toBe('### a');
    e = applyFormat('h', e.value, e.a, e.b);
    expect(e).toEqual({ value: 'a', a: 1, b: 1 });
  });
  it('line prefixes replace each other and toggle off', () => {
    expect(applyFormat('li', 'x\nab', 3, 3).value).toBe('x\n- ab');
    expect(applyFormat('ck', '- ab', 4, 4)).toEqual({ value: '- [ ] ab', a: 8, b: 8 });
    expect(applyFormat('ck', '- [ ] ab', 8, 8).value).toBe('ab');
    expect(applyFormat('q', '# ab', 4, 4).value).toBe('> ab');
  });
  it('bold and code wrap the selection', () => {
    expect(applyFormat('b', 'abc', 1, 2)).toEqual({ value: 'a**b**c', a: 3, b: 4 });
    expect(applyFormat('c', 'abc', 3, 3)).toEqual({ value: 'abc``', a: 4, b: 4 });
  });
  it('count and caret line', () => {
    expect(charCount('a b\nc')).toBe(3);
    expect(charCount(MEMO_INITIAL)).toBe(34);
    expect(lineAt('a\nb\nc', 3)).toBe(1);
  });
});

describe('かたまり recognition (仕様書 6章「メモから予定・TODOへ」)', () => {
  it('TODO: 未チェックの項目', () => {
    expect(parseCand('- [ ] 牛乳を買う', NOW)).toEqual({ kind: 'todo', title: '牛乳を買う' });
    expect(parseCand('  * [ ] 資料', NOW)).toEqual({ kind: 'todo', title: '資料' });
  });
  it('TODO: 行頭が「TODO」「やること」', () => {
    expect(parseCand('TODO: 請求書を送る', NOW)).toEqual({ kind: 'todo', title: '請求書を送る' });
    expect(parseCand('todo 掃除', NOW)).toEqual({ kind: 'todo', title: '掃除' });
    expect(parseCand('やること：洗濯', NOW)).toEqual({ kind: 'todo', title: '洗濯' });
  });
  it('checked items are not suggested (even with a date)', () => {
    expect(parseCand('- [x] 明日 14:00 打ち合わせ', NOW)).toBeNull();
  });
  it('予定: 今日・明日・明後日', () => {
    expect(parseCand('明日 14:00 打ち合わせ', NOW)).toEqual({ kind: 'ev', title: '打ち合わせ', ts: at(11, 20, 14), hasTime: true });
    expect(parseCand('今日 歯医者', NOW)).toEqual({ kind: 'ev', title: '歯医者', ts: at(11, 19), hasTime: false });
    expect(parseCand('明後日に出張', NOW)).toEqual({ kind: 'ev', title: '出張', ts: at(11, 21), hasTime: false });
  });
  it('予定: 11/20 と 11月20日', () => {
    expect(parseCand('11/20 歯医者', NOW)).toEqual({ kind: 'ev', title: '歯医者', ts: at(11, 20), hasTime: false });
    expect(parseCand('11月20日 歯医者', NOW)).toEqual({ kind: 'ev', title: '歯医者', ts: at(11, 20), hasTime: false });
    expect(parseCand('- 12/3 19:30 忘年会', NOW)).toEqual({ kind: 'ev', title: '忘年会', ts: at(12, 3, 19, 30), hasTime: true });
  });
  it('予定: 時刻 14:00・14時・14時半・14時15分 (日付が無ければ今日)', () => {
    expect(parseCand('14:00 会議', NOW)).toEqual({ kind: 'ev', title: '会議', ts: at(11, 19, 14), hasTime: true });
    expect(parseCand('14時 会議', NOW)).toMatchObject({ ts: at(11, 19, 14), hasTime: true });
    expect(parseCand('14時半 会議', NOW)).toMatchObject({ ts: at(11, 19, 14, 30), hasTime: true });
    expect(parseCand('14時15分から会議', NOW)).toMatchObject({ title: 'から会議', ts: at(11, 19, 14, 15) });
    expect(parseCand('14：00 全角コロン', NOW)).toMatchObject({ ts: at(11, 19, 14) });
  });
  it('「3時間」のような長さは除く', () => {
    expect(parseCand('3時間 作業する', NOW)).toBeNull();
    expect(parseCand('作業は3時間くらい', NOW)).toBeNull();
  });
  it('過ぎた日付は来年、ありえない日付・時刻は無視', () => {
    expect(parseCand('11/1 締め', NOW)).toMatchObject({ ts: at(11, 1, 0, 0, 2027) });
    expect(parseCand('11/18 昨日の件', NOW)).toMatchObject({ ts: at(11, 18) });
    expect(parseCand('13/40 何か', NOW)).toBeNull();
    expect(parseCand('25:00 遅番', NOW)).toBeNull();
    expect(parseCand('明日 25:00 遅番', NOW)).toEqual({ kind: 'ev', title: '遅番', ts: at(11, 20), hasTime: false });
  });
  it('title falls back to 予定 and strips joining particles', () => {
    expect(parseCand('明日 14:00', NOW)).toMatchObject({ title: '予定' });
    expect(parseCand('# 明日、ランチ', NOW)).toMatchObject({ title: 'ランチ' });
  });
  it('ordinary and vague lines are not recognised', () => {
    expect(parseCand('# 今日の気分', NOW)).toMatchObject({ kind: 'ev' }); // 「今日」を含む行は予定（仕様どおり）
    expect(parseCand('週報は**金曜**まで', NOW)).toBeNull();
    expect(parseCand('来週あたりに飲み会', NOW)).toBeNull();
    expect(parseCand('', NOW)).toBeNull();
  });
});

describe('suggestion (1件だけ、行を離れたら、行の文面で覚える)', () => {
  const lines = MEMO_INITIAL.split('\n');
  it('「# 今日」のような見出しの行も、日付を含めば (終日) 予定として認識する（見出しを候補から外さない。プロトタイプどおり）', () => {
    const c = candidates(['# 今日', '- [ ] 牛乳を買う'], {}, NOW);
    expect(c.map(x => x?.kind ?? null)).toEqual(['ev', 'todo']);
    expect(pickSuggestion(c, -1)).toMatchObject({ kind: 'ev', title: '予定', i: 0, key: '# 今日', hasTime: false });
    const c2 = candidates(['# 今日', '- [ ] 牛乳を買う'], { '# 今日': 'skip' }, NOW);
    expect(pickSuggestion(c2, -1)).toMatchObject({ kind: 'todo', title: '牛乳を買う', i: 1, key: '- [ ] 牛乳を買う' });
  });
  it('initial memo: the heading 「# メモ」 is not a candidate; the first suggestion is the next recognised line', () => {
    const c = candidates(lines, {}, NOW);
    expect(lines[0]).toBe('# メモ');
    expect(c.map(x => x?.kind ?? null)).toEqual([null, 'todo', 'ev', null]);
    expect(pickSuggestion(c, -1)).toMatchObject({ kind: 'todo', title: '牛乳を買う', i: 1, key: '- [ ] 牛乳を買う' });
    // 次の行を答えると、「明日 14:00 打ち合わせ」が提案になる
    const c2 = candidates(lines, { '- [ ] 牛乳を買う': 'skip' }, NOW);
    const s2 = pickSuggestion(c2, -1);
    expect(s2).toMatchObject({ kind: 'ev', title: '打ち合わせ', i: 2, ts: at(11, 20, 14), hasTime: true });
    expect(s2 && suggestionText(s2, NOW)).toBe('明日 14:00　打ち合わせ');
  });
  it('the caret line is skipped', () => {
    const c = candidates(['- [ ] a', '明日 14:00 打ち合わせ'], {}, NOW);
    expect(pickSuggestion(c, 0)?.i).toBe(1);
    expect(pickSuggestion(c, 1)?.i).toBe(0);
  });
  it('answered lines (追加／追加しない) are remembered by their text', () => {
    const c = candidates(['- [ ] a', '  明日 14:00 打ち合わせ  '], { '- [ ] a': 'skip', '明日 14:00 打ち合わせ': 'add' }, NOW);
    expect(c[0]?.state).toBe('skip');
    expect(c[1]?.state).toBe('add');
    expect(pickSuggestion(c, -1)).toBeNull();
  });
  it('texts', () => {
    expect(whenText(at(11, 20, 14), true, NOW)).toBe('明日 14:00');
    expect(whenText(at(11, 19), false, NOW)).toBe('今日');
    expect(whenText(at(11, 25, 9, 5), true, NOW)).toBe('11.25 09:05');
    const c = candidates(['明日 14:00 打ち合わせ'], {}, NOW)[0];
    expect(c && suggestionText(c, NOW)).toBe('明日 14:00　打ち合わせ');
  });
});

describe('memo data', () => {
  it('initial text and sanitize', () => {
    expect(memoData.initial(0)).toEqual({ text: '# メモ\n- [ ] 牛乳を買う\n明日 14:00 打ち合わせ\n週報は**金曜**まで', done: {} });
    expect(memoData.sanitize({ text: 'a', done: { x: 'add', y: 'nope', z: 1 }, extra: 1 }, 0)).toEqual({ text: 'a', done: { x: 'add' } });
    expect(memoData.sanitize({ text: 1 }, 0)).toBeNull();
    expect(memoData.sanitize('a', 0)).toBeNull();
  });
});
