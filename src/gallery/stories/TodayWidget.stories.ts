import type { Meta, StoryObj } from '@storybook/vue3-vite';
import TodayWidget from '../../widgets/today/TodayWidget.vue';
import { todaySource } from '../../widgets/today/status';
import { sampleDay } from '../../widgets/today/adapter';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; day: '11-19' | '11-17'; veil: boolean; edit: boolean };

/**
 * 今日は何の日（`today`）。標準 2×1、最小 2×1。文字だけで伝える型（左に大きな日、右に月と記念日）。見本のデータは11月17日分だけ
 * （未接続の点つき）。ストーリーの時刻は 11月19日なので「記念日データ未設定」、`day: 11-17` は見本の「将棋の日」。
 */
const meta = {
  title: 'Widgets/TodayWidget',
  component: TodayWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, day: '11-19', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    day: { control: 'inline-radio', options: ['11-19', '11-17'], description: '出している日の内容（見本）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('today', (d, a) => {
      const day = String(a.day);
      Object.assign(todaySource.place(d, 'today', day), { key: day, val: sampleDay(day) });
      d.g.gs.veil = !!a.veil;
      d.setCfg('today', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { TodayWidget }, template: '<TodayWidget id="today" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1（記念日データ未設定）' };
export const Sample: Story = { name: '見本の日（将棋の日）', args: { day: '11-17' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
