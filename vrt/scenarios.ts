// 再現度テストのシナリオ（状態）定義。
// 操作手順はプロトタイプと本実装で共通のセレクタ（クラス名・aria-label・ボタンの文言）だけで書く。
// 保存データ（seed）は対象に依存しない形で書き、対象ごとの localStorage への変換は lib/targets.ts が行う。
import type { Scenario, Step, ViewportName } from './lib/types.ts';

/** よく使うセレクタ。本実装もこのクラス名・aria-label にそろえる */
export const SEL = {
  nav: '.nav .nbar',
  navIndex: '.nav button[aria-label^="ウィジェット一覧"]',
  navEdit: '.nav button[aria-label="ウィジェットを編集"]',
  navGlobal: '.nav button[aria-label="全体の設定"]',
  todo: '.w[data-w="todo"]',
  clock: '.w[data-w="clock"]',
  tourCard: '.tcard.open[role="dialog"]',
  menu: '.mnuw.open .mnu',
  menuRemove: '.mnuw.open .mnu [role="menuitem"]:has-text("ボードから外す")',
  sheetGlobal: '.sheet.open[aria-label="全体の設定"]',
  sheetIndex: '.sheet.open[aria-label="ウィジェット一覧"]',
  sheetAdd: '.sheet.open[aria-label="ウィジェットを追加"]',
  sheetWidget: '.sheet.open[aria-label="ウィジェットの設定"]',
  sheetHelp: '.sheet.open[aria-label="操作ヒント"]',
  sheetDevices: '.sheet.open[aria-label="端末をつなぐ"]',
  editBar: '.nav .ebar',
  dialog: '.dlg.open[role="alertdialog"]',
  toast: '.toasts .toast',
  dotClock: '.nav .dot[aria-label="時計"]',
  fullClock: '.fsw[data-w="clock"]',
} as const;

/** 案内を見終えた状態 */
const DONE = { tourDone: true };

const openGlobal: Step[] = [
  { do: 'click', sel: SEL.navGlobal, note: '下部バーの「全体の設定」' },
  { do: 'waitFor', sel: SEL.sheetGlobal },
];

const openMenu: Step[] = [
  { do: 'menu', sel: SEL.todo, note: 'desktop は右クリック、mobile は 0.9 秒長押し（判定は 0.7 秒）' },
  { do: 'waitFor', sel: SEL.menu },
];

const openEdit: Step[] = [
  { do: 'click', sel: SEL.navEdit, note: '下部バーの編集ボタン' },
  { do: 'waitFor', sel: SEL.editBar },
];

export const scenarios: Scenario[] = [
  {
    name: 'home-tour',
    title: '初回起動。5手順の案内の1手順目',
    seed: null,
    ready: SEL.tourCard,
  },
  {
    name: 'home',
    title: '案内を見終えたホーム',
    seed: DONE,
  },
  {
    name: 'menu',
    title: 'TODO ウィジェットのその他メニュー',
    seed: DONE,
    steps: openMenu,
    ready: SEL.menu,
  },
  {
    name: 'settings',
    title: '全体の設定シート',
    seed: DONE,
    steps: openGlobal,
    ready: SEL.sheetGlobal,
  },
  {
    name: 'index',
    title: 'ウィジェット一覧シート',
    seed: DONE,
    steps: [
      { do: 'click', sel: SEL.navIndex, note: '下部バーの一覧ボタン' },
      { do: 'waitFor', sel: SEL.sheetIndex },
    ],
    ready: SEL.sheetIndex,
  },
  {
    name: 'add',
    title: '「ウィジェットを追加」シート（一覧から）',
    seed: DONE,
    steps: [
      { do: 'click', sel: SEL.navIndex },
      { do: 'waitFor', sel: SEL.sheetIndex },
      { do: 'click', sel: `${SEL.sheetIndex} button:has-text("ウィジェットを追加")` },
      { do: 'waitFor', sel: SEL.sheetAdd },
    ],
    ready: SEL.sheetAdd,
  },
  {
    name: 'edit',
    title: '編集モード',
    seed: DONE,
    steps: openEdit,
    ready: SEL.editBar,
  },
  {
    name: 'widget-settings',
    title: '編集モードで TODO をタップした「ウィジェットの設定」',
    seed: DONE,
    steps: [...openEdit, { do: 'click', sel: SEL.todo, note: '編集モード中の TODO' }, { do: 'waitFor', sel: SEL.sheetWidget }],
    ready: SEL.sheetWidget,
  },
  {
    name: 'help',
    title: '全体の設定 → 操作ヒント',
    seed: DONE,
    steps: [...openGlobal, { do: 'click', sel: `${SEL.sheetGlobal} button:has-text("操作ヒント")` }, { do: 'waitFor', sel: SEL.sheetHelp }],
    ready: SEL.sheetHelp,
  },
  {
    name: 'dialog',
    title: '確認ダイアログ（全体の設定 → 端末をつなぐ → 解除）',
    seed: DONE,
    steps: [
      ...openGlobal,
      { do: 'click', sel: `${SEL.sheetGlobal} button:has-text("端末をつなぐ")` },
      { do: 'waitFor', sel: SEL.sheetDevices },
      { do: 'click', sel: `${SEL.sheetDevices} button:has-text("解除")`, note: '1台目（iPhone）の解除' },
      { do: 'waitFor', sel: SEL.dialog },
    ],
    ready: SEL.dialog,
  },
  {
    name: 'toast',
    title: '元に戻す付きトースト（その他メニュー → ボードから外す）',
    seed: DONE,
    steps: [...openMenu, { do: 'click', sel: SEL.menuRemove }, { do: 'waitFor', sel: SEL.toast }],
    ready: `${SEL.toast} button`,
  },
  {
    name: 'fullscreen-clock',
    title: '時計を全画面にした画面（seed pgW.clock → 下部バーの「時計」の点で移動）',
    seed: { ...DONE, pgW: { clock: true } },
    steps: [{ do: 'click', sel: SEL.dotClock, note: '全画面ページの点（aria-label="時計"）' }, { do: 'wait', ms: 600 }],
    ready: SEL.fullClock,
  },
];

// ---------------------------------------------------------------- P2a（分類「時間」）

/**
 * P2a の8種だけを「ボード 1」に置いた seed。order にないウィジェットは両対象とも「外す」になる
 * （プロトタイプの sane()・本実装の sanitizeGlobal() とも、order と off があれば order にない種類を off にする）。
 * place は8種とも g0 を明示する（世界時計・打刻などは既定の置き場所が別ボードのため）。
 *
 * desktop（8列×5行）: 1行目 タイムスケジュール(4×1)・世界時計・アラーム / 2行目 ポモドーロ・カウントダウン・
 *   ストップウォッチ(2×2)・打刻(2×2) / 3〜5行目 タイムログ(2×3)。1画面に8種がすべて入る。
 * mobile（2列×5行）: 3ページに分かれる。1ページ目 タイムスケジュール・世界時計・アラーム・ポモドーロ・カウントダウン /
 *   2ページ目 ストップウォッチ・打刻 / 3ページ目 タイムログ。
 */
export const P2A_ORDER = ['gantt', 'world', 'alarm', 'pomo', 'countdown', 'stopwatch', 'punch', 'timelog'] as const;
const P2A_BOARD = {
  ...DONE,
  groups: [{ id: 'g0', n: 'ボード 1' }],
  order: [...P2A_ORDER],
  off: {},
  place: Object.fromEntries(P2A_ORDER.map((id) => [id, 'g0'])),
};

const w = (kind: string): string => `.w[data-w="${kind}"]`;
/** 下部バーのページの点（ボードが複数ページのとき「ボード 1の2」など） */
const dotPage = (n: number): string => `.nav .dot[aria-label="ボード 1の${n}"]`;
/** mobile だけ n ページ目へ移る（点をタップ → スクロールの終わりを待つ） */
const goPageOnMobile = (vp: ViewportName, n: number): Step[] =>
  vp === 'mobile' ? [{ do: 'click', sel: dotPage(n), note: `下部バーの点で ${n} ページ目へ` }, { do: 'wait', ms: 1000, note: 'スムーズスクロールの終わり' }] : [];

const P2A_MOBILE_ONLY = 'desktop は p2a-board の1画面に8種がすべて写るので、mobile の2・3ページ目だけを撮る';

/**
 * 打刻は利用者の決定（2026-11-27、docs/lgd/p2a-followup.md 4章）でセッションと業務の種類に作り直し、プロトタイプと見た目が違う。
 * 打刻が写る画面では、打刻の範囲を両対象とも同じ色で覆い隠して比べる（基準画像もプロトタイプから覆って撮る）。
 * 打刻の新しい見た目は Storybook（PunchWidget）と e2e（e2e/punch.spec.ts）で確かめる。
 * p2a-pomo-settings は打刻がシートの下に隠れているので覆わない（覆うとシートの中身まで塗ってしまう）。
 */
const PUNCH_MASK = [w('punch')];
const PUNCH_MASK_NOTE = '打刻は利用者の決定で作り直したため（p2a-followup.md 4章）、両対象で覆い隠して比べる';

export const p2aScenarios: Scenario[] = [
  {
    name: 'p2a-board',
    title: 'P2a: 時間の8種を1枚のボードに置いた状態（mobile は1ページ目）',
    seed: P2A_BOARD,
    ready: w('gantt'),
    mask: PUNCH_MASK,
    maskNote: PUNCH_MASK_NOTE,
  },
  {
    name: 'p2a-board-2',
    title: 'P2a: 同じボードの2ページ目（mobile。ストップウォッチ・打刻）',
    seed: P2A_BOARD,
    viewports: ['mobile'],
    skipNote: P2A_MOBILE_ONLY,
    steps: (vp) => goPageOnMobile(vp, 2),
    ready: w('stopwatch'),
    mask: PUNCH_MASK,
    maskNote: PUNCH_MASK_NOTE,
  },
  {
    name: 'p2a-board-3',
    title: 'P2a: 同じボードの3ページ目（mobile。タイムログ）',
    seed: P2A_BOARD,
    viewports: ['mobile'],
    skipNote: P2A_MOBILE_ONLY,
    steps: (vp) => goPageOnMobile(vp, 3),
    ready: w('timelog'),
  },
  {
    name: 'p2a-pomo-settings',
    title: 'P2a: 編集モードでポモドーロをタップした「ウィジェットの設定」（集中する時間・完了を通知）',
    seed: P2A_BOARD,
    steps: [...openEdit, { do: 'click', sel: w('pomo'), note: '編集モード中のポモドーロ' }, { do: 'waitFor', sel: SEL.sheetWidget }],
    ready: SEL.sheetWidget,
  },
  {
    name: 'p2a-punch-in',
    title: 'P2a: 打刻で「出勤」し、ストップウォッチをスタートした状態（タイムログにも「出勤」が入る）',
    seed: P2A_BOARD,
    steps: (vp) => [
      ...goPageOnMobile(vp, 2),
      { do: 'click', sel: `${w('punch')} button:has-text("出勤")`, note: '打刻の「出勤」（10:24 に出勤、勤務 0:00:00）' },
      { do: 'click', sel: `${w('stopwatch')} button[aria-label="スタート・ストップ"]`, note: '時刻固定なので 00:00.0 のまま走行中の表示になる' },
      { do: 'mouseAway' },
      { do: 'waitFor', sel: SEL.toast, state: 'detached', timeout: 15000, note: '「出勤 10:24」のトーストが消えるまで待つ（本実装は「元に戻す」付きで 10 秒。プロトタイプは 3 秒）' },
    ],
    ready: (vp) => (vp === 'mobile' ? w('punch') : w('timelog')),
    mask: PUNCH_MASK,
    maskNote: PUNCH_MASK_NOTE,
  },
];

scenarios.push(...p2aScenarios);

// ---------------------------------------------------------------- P2b（分類「予定と記録」）

/**
 * P2b の7種だけを「ボード 1」に置いた seed（作り方は P2A_BOARD と同じ）。
 * place は7種とも g0 を明示する（スケッチの既定は g2、カウンター・録音の既定は g3 のため）。
 * 記録（予定・ハビットの項目・カウンター）は seed せず、両対象の既定の見本のまま撮る。
 *
 * desktop（8列×5行）: 1行目 週間カレンダー(4×1)・予定(2×2)・月間カレンダー(2×2) / 2行目 ハビット(2×1)・カウンター(2×2) /
 *   3〜4行目 録音(2×2)・スケッチ(2×2)。1画面に7種がすべて入る（実際の配置は docs/lgd/vrt.md の表）。
 * mobile（2列×5行）: 3ページに分かれる。1ページ目 週間カレンダー(2×1 に縮む)・予定・月間カレンダー /
 *   2ページ目 ハビット・カウンター・録音 / 3ページ目 スケッチ。
 */
export const P2B_ORDER = ['week', 'agenda', 'month', 'habit', 'counter', 'recorder', 'sketch'] as const;
const P2B_BOARD = {
  ...DONE,
  groups: [{ id: 'g0', n: 'ボード 1' }],
  order: [...P2B_ORDER],
  off: {},
  place: Object.fromEntries(P2B_ORDER.map((id) => [id, 'g0'])),
};

/**
 * スケッチの全画面ページ。線は mobile でもマウス（pointerType mouse）で描く。プロトタイプは `.dash *{touch-action:manipulation}` が
 * 後から当たって全画面の面 `.fsw-surf{touch-action:none}` を打ち消しており、タッチで描くと 16px ほど動いた所でブラウザがパンを始めて
 * pointercancel になり、線が途切れる（2026-11-27 に確認。ウィジェットの中の手書きパッドは style で none なので途切れない）。
 * プロトタイプの不具合を基準にしないため、touch-action に左右されないマウスで描く。
 */
const SKETCH_FULL = '.fsw[data-w="sketch"]';
/**
 * 全画面のスケッチに描く2筆（ページの中心からの px）。何も描かない全画面のスケッチはほぼ無地で、本実装が「準備中です」でも
 * 合格ラインを越えてしまう（2026-11-27 に desktop で SSIM 0.966 を確認）ので、描いた線で比べる。
 * 線分は水平・垂直・45° だけにして、点の座標の丸め方（プロトタイプは小数1桁）で線が揺れないようにする。
 * 幅は mobile（390px）にも入る ±150px、下の帯（ペンの選択）より上に収める。
 */
const SKETCH_STROKE_1: [number, number][] = [
  [-150, -150],
  [-75, -75],
  [0, -150],
  [75, -75],
  [150, -150],
];
const SKETCH_STROKE_2: [number, number][] = [
  [-150, 20],
  [150, 20],
  [50, 120],
  [-150, 120],
];

const P2B_MOBILE_ONLY ='desktop は p2b-board の1画面に7種がすべて写るので、mobile の2・3ページ目だけを撮る';

export const p2bScenarios: Scenario[] = [
  {
    name: 'p2b-board',
    title: 'P2b: 予定と記録の7種を1枚のボードに置いた状態（mobile は1ページ目）',
    seed: P2B_BOARD,
    ready: w('week'),
  },
  {
    name: 'p2b-board-2',
    title: 'P2b: 同じボードの2ページ目（mobile。ハビット・カウンター・録音）',
    seed: P2B_BOARD,
    viewports: ['mobile'],
    skipNote: P2B_MOBILE_ONLY,
    steps: (vp) => goPageOnMobile(vp, 2),
    ready: w('counter'),
  },
  {
    name: 'p2b-board-3',
    title: 'P2b: 同じボードの3ページ目（mobile。スケッチ）',
    seed: P2B_BOARD,
    viewports: ['mobile'],
    skipNote: P2B_MOBILE_ONLY,
    steps: (vp) => goPageOnMobile(vp, 3),
    ready: w('sketch'),
  },
  {
    name: 'p2b-counter-delete',
    title: 'P2b: カウンターの「項目を削除するモード」（各項目に削除ボタン、増減の操作が消える）',
    seed: P2B_BOARD,
    steps: (vp) => [
      ...goPageOnMobile(vp, 2),
      { do: 'click', sel: `${w('counter')} button[aria-label="項目を削除するモード"]`, note: 'カウンター下部の帯のごみ箱' },
      { do: 'waitFor', sel: `${w('counter')} button[aria-label="水 を削除"]`, note: '1件目「水」の削除ボタン' },
      { do: 'mouseAway' },
    ],
    ready: `${w('counter')} button[aria-label="項目を削除するモード"][aria-pressed="true"]`,
  },
  {
    name: 'p2b-habit-settings',
    title: 'P2b: 編集モードでハビットをタップした「ウィジェットの設定」（項目の編集・達成を通知）',
    seed: P2B_BOARD,
    steps: (vp) => [
      ...goPageOnMobile(vp, 2),
      ...openEdit,
      { do: 'click', sel: w('habit'), note: '編集モード中のハビット' },
      { do: 'waitFor', sel: SEL.sheetWidget },
      // mobile のシートは「項目」の一覧が下に隠れるので、「項目を追加」まで送って項目の編集を写す（desktop は最初から全部写る）
      ...(vp === 'mobile'
        ? ([
            { do: 'scrollIntoView', sel: `${SEL.sheetWidget} button:has-text("項目を追加")`, note: 'シートの中を「項目を追加」までスクロール' },
            { do: 'wait', ms: 600, note: 'スクロールの終わり' },
          ] satisfies Step[])
        : []),
    ],
    ready: SEL.sheetWidget,
  },
  {
    name: 'p2b-sketch-full',
    title: 'P2b: スケッチを全画面にしたページに2筆描いた状態（黒・普通の線のジグザグ、オレンジ・太い線の折れ線）',
    seed: { ...P2B_BOARD, pgW: { sketch: true } },
    steps: [
      { do: 'click', sel: '.nav .dot[aria-label="スケッチ"]', note: '全画面ページの点（aria-label="スケッチ"）' },
      { do: 'wait', ms: 1000, note: 'スムーズスクロールの終わり' },
      { do: 'draw', sel: SKETCH_FULL, path: SKETCH_STROKE_1, input: 'mouse', note: '既定のペン（黒・普通の線）でジグザグ。mobile もマウス（SKETCH_FULL の注記）' },
      { do: 'click', sel: `${SKETCH_FULL} button[aria-label="オレンジのペン"]` },
      { do: 'click', sel: `${SKETCH_FULL} button[aria-label="太い線"]` },
      { do: 'draw', sel: SKETCH_FULL, path: SKETCH_STROKE_2, input: 'mouse', note: 'オレンジ・太い線で折れ線' },
      { do: 'mouseAway' },
    ],
    ready: SKETCH_FULL,
  },
];

scenarios.push(...p2bScenarios);

export function selectScenarios(opts: { scenarios?: string[]; viewports?: ViewportName[] }): Scenario[] {
  const want = opts.scenarios?.length ? new Set(opts.scenarios) : null;
  return scenarios.filter((s) => !want || want.has(s.name));
}
