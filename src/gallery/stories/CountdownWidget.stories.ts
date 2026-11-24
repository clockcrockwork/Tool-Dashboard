import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CountdownWidget from '../../widgets/countdown/CountdownWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; label: string; date: string; veil: boolean; edit: boolean };

/**
 * カウントダウン（`countdown`）。標準 2×1。残り日数の大きな数字と名前。設定は「名前」「日付」。
 * 当日と過ぎた日は 0、読めない日付は「–」。時刻は 2026-11-19 に固定（年末まで 42日）。
 */
const meta = {
  title: 'Widgets/CountdownWidget',
  component: CountdownWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, label: '年末まで', date: '2026-12-31', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    label: { description: '設定「名前」' },
    date: { description: '設定「日付」（YYYY-MM-DD）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('countdown', (d, a) => {
      d.setCfg('countdown', 'label', String(a.label));
      d.setCfg('countdown', 'date', String(a.date));
      d.g.gs.veil = !!a.veil;
      d.setCfg('countdown', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { CountdownWidget }, template: '<CountdownWidget id="countdown" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1' };
export const Small: Story = { name: '小型 1×1', args: { w: 1 } };
export const Today: Story = { name: '当日（0日）', args: { label: '締め切り', date: '2026-11-19' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
