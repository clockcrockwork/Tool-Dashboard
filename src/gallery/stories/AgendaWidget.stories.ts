import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AgendaWidget from '../../widgets/agenda/AgendaWidget.vue';
import { initialAgenda, type AgendaData } from '../../widgets/agenda/data';
import { FIXED_NOW } from '../dash';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; empty: boolean; veil: boolean; edit: boolean };

/**
 * 予定（`agenda`）。標準 2×2。日時順の行（今日・明日・「11.25」と時刻）。メモに日時を書くと、ここへの追加を提案する。
 * 空のときは「メモを開く」。「人前では隠す」の既定がオン。
 */
const meta = {
  title: 'Widgets/AgendaWidget',
  component: AgendaWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, empty: false, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    empty: { description: '予定が無い' },
    veil: { description: '全体設定「中身を隠す」がオン（人前では隠す）' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('agenda', (d, a) => {
      d.setData<AgendaData>('agenda', a.empty ? { events: [] } : initialAgenda(FIXED_NOW));
      d.g.gs.veil = !!a.veil;
    }),
  },
  render: () => ({ components: { AgendaWidget }, template: '<AgendaWidget id="agenda" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2' };
export const Small: Story = { name: '小型 2×1', args: { h: 1 } };
export const Empty: Story = { name: '空（メモを開く）', args: { empty: true } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
