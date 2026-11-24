import type { Meta, StoryObj } from '@storybook/vue3-vite';
import TodoWidget from '../../widgets/todo/TodoWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; hide: boolean; bar: boolean; veil: boolean; edit: boolean };

/**
 * TODO（`todo`、部品シート 9章「TODO」）。標準 2×2。入力欄と行。消す操作には「元に戻す」。
 * 「人前では隠す」の既定がオン（入力が先のウィジェット）。押すと完了の切替、Enter で追加（変換中は除く）。
 */
const meta = {
  title: 'Widgets/TodoWidget',
  component: TodoWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, hide: false, bar: false, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数（登録の最小は 2）' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数（登録の最小は 2）' },
    hide: { description: '設定「完了を隠す」' },
    bar: { description: '設定「定型ボタンを表示」' },
    veil: { description: '全体設定「中身を隠す」がオン（人前では隠す）' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('todo', (d, a) => { d.setCfg('todo', 'hide', !!a.hide); d.setCfg('todo', 'bar', !!a.bar); d.g.gs.veil = !!a.veil; }),
  },
  render: () => ({ components: { TodoWidget }, template: '<TodoWidget id="todo" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2' };
export const HideDone: Story = { name: '完了を隠す', args: { hide: true } };
export const Bar: Story = { name: '定型ボタンあり', args: { bar: true } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
export const Large: Story = { name: '大きい 4×3', args: { w: 4, h: 3 } };
