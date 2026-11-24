import type { Meta, StoryObj } from '@storybook/vue3-vite';
import MemoWidget from '../../widgets/memo/MemoWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; size: number; bar: boolean; count: boolean; edit: boolean };

/**
 * メモ（`memo`、部品シート 9章「メモ」）。標準 2×2。2×1では本文だけを残す。
 * 予定の提案（「今日 予定 / 予定に追加」）と書式の帯は大きいときだけ。設定は文字サイズ・書式ボタン・文字数。
 */
const meta = {
  title: 'Widgets/MemoWidget',
  component: MemoWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, size: 14, bar: true, count: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    size: { control: { type: 'range', min: 12, max: 20, step: 1 }, description: '設定「文字サイズ」(px)' },
    bar: { description: '設定「書式ボタンを表示」' },
    count: { description: '設定「文字数を表示」' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('memo', (d, a) => { d.setCfg('memo', 'size', Number(a.size)); d.setCfg('memo', 'bar', !!a.bar); d.setCfg('memo', 'count', !!a.count); }),
  },
  render: () => ({ components: { MemoWidget }, template: '<MemoWidget id="memo" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2' };
export const Small: Story = { name: '小型 2×1', args: { h: 1 } };
export const Count: Story = { name: '文字数あり', args: { count: true } };
export const NoBar: Story = { name: '書式ボタンなし', args: { bar: false } };
