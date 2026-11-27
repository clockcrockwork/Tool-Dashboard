import type { Meta, StoryObj } from '@storybook/vue3-vite';
import RecorderWidget from '../../widgets/recorder/RecorderWidget.vue';
import { REC_IDLE, type Take } from '../../widgets/recorder/recorder';
import { setRecAsk, setRecRun } from '../../widgets/recorder/status';
import { FIXED_NOW } from '../dash';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; state: 'idle' | 'takes' | 'recording'; ask: 'none' | 'ask' | 'no'; veil: boolean; edit: boolean };

/** Sample takes (memory only; the URLs do not play in the story). */
const TAKES: Take[] = [0, 1, 2].map(i => ({ id: FIXED_NOW - (3 - i) * 600_000, t: FIXED_NOW - (3 - i) * 600_000, dur: 12_000 + i * 41_000, url: 'about:blank' }));

/**
 * 録音（`recorder`）。標準 2×2。録音ボタン＋経過時間＋入力レベル＋録音の行（再生・削除）。継続実行で、外しても・閉じても録音は続く。
 * マイクの許可のお願いは共通の枠の置き換え（`ask`）。断られたら直し方（`no`）。録音は保存しない（再読み込みで消える、最大6件）。
 * `recording` は経過 1:23 の表示だけ（マイクは使わない。入力レベルは 0）。
 */
const meta = {
  title: 'Widgets/RecorderWidget',
  component: RecorderWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, state: 'idle', ask: 'none', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    state: { control: 'inline-radio', options: ['idle', 'takes', 'recording'], description: '録音なし／録音が3件／録音中' },
    ask: { control: 'inline-radio', options: ['none', 'ask', 'no'], description: 'マイクの許可のお願い（共通の枠の cover）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('recorder', (d, a) => {
      const takes = a.state === 'idle' ? [] : TAKES;
      setRecRun(d, 'recorder', a.state === 'recording' ? { ...REC_IDLE, on: true, start: FIXED_NOW - 83_400, takes } : { ...REC_IDLE, takes });
      setRecAsk(d, 'recorder', a.ask === 'none' ? null : a.ask === 'no' ? 'no' : 'ask');
      d.g.gs.veil = !!a.veil;
      d.setCfg('recorder', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { RecorderWidget }, template: '<RecorderWidget id="recorder" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2（録音なし）' };
export const Takes: Story = { name: '録音が3件', args: { state: 'takes' } };
export const Recording: Story = { name: '録音中', args: { state: 'recording' } };
export const Small: Story = { name: '小型 2×1', args: { h: 1, state: 'takes' } };
export const Ask: Story = { name: 'マイクの許可のお願い', args: { ask: 'ask' } };
export const Denied: Story = { name: 'マイクを使えません', args: { ask: 'no' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true, state: 'takes' } };
