import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ToastStack from '../../app/shell/ToastStack.vue';
import { useDash } from '../../app/context';
import type { Toast } from '../../app/store/types';
import type { LgdParams } from '../storybook';
import { VEILED_TOAST } from '../../app/runtime/notify';

type ToastArgs = { kind: Toast['kind']; text: string; act: boolean; spin: boolean; bottom: boolean; offline: boolean };

/**
 * トースト `.toasts` とオフラインの帯 `.offp`（仕様書 2章・5章、部品シート 6章「トースト」「状態の帯」）。
 *
 * 知らせは1文、25字が目安。何が起きたかだけを書き、どうするかはボタンの名前で伝える。
 * 種類は info（ベル）・ok（チェック、アクセント色）・warn（三角、第2のアクセント色）。
 * 「元に戻す」付きは10秒、それ以外は設定の秒数で消える。ポインターやフォーカスがある間は消えない。
 * 進行中はアイコンの代わりに回る印（`.sp`）を出し、終わったら同じ場所で完了の知らせに替える。最大3つ。
 *
 * ここでは見本を止めて見せるため、`ui.toasts` に直接入れている（消えない）。「試す」は本物のタイマーで動く。
 */
const meta = {
  title: 'Shell/ToastStack',
  component: ToastStack,
  tags: ['autodocs'],
  args: { kind: 'info', text: 'ボードを追加しました', act: false, spin: false, bottom: false, offline: false },
  argTypes: {
    kind: { control: 'inline-radio', options: ['info', 'ok', 'warn'], description: '種類' },
    text: { description: '1文、25字が目安' },
    act: { description: '「元に戻す」を付ける' },
    spin: { description: '進行中（回る印）' },
    bottom: { description: 'トースト通知ウィジェットの設定「表示位置: 下」' },
    offline: { description: 'オフラインの帯を出す' },
  },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 200,
      setup: (d, a) => {
        const t: Toast = { id: 1, text: String(a.text), kind: a.kind as Toast['kind'], act: a.act ? { label: '元に戻す', fn: () => { d.undo(); } } : null };
        d.ui.toasts = [a.spin ? { ...t, spin: true } : t];
        d.setCfg('toast', 'pos', a.bottom ? '下' : '上');
        d.ui.online = !a.offline;
      },
    } satisfies LgdParams,
  },
  render: () => ({ components: { ToastStack }, template: '<ToastStack />' }),
} satisfies Meta<ToastArgs>;

export default meta;
type Story = StoryObj<ToastArgs>;

/** 知らせ（info）。 */
export const Info: Story = { name: 'info' };

/** 完了（ok）。操作の名前と同じ言葉で（「保存」→「保存しました」）。 */
export const Ok: Story = { name: 'ok', args: { kind: 'ok', text: '設定と記録をファイルに保存しました' } };

/** 注意（warn）。 */
export const Warn: Story = { name: 'warn', args: { kind: 'warn', text: '容量がいっぱいで保存できません' } };

/** 消す操作のあとは「元に戻す」付き（10秒）。 */
export const WithUndo: Story = { name: '元に戻す付き', args: { text: 'TODO をボードから外しました', act: true } };

/** 進行中。終わったら同じ場所で完了の知らせに替わる。 */
export const Busy: Story = { name: '進行中', args: { text: '書き出しています', spin: true } };

/**
 * 伏せた通知（p2a-followup.md 2章）: 人前では隠しているウィジェットの知らせ（アラーム・ポモドーロの完了など）は、どの種類でも
 * この文にする。ウィジェット名・時刻・内容は出さない。タブが裏にあって許可済みなら、ブラウザの通知も
 * 見出し「通知があります」・本文「人前では隠すがオンなので、内容はダッシュボードで確認してください」で出す（共通の通知 `notify.ts`）。
 */
export const Veiled: Story = { name: '伏せた通知（人前では隠す）', args: { text: VEILED_TOAST } };

/** 3つまで積む（新しいものが下）。 */
export const Stack: Story = {
  name: '3つ並ぶ',
  parameters: {
    lgd: {
      layout: 'bar',
      height: 220,
      setup: d => {
        d.ui.toasts = [
          { id: 1, text: 'ボードを追加しました', kind: 'info', act: null },
          { id: 2, text: 'メモ をボードから外しました', kind: 'info', act: { label: '元に戻す', fn: () => { d.undo(); } } },
          { id: 3, text: '設定と記録をファイルに保存しました', kind: 'ok', act: null },
        ];
      },
    } satisfies LgdParams,
  },
};

/** オフラインの帯（トーストの列の先頭に出る）。 */
export const Offline: Story = {
  name: 'オフラインの帯',
  parameters: {
    lgd: { layout: 'bar', height: 120, setup: d => { d.ui.toasts = []; d.ui.online = false; } } satisfies LgdParams,
  },
};

/** 本物の `d.toast()` / `d.busy()` / `d.undoable()` を呼ぶ。消えるまでの時間も本物。 */
export const Try: Story = {
  name: '試す（本物のタイマー）',
  parameters: {
    lgd: { layout: 'bar', height: 260, timers: true, setup: d => { d.ui.toasts = []; } } satisfies LgdParams,
  },
  render: () => ({
    components: { ToastStack },
    setup: () => ({ d: useDash() }),
    template: `<div style="position:absolute;left:0;right:0;bottom:0;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
      <button class="chip" @click="d.toast('ボードを追加しました')">info</button>
      <button class="chip" @click="d.toast('保存しました', 'ok')">ok</button>
      <button class="chip" @click="d.toast('容量がいっぱいで保存できません', 'warn')">warn</button>
      <button class="chip" @click="d.undoable('メモ をボードから外しました')">元に戻す付き</button>
      <button class="chip" @click="d.busy('書き出しています', 1500, '書き出しました')">進行中→完了</button>
    </div><ToastStack />`,
  }),
};
