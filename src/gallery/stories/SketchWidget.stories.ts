import type { Meta, StoryObj } from '@storybook/vue3-vite';
import SketchWidget from '../../widgets/sketch/SketchWidget.vue';
import { clearPad } from '../../widgets/sketch/status';
import { sampleStrokes } from './sketch-sample';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; drawn: boolean; bar: boolean; veil: boolean; edit: boolean };

/**
 * スケッチ（`sketch`）。標準 2×2。手書き面＋入力補助の帯（太さ3種・色3種・1つ戻す・すべて消去・前面表示）。
 * 帯は設定「ツールバーを表示」で出す（前面表示の間は常に）。線は保存せず、全画面・前面表示と同じ線を使う。「人前では隠す」の既定がオン。
 */
const meta = {
  title: 'Widgets/SketchWidget',
  component: SketchWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, drawn: false, bar: true, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 2, max: 3, step: 1 }, description: '縦のマス数' },
    drawn: { description: '見本の線を描いた状態' },
    bar: { description: '設定「ツールバーを表示」' },
    veil: { description: '全体設定「中身を隠す」がオン（人前では隠す）' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('sketch', (d, a) => {
      d.setCfg('sketch', 'bar', !!a.bar);
      if (a.drawn) sampleStrokes(d, 'sketch');
      else clearPad(d, 'sketch');
      d.g.gs.veil = !!a.veil;
    }),
  },
  render: () => ({ components: { SketchWidget }, template: '<SketchWidget id="sketch" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2（何も描いていない）' };
export const Drawn: Story = { name: '描いた状態', args: { drawn: true } };
export const NoBar: Story = { name: 'ツールバーなし', args: { bar: false, drawn: true } };
export const Large: Story = { name: '大きい 4×3', args: { w: 4, h: 3, drawn: true } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true, drawn: true } };
