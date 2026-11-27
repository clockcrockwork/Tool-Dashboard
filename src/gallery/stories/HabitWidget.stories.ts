import type { Meta, StoryObj } from '@storybook/vue3-vite';
import HabitWidget from '../../widgets/habit/HabitWidget.vue';
import { initialHabits, type HabitData } from '../../widgets/habit/data';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; empty: boolean; veil: boolean; edit: boolean };

/**
 * ハビット（`habit`）。標準 2×1。切替の丸ボタン群（押すと達成のオン・オフ）。項目の編集（名前・アイコン・画像）は設定シートの共通の仕組み。
 * 「達成を通知」は共通の通知（人前では隠すの間は伏せた文）。空のときは「項目を追加」。
 */
const meta = {
  title: 'Widgets/HabitWidget',
  component: HabitWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, empty: false, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    empty: { description: '項目が無い' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('habit', (d, a) => {
      d.setData<HabitData>('habit', a.empty ? { items: [] } : initialHabits());
      d.g.gs.veil = !!a.veil;
      d.setCfg('habit', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { HabitWidget }, template: '<HabitWidget id="habit" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1' };
export const Small: Story = { name: '小型 1×1', args: { w: 1 } };
export const Empty: Story = { name: '空（項目を追加）', args: { empty: true } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
