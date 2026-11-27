import type { Meta, StoryObj } from '@storybook/vue3-vite';
import WeekWidget from '../../widgets/week/WeekWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; start: '月' | '日'; veil: boolean; edit: boolean };

/**
 * 週間カレンダー（`week`）。標準 4×1。今日を含む7日、今日の印、日本の祝日（`--hol` と下線、読み上げで祝日名）。
 * 点はプロトタイプと同じ曜日ごとの見本（予定の記録とは結んでいない）。
 */
const meta = {
  title: 'Widgets/WeekWidget',
  component: WeekWidget,
  tags: ['autodocs'],
  args: { w: 4, h: 1, start: '月', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 3, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    start: { control: 'inline-radio', options: ['月', '日'], description: '設定「週の始まり」' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('week', (d, a) => {
      d.setCfg('week', 'start', a.start === '日' ? '日' : '月');
      d.g.gs.veil = !!a.veil;
      d.setCfg('week', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { WeekWidget }, template: '<WeekWidget id="week" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 4×1' };
export const Small: Story = { name: '小型 3×1', args: { w: 3 } };
export const Sunday: Story = { name: '日曜はじまり', args: { start: '日' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
