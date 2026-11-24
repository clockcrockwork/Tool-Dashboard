import type { Meta, StoryObj } from '@storybook/vue3-vite';
import PunchWidget from '../../widgets/punch/PunchWidget.vue';
import type { PunchData } from '../../widgets/punch/data';
import { FIXED_NOW } from '../dash';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; state: 'off' | 'in' | 'break' | 'done'; veil: boolean; edit: boolean };

const H = 3_600_000;

/**
 * 打刻（`punch`）。標準 2×2。状態＋勤務時間＋最近の打刻＋出勤・退勤／休憩・再開。
 * 設定「タイムログにも記録」がオンなら同じ文をタイムログにも足す。トーストの「元に戻す」はその打刻で足した行だけを消す。
 */
const meta = {
  title: 'Widgets/PunchWidget',
  component: PunchWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, state: 'off', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数（登録の最小は 2）' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    state: { control: 'inline-radio', options: ['off', 'in', 'break', 'done'], description: '未出勤／勤務中／休憩中／退勤済み' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('punch', (d, a) => {
      const t = FIXED_NOW;
      const day = [{ id: 1, k: 'in' as const, t: t - 2.5 * H }, { id: 2, k: 'break' as const, t: t - H }, { id: 3, k: 'resume' as const, t: t - 0.5 * H }];
      const stamps = a.state === 'in' ? day : a.state === 'break' ? day.slice(0, 2) : a.state === 'done' ? [...day, { id: 4, k: 'out' as const, t }] : [];
      d.setData<PunchData>('punch', { stamps });
      d.g.gs.veil = !!a.veil;
      d.setCfg('punch', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { PunchWidget }, template: '<PunchWidget id="punch" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2（未出勤）' };
export const Small: Story = { name: '小型 1×1', args: { w: 1, h: 1 } };
export const OnDuty: Story = { name: '勤務中', args: { state: 'in' } };
export const OnBreak: Story = { name: '休憩中', args: { state: 'break' } };
export const Done: Story = { name: '退勤済み', args: { state: 'done' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true, state: 'in' } };
