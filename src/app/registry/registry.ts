/**
 * Widget registry (登録表). Values are ported from the prototype
 * (design/claude-design/Main.dc.html, `R()` and `META`). See 実装ガイド 4章「登録の項目」.
 *
 * - `s` default size [cols, rows], `min`/`max` size limits, `pg` can go full-screen,
 *   `ts` temporary-use size, `vd` input-first (front display on phones), `multi` can be placed multiple times,
 *   `net` network kind, `perm` permissions, `f` per-widget settings fields.
 * - `REGISTRY_ORDER` is the catalog order (5 categories + local AI); `DEFAULT_ORDER` is the board order.
 */
export type FieldType = 'tg' | 'sg' | 'st' | 'rg' | 'tx' | 'tm' | 'dt';
export type FieldValue = string | number | boolean;
export type Field = Readonly<{
  k: string;
  t: FieldType;
  l: string;
  d: FieldValue;
  o?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
  u?: string;
}>;
export type Category = '時間' | '予定と記録' | '情報' | '道具' | 'ローカルAI' | 'データ表示';
export type NetKind = '' | 'data' | 'dl' | 'own';
export type Permission = 'geo' | 'notify' | 'mic' | 'clipboard';
export type Size = readonly [number, number];

export type WidgetDef = Readonly<{
  id: string;
  n: string;
  cat: Category;
  kw: string;
  s: Size;
  min: Size;
  max: Size;
  pg: boolean;
  ts?: Size;
  vd: boolean;
  multi: boolean;
  net: NetKind;
  perm: readonly Permission[];
  f: readonly Field[];
}>;

type Base = { n: string; s: Size; f: readonly Field[]; pg?: boolean; ts?: Size; vd?: boolean };
type Meta = readonly [Category, number, number, string, string];

const weekStart: Field = { k: 'start', t: 'sg', l: '週の始まり', o: ['月', '日'], d: '月' };

/** `y` is the current year (countdown default date). */
function base(y: number): Record<string, Base> {
  return {
    clock: { n: '時計', pg: true, s: [2, 1], f: [{ k: 'sec', t: 'tg', l: '秒を表示', d: true }, { k: 'h12', t: 'tg', l: '12時間表示', d: false }] },
    weather: { n: '天気', s: [2, 1], f: [{ k: 'unit', t: 'sg', l: '単位', o: ['°C', '°F'], d: '°C' }] },
    rain: { n: '傘', s: [2, 1], f: [{ k: 'demo', t: 'sg', l: 'サンプル', o: ['あとで降る', 'いま雨', '降らない'], d: 'あとで降る' }] },
    sun: { n: '日の出・日の入り', s: [2, 1], f: [{ k: 'loc', t: 'sg', l: '場所', o: ['東京', '大阪', '札幌', '福岡', '那覇', '現在地'], d: '東京' }] },
    gantt: { n: 'タイムスケジュール', s: [4, 1], f: [{ k: 'now', t: 'tg', l: '現在時刻の線', d: true }] },
    todo: { n: 'TODO', vd: true, s: [2, 2], f: [{ k: 'hide', t: 'tg', l: '完了を隠す', d: false }, { k: 'bar', t: 'tg', l: '定型ボタンを表示', d: false }] },
    agenda: { n: '予定', vd: true, s: [2, 2], f: [] },
    music: { n: 'ミュージック', s: [2, 2], f: [] },
    month: { n: '月間カレンダー', s: [2, 2], f: [weekStart] },
    habit: { n: 'ハビット', s: [2, 1], f: [{ k: 'notify', t: 'tg', l: '達成を通知', d: true }] },
    pomo: { n: 'ポモドーロ', s: [2, 1], f: [{ k: 'min', t: 'st', l: '集中する時間', min: 5, max: 90, step: 5, d: 25, u: '分' }, { k: 'notify', t: 'tg', l: '完了を通知', d: true }] },
    week: { n: '週間カレンダー', s: [4, 1], f: [weekStart] },
    links: { n: 'クイックリンク', s: [2, 1], f: [] },
    today: { n: '今日は何の日', s: [2, 1], f: [] },
    alarm: { n: 'アラーム', s: [2, 1], f: [{ k: 'a1', t: 'tm', l: 'アラーム1の時刻', d: '07:00' }, { k: 'a2', t: 'tm', l: 'アラーム2の時刻', d: '22:30' }] },
    toast: { n: 'トースト通知', s: [2, 1], f: [{ k: 'pos', t: 'sg', l: '表示位置', o: ['上', '下'], d: '上' }, { k: 'dur', t: 'st', l: '表示秒数', min: 2, max: 8, d: 3, u: '秒' }] },
    bar: { n: '棒グラフ', s: [3, 2], f: [] },
    github: { n: 'GitHub PR', s: [3, 2], f: [] },
    calc: { n: '電卓', s: [2, 3], f: [] },
    rss: { n: 'RSS', s: [3, 3], f: [] },
    color: { n: 'カラーピッカー', s: [3, 2], f: [] },
    memo: { n: 'メモ', vd: true, s: [2, 2], f: [{ k: 'size', t: 'st', l: '文字サイズ', min: 12, max: 20, d: 14, u: 'px' }, { k: 'bar', t: 'tg', l: '書式ボタンを表示', d: true }, { k: 'count', t: 'tg', l: '文字数を表示', d: false }, { k: 'expand', t: 'tg', l: 'スマホで入力時に前面表示', d: true }] },
    pie: { n: '円グラフ', s: [2, 1], f: [] },
    donut: { n: 'ドーナツグラフ', s: [1, 1], f: [] },
    search: { n: '検索', s: [3, 1], f: [{ k: 'eng', t: 'sg', l: '検索先', o: ['Google', 'Bing', 'DuckDuckGo', 'Yahoo!'], d: 'Google' }, { k: 'url', t: 'tx', l: '独自の検索URL（%s が検索語）', d: '' }, { k: 'tab', t: 'tg', l: '新しいタブで開く', d: false }] },
    heat: { n: 'ヒートマップ', s: [3, 1], f: [] },
    counter: { n: 'カウンター', s: [2, 2], f: [{ k: 'step', t: 'sg', l: 'ステップ', o: ['1', '5', '10'], d: '1' }] },
    slides: { n: 'スライドショー', s: [2, 2], f: [{ k: 'auto', t: 'tg', l: '自動再生', d: true }, { k: 'sec', t: 'st', l: '間隔', min: 2, max: 10, d: 4, u: '秒' }] },
    clip: { n: 'クリップボード', vd: true, s: [2, 2], f: [] },
    convert: { n: '単位換算', s: [2, 2], f: [] },
    stopwatch: { n: 'ストップウォッチ', s: [2, 2], f: [] },
    world: { n: '世界時計', s: [2, 1], f: [] },
    sketch: { n: 'スケッチ', vd: true, pg: true, s: [2, 2], f: [{ k: 'bar', t: 'tg', l: 'ツールバーを表示', d: true }] },
    pass: { n: 'パスワード生成', s: [2, 2], f: [] },
    line: { n: '折れ線グラフ', s: [2, 1], f: [] },
    meter: { n: 'メーター', s: [2, 1], f: [] },
    countdown: { n: 'カウントダウン', s: [2, 1], f: [{ k: 'label', t: 'tx', l: '名前', d: '年末まで' }, { k: 'date', t: 'dt', l: '日付', d: String(y) + '-12-31' }] },
    dice: { n: 'サイコロ', s: [1, 1], f: [{ k: 'sides', t: 'sg', l: '面の数', o: ['6', '10', '20'], d: '6' }] },
    timelog: { n: 'タイムログ', vd: true, s: [2, 3], f: [{ k: 'sec', t: 'tg', l: '秒まで記録', d: false }, { k: 'bar', t: 'tg', l: '定型ボタンを表示', d: true }] },
    punch: { n: '打刻', s: [2, 2], f: [{ k: 'log', t: 'tg', l: 'タイムログにも記録', d: true }] },
    mixer: { n: '環境音ミキサー', s: [2, 2], f: [] },
    quote: { n: '名言', s: [2, 1], f: [] },
    recorder: { n: '録音', s: [2, 2], f: [] },
    share: { n: '受け渡し', vd: true, s: [2, 3], f: [] },
    split: { n: '割り勘', s: [2, 2], f: [{ k: 'mode', t: 'sg', l: '端数の扱い', o: ['多めに集める', '幹事が払う'], d: '多めに集める' }] },
    tax: { n: '税込・税抜', s: [2, 2], f: [{ k: 'rates', t: 'tx', l: '税率（%、カンマ区切り）', d: '10, 8' }, { k: 'round', t: 'sg', l: '1円未満', o: ['切り捨て', '四捨五入', '切り上げ'], d: '切り捨て' }] },
    table: { n: '表', vd: true, s: [3, 3], f: [] },
    script: { n: 'スクリプト', vd: true, s: [3, 3], ts: [5, 4], f: [{ k: 'limit', t: 'sg', l: '実行時間の上限', o: ['5秒', '10秒', '60秒', 'なし'], d: '10秒' }] },
    imgconv: { n: '画像変換', s: [2, 2], f: [{ k: 'fmt', t: 'sg', l: '形式', o: ['WebP', 'JPEG', 'PNG', 'AVIF'], d: 'WebP' }, { k: 'q', t: 'rg', l: '品質', min: 40, max: 100, d: 80 }, { k: 'max', t: 'sg', l: '長辺(px)', o: ['元のまま', '2048', '1280', '800'], d: '元のまま' }] },
    translate: { n: '翻訳', vd: true, s: [2, 2], f: [{ k: 'tone', t: 'sg', l: '文体', o: ['自然', '丁寧', '簡潔'], d: '自然' }, { k: 'bar', t: 'tg', l: '補助ボタンを表示', d: true }, { k: 'expand', t: 'tg', l: 'スマホで入力時に前面表示', d: true }] },
    chat: { n: 'AIチャット', vd: true, s: [2, 3], f: [{ k: 'len', t: 'sg', l: '応答の長さ', o: ['短め', '普通', '長め'], d: '普通' }, { k: 'keep', t: 'tg', l: '会話を保存', d: true }, { k: 'bar', t: 'tg', l: '定型ボタンを表示', d: true }, { k: 'expand', t: 'tg', l: 'スマホで入力時に前面表示', d: true }] },
  };
}

/** Catalog metadata: [category, minCols, minRows, flags, search keywords]. Order = catalog order. */
const META: Readonly<Record<string, Meta>> = {
  clock: ['時間', 1, 1, 'm', 'とけい クロック 時刻 じかん'], world: ['時間', 2, 1, 'm', 'せかいどけい タイムゾーン 時差'], alarm: ['時間', 1, 1, 'p:notify', 'あらーむ 目覚まし'], pomo: ['時間', 1, 1, 'p:notify', 'ぽもどーろ 集中 タイマー'], stopwatch: ['時間', 1, 1, '', 'すとっぷうぉっち 計測 タイマー'], countdown: ['時間', 1, 1, 'm', 'かうんとだうん 残り日数 記念日'], timelog: ['時間', 2, 2, '', 'たいむろぐ 記録 作業'], punch: ['時間', 2, 1, '', 'だこく 出勤 勤怠'], gantt: ['時間', 3, 1, '', 'たいむすけじゅーる ガント 予定'],
  todo: ['予定と記録', 2, 2, '', 'とぅどぅ やること タスク'], agenda: ['予定と記録', 2, 1, '', 'よてい 予定表 カレンダー'], month: ['予定と記録', 2, 2, '', 'げっかん カレンダー 月'], week: ['予定と記録', 3, 1, '', 'しゅうかん カレンダー 週'], habit: ['予定と記録', 1, 1, 'm p:notify', 'はびっと 習慣'], memo: ['予定と記録', 2, 1, 'm', 'めも ノート'], counter: ['予定と記録', 2, 1, 'm', 'かうんたー 数える'], recorder: ['予定と記録', 2, 1, 'p:mic', 'ろくおん 録音 マイク ボイスメモ'], sketch: ['予定と記録', 2, 2, '', 'すけっち 手書き お絵かき'],
  search: ['情報', 2, 1, '', 'けんさく 検索 グーグル'], weather: ['情報', 1, 1, 'n p:geo', 'てんき 気温'], rain: ['情報', 2, 1, 'n p:geo', 'かさ 雨 降水'], sun: ['情報', 2, 1, 'm p:geo', 'ひので ひのいり 日の出'], links: ['情報', 2, 1, 'm', 'くいっくりんく ブックマーク リンク'], rss: ['情報', 2, 2, 'n m', 'あーるえすえす フィード ニュース'], github: ['情報', 2, 2, 'n', 'ぎっとはぶ プルリクエスト PR'], today: ['情報', 2, 1, 'n', 'きょうはなんのひ 記念日'], quote: ['情報', 2, 1, '', 'めいげん ことば'],
  share: ['道具', 2, 2, 'n:own p:clipboard', 'うけわたし 送る 共有 端末'], calc: ['道具', 2, 2, '', 'でんたく 計算'], split: ['道具', 2, 2, '', 'わりかん 割り勘 精算'], tax: ['道具', 2, 2, '', 'ぜいこみ 消費税 税抜'], table: ['道具', 2, 2, 'm', 'ひょう 表計算 テーブル'], script: ['道具', 2, 2, 'm', 'すくりぷと JavaScript ブックマークレット'], imgconv: ['道具', 2, 2, '', 'がぞうへんかん 画像 WebP 圧縮'], convert: ['道具', 2, 2, '', 'たんいかんさん 単位 換算'], pass: ['道具', 2, 2, '', 'ぱすわーど 生成'], color: ['道具', 2, 2, '', 'からーぴっかー 色'], clip: ['道具', 2, 2, 'p:clipboard', 'くりっぷぼーど コピー 履歴'], dice: ['道具', 1, 1, '', 'さいころ ダイス 乱数'], mixer: ['道具', 2, 1, '', 'かんきょうおん 環境音 ホワイトノイズ'], music: ['道具', 2, 1, '', 'みゅーじっく 音楽 再生'], slides: ['道具', 2, 1, '', 'すらいどしょー 写真'], toast: ['道具', 2, 1, '', 'とーすと 通知'],
  chat: ['ローカルAI', 2, 2, 'n:dl', 'えーあい チャット 生成AI'], translate: ['ローカルAI', 2, 2, 'n:dl', 'ほんやく 翻訳 英語'],
  bar: ['データ表示', 2, 1, 'm', 'ぼうぐらふ 棒グラフ チャート'], line: ['データ表示', 2, 1, 'm', 'おれせんぐらふ 折れ線 推移'], pie: ['データ表示', 2, 1, 'm', 'えんぐらふ 円グラフ 割合'], donut: ['データ表示', 1, 1, 'm', 'どーなつぐらふ 進み具合'], heat: ['データ表示', 3, 1, 'm', 'ひーとまっぷ 草 活動'], meter: ['データ表示', 1, 1, 'm', 'めーたー 使用率'],
};

export function buildRegistry(year: number): Readonly<Record<string, WidgetDef>> {
  const b = base(year);
  const out: Record<string, WidgetDef> = {};
  for (const [id, r] of Object.entries(b)) {
    const m = META[id];
    if (!m) throw new Error('META missing for ' + id);
    const flags = m[3].split(' ').filter(Boolean);
    const nf = flags.find(x => x === 'n' || x.startsWith('n:'));
    const def: WidgetDef = {
      id, n: r.n, cat: m[0], kw: m[4], s: r.s, min: [m[1], m[2]], max: [4, 3],
      pg: !!r.pg, vd: !!r.vd, multi: flags.includes('m'),
      net: (nf ? (nf === 'n' ? 'data' : nf.slice(2)) : '') as NetKind,
      perm: flags.filter(x => x.startsWith('p:')).map(x => x.slice(2) as Permission),
      f: r.f,
      ...(r.ts ? { ts: r.ts } : {}),
    };
    out[id] = def;
  }
  return out;
}

export const REGISTRY = buildRegistry(new Date().getFullYear());
/** Catalog order (ウィジェットを追加の一覧). */
export const REGISTRY_ORDER: readonly string[] = Object.keys(META);
/** Default board order (prototype `Object.keys(R())`). */
export const DEFAULT_ORDER: readonly string[] = Object.keys(REGISTRY);
export const CATEGORIES: readonly Category[] = ['時間', '予定と記録', '情報', '道具', 'ローカルAI', 'データ表示'];
export const STARTER: readonly string[] = ['clock', 'search', 'weather', 'rain', 'todo', 'links', 'memo'];

export function widgetDef(id: string): WidgetDef {
  const def = REGISTRY[id];
  if (!def) throw new Error('Unknown widget ' + id);
  return def;
}

export function fieldDefault(id: string, key: string): FieldValue | undefined {
  return widgetDef(id).f.find(f => f.k === key)?.d;
}
