import type { Meta, StoryObj } from '@storybook/vue3-vite';
import RainWidget from '../../widgets/rain/RainWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; demo: string; edit: boolean };

/** 傘（`rain`）。これからの雨を棒で見せ、傘が要るかを一言で。標準 2×1。設定「サンプル」で見本の雨を切り替える。 */
const meta = {
  title: 'Widgets/RainWidget',
  component: RainWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, demo: 'あとで降る', edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    demo: { control: 'inline-radio', options: ['あとで降る', 'いま雨', '降らない'], description: '設定「サンプル」' },
    edit: { description: '編集モード' },
  },
  parameters: { lgd: widgetLgd('rain', (d, a) => { d.setCfg('rain', 'demo', String(a.demo)); }) },
  render: () => ({ components: { RainWidget }, template: '<RainWidget id="rain" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Later: Story = { name: 'あとで降る' };
export const Now: Story = { name: 'いま雨', args: { demo: 'いま雨' } };
export const Fair: Story = { name: '降らない', args: { demo: '降らない' } };
