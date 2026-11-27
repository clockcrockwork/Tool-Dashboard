import type { Meta, StoryObj } from '@storybook/vue3-vite';
import GanttWidget from '../../widgets/gantt/GanttWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; now: boolean; veil: boolean; edit: boolean };

/**
 * タイムスケジュール（`gantt`）。標準 4×1。8〜20時の横の帯（見本の時間帯、`gantt/sample.ts`）と現在時刻の線（10:24）。
 * 設定は「現在時刻の線」。
 */
const meta = {
  title: 'Widgets/GanttWidget',
  component: GanttWidget,
  tags: ['autodocs'],
  args: { w: 4, h: 1, now: true, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数（登録の最小は 3）' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    now: { description: '設定「現在時刻の線」' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('gantt', (d, a) => { d.setCfg('gantt', 'now', !!a.now); d.g.gs.veil = !!a.veil; d.setCfg('gantt', 'veil', !!a.veil); }),
  },
  render: () => ({ components: { GanttWidget }, template: '<GanttWidget id="gantt" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 4×1' };
export const Small: Story = { name: '小型 1×1', args: { w: 1 } };
export const NoLine: Story = { name: '現在時刻の線なし', args: { now: false } };
export const Tall: Story = { name: '縦 4×2', args: { h: 2 } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
