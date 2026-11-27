import type { Meta, StoryObj } from '@storybook/vue3-vite';
import QuoteWidget from '../../widgets/quote/QuoteWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; veil: boolean; edit: boolean };

/** 名言（`quote`）。標準 2×1、最小 2×1。文字だけで伝える型（左に大きな「「」、右に本文と人の名前）。通信・記録・設定なし。 */
const meta = {
  title: 'Widgets/QuoteWidget',
  component: QuoteWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('quote', (d, a) => {
      d.g.gs.veil = !!a.veil;
      d.setCfg('quote', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { QuoteWidget }, template: '<QuoteWidget id="quote" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1' };
export const Wide: Story = { name: '横長 4×1', args: { w: 4 } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
