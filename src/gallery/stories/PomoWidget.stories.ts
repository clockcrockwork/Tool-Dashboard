import type { Meta, StoryObj } from '@storybook/vue3-vite';
import PomoWidget from '../../widgets/pomo/PomoWidget.vue';
import { POMO_ASK, POMO_IDLE, startPomo } from '../../widgets/pomo/pomo';
import { setPomoRun } from '../../widgets/pomo/status';
import { setNotifyAsk } from '../../app/runtime/notify';
import { FIXED_NOW } from '../dash';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; min: number; state: 'idle' | 'running' | 'paused'; ask: 'none' | 'ask' | 'no'; veil: boolean; edit: boolean };

/**
 * ポモドーロ（`pomo`、部品シート 9章「ポモドーロ」）。標準 2×1。進行リング＋残り時間＋スタート・一時停止／リセット。
 * 小型ではリングを縮め、再生とやり直しを縦に積む。残りは終わる時刻から計算する（保存しない）。
 * 「完了を通知」がオンで通知の許否がまだなら、スタートで共通の枠の許可のお願い（`ask`）。断られたら「通知を出せません」（`no`）。
 */
const meta = {
  title: 'Widgets/PomoWidget',
  component: PomoWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, min: 25, state: 'idle', ask: 'none', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    min: { control: { type: 'range', min: 5, max: 90, step: 5 }, description: '設定「集中する時間」（分）' },
    state: { control: 'inline-radio', options: ['idle', 'running', 'paused'], description: '止まっている／動いている（10分たった）／一時停止中（残り 12:34）' },
    ask: { control: 'inline-radio', options: ['none', 'ask', 'no'], description: '許可のお願い（共通の通知が共通の枠の cover に出す）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('pomo', (d, a) => {
      const total = (Number(a.min) || 25) * 60;
      d.setCfg('pomo', 'min', Number(a.min) || 25);
      const run = a.state === 'running' ? startPomo(POMO_IDLE, total, FIXED_NOW - 600_000)
        : a.state === 'paused' ? { on: false, endAt: null, left: 754 } : POMO_IDLE;
      setPomoRun(d, 'pomo', run);
      setNotifyAsk(d, 'pomo', a.ask === 'none' ? null : a.ask === 'no' ? 'no' : 'ask', POMO_ASK, () => {});
      d.g.gs.veil = !!a.veil;
      d.setCfg('pomo', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { PomoWidget }, template: '<PomoWidget id="pomo" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1' };
export const Small: Story = { name: '小型 1×1', args: { w: 1 } };
export const Running: Story = { name: '動いている（残り 15:00）', args: { state: 'running' } };
export const Paused: Story = { name: '一時停止中', args: { state: 'paused' } };
export const Ask: Story = { name: '許可のお願い', args: { ask: 'ask' } };
export const Denied: Story = { name: '通知を出せません', args: { ask: 'no' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true, state: 'running' } };
