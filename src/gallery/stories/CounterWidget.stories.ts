import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CounterWidget from '../../widgets/counter/CounterWidget.vue';
import type { CounterData } from '../../widgets/counter/data';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; step: '1' | '5' | '10'; empty: boolean; veil: boolean; edit: boolean };

/**
 * カウンター（`counter`）。標準 2×2。名前つきの行ごとに数のステッパー（0より下にしない、押し続けると連続、PageUp/PageDown で10段）。
 * 下の帯で「項目」を足し、ごみ箱で削除モード（行の削除は「元に戻す」で戻せる）。削除モードは保存しない。
 */
const meta = {
  title: 'Widgets/CounterWidget',
  component: CounterWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, step: '1', empty: false, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    step: { control: 'inline-radio', options: ['1', '5', '10'], description: '設定「ステップ」' },
    empty: { description: '項目が無い' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('counter', (d, a) => {
      d.setCfg('counter', 'step', a.step === '5' || a.step === '10' ? a.step : '1');
      d.setData<CounterData>('counter', a.empty ? { items: [] } : { items: [{ id: 1, n: '水', v: 3 }, { id: 2, n: 'コーヒー', v: 1 }, { id: 3, n: '', v: 0 }] });
      d.g.gs.veil = !!a.veil;
      d.setCfg('counter', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { CounterWidget }, template: '<CounterWidget id="counter" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2' };
export const Small: Story = { name: '小型 2×1', args: { h: 1 } };
export const Empty: Story = { name: '空', args: { empty: true } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
