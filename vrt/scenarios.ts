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

export function selectScenarios(opts: { scenarios?: string[]; viewports?: ViewportName[] }): Scenario[] {
  const want = opts.scenarios?.length ? new Set(opts.scenarios) : null;
  return scenarios.filter((s) => !want || want.has(s.name));
}
