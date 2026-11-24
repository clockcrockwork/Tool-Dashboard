import type { Meta, StoryObj } from '@storybook/vue3-vite';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import PendingWidget from '../../app/shell/PendingWidget.vue';
import { PENDING_COVER } from '../../app/shell/cover';
import { solo } from '../dash';
import type { LgdParams } from '../storybook';

/**
 * ウィジェットの共通の枠 `.w`（仕様書 3章「ウィジェットの規約」、部品シート 7章「ウィジェットの枠」）。
 *
 * ガラスの面。中身は14pxの余白の内側（`.in`）に置く。見える見出しは持たず、`role="group"` と
 * 見えない見出し（登録名）で名付ける。人前では隠す（`.veil`）、接続の点（`.cdot`）、
 * 状態の覆い（`.sto`: 読み込み・更新中・空・失敗）、中身ごと置き換える知らせ（`.pmw`: 許可のお願い・準備中）は枠が持つので、
 * ウィジェットの中身では作らない。接続の点と状態の覆いを出すかは登録（`net: 'data'`、`states`）で決まる（実装ガイド 4章）。
 *
 * ここでは中身の代わりに `.in` に数字を1つ置いている。マス目は 1マス 166×153px。
 */
const meta = {
  title: 'Shell/WidgetFrame',
  component: WidgetFrame,
  tags: ['autodocs'],
  args: { id: 'links', stateClass: '', stMsg: '', stAct: '', stSub: '' },
  argTypes: {
    id: { control: 'select', options: ['weather', 'rss', 'memo', 'links', 'clock'], description: '配置のID（見えない見出しは登録名。接続の点と状態の覆いは登録から）' },
    stateClass: { control: 'select', options: ['', 's-load', 's-stale', 's-empty', 's-err'], description: '状態のクラス' },
  },
  parameters: {
    lgd: {
      layout: 'grid',
      grid: [2, 1],
      setup: (d, args) => { solo(d, String(args.id), [2, 1]); },
    } satisfies LgdParams,
  },
  render: args => ({
    components: { WidgetFrame },
    setup: () => ({ args }),
    template: `<WidgetFrame v-bind="args"><div class="in" style="align-items:center"><div class="num" style="font-size:2.2rem;font-weight:200">18°</div></div></WidgetFrame>`,
  }),
} satisfies Meta<typeof WidgetFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ふだんの枠（通信しない種類）。 */
export const Default: Story = { name: '通常' };

const veiled = (setup?: (d: Parameters<NonNullable<LgdParams['setup']>>[0]) => void): LgdParams => ({
  layout: 'grid',
  grid: [2, 1],
  setup: (d, args) => {
    solo(d, String(args.id), [2, 1]);
    d.g.gs.veil = true;
    d.setCfg(String(args.id), 'veil', true);
    setup?.(d);
  },
});

/**
 * 全体設定の「中身を隠す」がオンで、このウィジェットが「人前では隠す」のとき。
 * 中身を隠し、目の印と「表示する」を出す。押すとその場だけ見せる（`ui.peek`）。
 */
export const Veil: Story = { name: '人前では隠す', args: { id: 'memo' }, parameters: { lgd: veiled() } };

/**
 * 人前では隠すが優先（review #6）: 失敗の状態でも、隠している間は状態の覆いを作らず、中身も知らせも出さない。
 * 1×1 の知らせ（トースト）も出さない。
 */
export const VeilOverState: Story = {
  name: '人前では隠す＋失敗（覆いを出さない）',
  args: { id: 'weather', stateClass: 's-err', stMsg: '取得できませんでした', stAct: 'もう一度', stSub: '最終更新 09:42' },
  parameters: { lgd: veiled() },
};

/** 通信するウィジェット（登録の `net: 'data'`）の右上の点。中抜きは「未接続。見本のデータです」。 */
export const NetMark: Story = { name: '接続の点（未接続）', args: { id: 'rss' } };

/** オフラインのときは点を塗る（`.cdot.offl`）。読み上げは「オフライン。前回の内容です」。 */
export const NetOffline: Story = {
  name: '接続の点（オフライン）',
  args: { id: 'rss' },
  parameters: {
    lgd: {
      layout: 'grid',
      grid: [2, 1],
      setup: (d, args) => { solo(d, String(args.id), [2, 1]); d.ui.online = false; },
    } satisfies LgdParams,
  },
};

/** 読み込み中（`s-load`）: 中身を隠し、形だけ先に出す（スケルトン）。状態の覆いは登録の `states` を持つ種類（天気など）だけ。 */
export const Loading: Story = { name: '状態: 読み込み（s-load）', args: { id: 'weather', stateClass: 's-load' } };

/** 更新中（`s-stale`）: 前の値を薄く残し、右上で回す。 */
export const Stale: Story = { name: '状態: 更新中（s-stale）', args: { id: 'weather', stateClass: 's-stale' } };

/** 空（`s-empty`）: 1文と次へ進むボタン1つ。 */
export const Empty: Story = {
  name: '状態: 空（s-empty）',
  args: { id: 'weather', stateClass: 's-empty', stMsg: 'まだ何もありません', stAct: '接続する' },
};

/** 失敗（`s-err`）: 「もう一度」と最終更新の時刻。押すと読み込みへ戻る（`retry` イベント）。 */
export const Failed: Story = {
  name: '状態: 失敗（s-err）',
  args: { id: 'weather', stateClass: 's-err', stMsg: '取得できませんでした', stAct: 'もう一度', stSub: '最終更新 09:42' },
};

/**
 * 中身ごと置き換える知らせ（`cover`、`.pmw .perm`）。許可のお願い（P2）と同じ置き場所・同じ形。
 * ここでは未実装の種類に出す「準備中」を当てている。
 */
export const Cover: Story = { name: '置き換えの知らせ（cover）', args: { id: 'links', cover: PENDING_COVER } };

/**
 * 未実装の種類（review #9）。置いても、置かずに使っても、空白にせず「準備中」で置き換える（`PendingWidget`）。
 * 1×1 では置き換えを出さず、印を薄く残してトーストで知らせる（仕様書 3章）。
 */
export const Pending: Story = {
  name: '準備中（未実装の種類）',
  args: { id: 'alarm' },
  render: args => ({
    components: { PendingWidget },
    setup: () => ({ args }),
    template: '<PendingWidget :id="args.id" />',
  }),
};
