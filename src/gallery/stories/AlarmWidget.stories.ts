import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AlarmWidget from '../../widgets/alarm/AlarmWidget.vue';
import type { AlarmData } from '../../widgets/alarm/data';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; on1: boolean; on2: boolean; a1: string; veil: boolean; edit: boolean };

/**
 * アラーム（`alarm`）。標準 2×1。時刻＋スイッチの2行。スイッチのオン・オフは記録（`w:alarm` の data）、時刻は設定（a1・a2）。
 * 鳴るのは開いている間だけ（トースト、タブが裏なら許可済みの通知）。人前では隠している間は鳴っても知らせない。
 */
const meta = {
  title: 'Widgets/AlarmWidget',
  component: AlarmWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, on1: true, on2: false, a1: '07:00', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    on1: { description: 'アラーム1のスイッチ' },
    on2: { description: 'アラーム2のスイッチ' },
    a1: { description: '設定「アラーム1の時刻」（HH:MM）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('alarm', (d, a) => {
      d.setData<AlarmData>('alarm', { on: [!!a.on1, !!a.on2] });
      d.setCfg('alarm', 'a1', String(a.a1));
      d.g.gs.veil = !!a.veil;
      d.setCfg('alarm', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { AlarmWidget }, template: '<AlarmWidget id="alarm" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1' };
export const Small: Story = { name: '小型 1×1', args: { w: 1 } };
export const BothOn: Story = { name: '両方オン', args: { on2: true } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
export const Editing: Story = { name: '編集中', args: { edit: true } };
