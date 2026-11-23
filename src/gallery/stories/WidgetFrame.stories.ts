import type { Meta, StoryObj } from '@storybook/vue3-vite';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { solo } from '../dash';
import type { LgdParams } from '../storybook';

/**
 * ウィジェットの共通の枠 `.w`（仕様書 3章「ウィジェットの規約」、部品シート 7章「ウィジェットの枠」）。
 *
 * ガラスの面。中身は14pxの余白の内側（`.in`）に置く。見える見出しは持たず、`role="group"` と
 * 見えない見出し（登録名）で名付ける。人前では隠す（`.veil`）、接続の点（`.cdot`）、
 * 状態の覆い（`.sto`: 読み込み・更新中・空・失敗）は枠が持つので、ウィジェットの中身では作らない。
 *
 * ここでは中身の代わりに `.in` に数字を1つ置いている。マス目は 1マス 166×153px。
 */
const meta = {
  title: 'Shell/WidgetFrame',
  component: WidgetFrame,
  tags: ['autodocs'],
  args: { id: 'weather', net: false, states: false, stateClass: '', stMsg: '', stAct: '', stSub: '' },
  argTypes: {
    id: { control: 'select', options: ['weather', 'memo', 'links', 'clock'], description: '登録のID（見えない見出しは登録名）' },
    stateClass: { control: 'select', options: ['', 's-load', 's-stale', 's-empty', 's-err'], description: '状態のクラス' },
    net: { description: '接続の点を出す（登録の net が data のもの）' },
    states: { description: '状態の覆い `.sto` を描く（読み込み・空・失敗を持つウィジェット）' },
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

/** ふだんの枠。 */
export const Default: Story = { name: '通常' };

/**
 * 全体設定の「中身を隠す」がオンで、このウィジェットが「人前では隠す」のとき。
 * 中身を隠し、目の印と「表示する」を出す。押すとその場だけ見せる（`ui.peek`）。
 */
export const Veil: Story = {
  name: '人前では隠す',
  args: { id: 'memo' },
  parameters: {
    lgd: {
      layout: 'grid',
      grid: [2, 1],
      setup: (d, args) => {
        solo(d, String(args.id), [2, 1]);
        d.g.gs.veil = true;
        d.setCfg(String(args.id), 'veil', true);
      },
    } satisfies LgdParams,
  },
};

/** 通信するウィジェットの右上の点。中抜きは「未接続。見本のデータです」。 */
export const NetMark: Story = { name: '接続の点（未接続）', args: { net: true } };

/** オフラインのときは点を塗る（`.cdot.offl`）。読み上げは「オフライン。前回の内容です」。 */
export const NetOffline: Story = {
  name: '接続の点（オフライン）',
  args: { net: true },
  parameters: {
    lgd: {
      layout: 'grid',
      grid: [2, 1],
      setup: (d, args) => { solo(d, String(args.id), [2, 1]); d.ui.online = false; },
    } satisfies LgdParams,
  },
};

/** 読み込み中（`s-load`）: 中身を隠し、形だけ先に出す（スケルトン）。 */
export const Loading: Story = { name: '状態: 読み込み（s-load）', args: { net: true, states: true, stateClass: 's-load' } };

/** 更新中（`s-stale`）: 前の値を薄く残し、右上で回す。 */
export const Stale: Story = { name: '状態: 更新中（s-stale）', args: { net: true, states: true, stateClass: 's-stale' } };

/** 空（`s-empty`）: 1文と次へ進むボタン1つ。 */
export const Empty: Story = {
  name: '状態: 空（s-empty）',
  args: { net: true, states: true, stateClass: 's-empty', stMsg: 'まだ何もありません', stAct: '接続する' },
};

/** 失敗（`s-err`）: 「もう一度」と最終更新の時刻。押すと読み込みへ戻る（`retry` イベント）。 */
export const Failed: Story = {
  name: '状態: 失敗（s-err）',
  args: { net: true, states: true, stateClass: 's-err', stMsg: '取得できませんでした', stAct: 'もう一度', stSub: '最終更新 09:42' },
};
