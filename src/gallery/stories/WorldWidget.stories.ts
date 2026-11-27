import type { Meta, StoryObj } from '@storybook/vue3-vite';
import WorldWidget from '../../widgets/world/WorldWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; veil: boolean; edit: boolean };

/**
 * 世界時計（`world`、仕様書 3章「行の一覧」）。標準 2×1。東京・ロンドン・ニューヨークの時刻（プロトタイプの固定の都市）。
 * 描き直しは表示中だけ（`useShownNow`）。時刻は 2026-11-19 10:24:36 JST に固定。
 */
const meta = {
  title: 'Widgets/WorldWidget',
  component: WorldWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数（登録の最小は 2）' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('world', (d, a) => { d.g.gs.veil = !!a.veil; d.setCfg('world', 'veil', !!a.veil); }),
  },
  render: () => ({ components: { WorldWidget }, template: '<WorldWidget id="world" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1' };
export const Small: Story = { name: '小型 1×1', args: { w: 1 } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
export const Editing: Story = { name: '編集中', args: { edit: true } };
