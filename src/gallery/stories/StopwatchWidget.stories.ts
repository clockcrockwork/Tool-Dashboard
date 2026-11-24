import type { Meta, StoryObj } from '@storybook/vue3-vite';
import StopwatchWidget from '../../widgets/stopwatch/StopwatchWidget.vue';
import { SW_IDLE } from '../../widgets/stopwatch/stopwatch';
import { setSw } from '../../widgets/stopwatch/status';
import { FIXED_NOW } from '../dash';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; state: 'idle' | 'stopped' | 'running'; veil: boolean; edit: boolean };

/**
 * ストップウォッチ（`stopwatch`）。標準 2×2。大きな経過時間＋新しいラップ3行＋ラップ／スタート・ストップ／リセット。
 * 経過は始めた時刻から計算し、0.1秒の描き直しは動いていて表示中のときだけ。計測は保存しない。
 */
const meta = {
  title: 'Widgets/StopwatchWidget',
  component: StopwatchWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, state: 'idle', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    state: { control: 'inline-radio', options: ['idle', 'stopped', 'running'], description: 'まだ／止めた（ラップ4つ）／動いている' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('stopwatch', (d, a) => {
      const laps = [{ n: 1, ms: 31_200 }, { n: 2, ms: 64_800 }, { n: 3, ms: 97_100 }, { n: 4, ms: 125_400 }];
      setSw(d, 'stopwatch', a.state === 'stopped' ? { run: false, base: 131_700, start: 0, laps }
        : a.state === 'running' ? { run: true, base: 0, start: FIXED_NOW - 83_400, laps: laps.slice(0, 2) } : SW_IDLE);
      d.g.gs.veil = !!a.veil;
      d.setCfg('stopwatch', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { StopwatchWidget }, template: '<StopwatchWidget id="stopwatch" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2' };
export const Small: Story = { name: '小型 1×1', args: { w: 1, h: 1 } };
export const Stopped: Story = { name: '止めた（ラップあり）', args: { state: 'stopped' } };
export const Running: Story = { name: '動いている', args: { state: 'running' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true, state: 'stopped' } };
