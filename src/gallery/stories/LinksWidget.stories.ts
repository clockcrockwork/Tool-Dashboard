import type { Meta, StoryObj } from '@storybook/vue3-vite';
import LinksWidget from '../../widgets/links/LinksWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; edit: boolean };

/** クイックリンク（`links`）。標準 2×1。よく開く場所を並べる。並べ替えと削除は元に戻す履歴に入る。 */
const meta = {
  title: 'Widgets/LinksWidget',
  component: LinksWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    edit: { description: '編集モード' },
  },
  parameters: { lgd: widgetLgd('links') },
  render: () => ({ components: { LinksWidget }, template: '<LinksWidget />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1' };
export const Large: Story = { name: '大きい 4×2', args: { w: 4, h: 2 } };
export const Editing: Story = { name: '編集中', args: { edit: true } };
