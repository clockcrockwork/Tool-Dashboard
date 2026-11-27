import type { Meta, StoryObj } from '@storybook/vue3-vite';
import MonthWidget from '../../widgets/month/MonthWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; start: '月' | '日'; veil: boolean; edit: boolean };

/**
 * 月間カレンダー（`month`）。標準 2×2。今日の印、日本の祝日（`--hol` と下線、読み上げで祝日名）、見出しに今月の次の祝日。
 * 時刻は 2026-11-19 に固定（見出し「23日 勤労感謝の日」、3日・23日が祝日）。
 */
const meta = {
  title: 'Widgets/MonthWidget',
  component: MonthWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, start: '月', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 2, max: 3, step: 1 }, description: '縦のマス数' },
    start: { control: 'inline-radio', options: ['月', '日'], description: '設定「週の始まり」' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('month', (d, a) => {
      d.setCfg('month', 'start', a.start === '日' ? '日' : '月');
      d.g.gs.veil = !!a.veil;
      d.setCfg('month', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { MonthWidget }, template: '<MonthWidget id="month" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2' };
export const Sunday: Story = { name: '日曜はじまり', args: { start: '日' } };
export const Large: Story = { name: '大きい 4×3', args: { w: 4, h: 3 } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
