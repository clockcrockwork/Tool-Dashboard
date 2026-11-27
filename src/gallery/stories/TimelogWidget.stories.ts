import type { Meta, StoryObj } from '@storybook/vue3-vite';
import TimelogWidget from '../../widgets/timelog/TimelogWidget.vue';
import { initialLogs, type TimelogData } from '../../widgets/timelog/data';
import { FIXED_NOW } from '../dash';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; sec: boolean; bar: boolean; empty: boolean; veil: boolean; edit: boolean };

/**
 * タイムログ（`timelog`、仕様書 3章・6章）。標準 2×3。入力欄＋定型の言葉の帯（押すとその場で記録）＋今日の記録位置＋縦のタイムライン。
 * 新しいものが下。上限40件。「人前では隠す」の既定がオン。打刻の「タイムログにも記録」で行が足される。
 */
const meta = {
  title: 'Widgets/TimelogWidget',
  component: TimelogWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 3, sec: false, bar: true, empty: false, veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数（登録の最小は 2）' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数（登録の最小は 2）' },
    sec: { description: '設定「秒まで記録」' },
    bar: { description: '設定「定型ボタンを表示」' },
    empty: { description: '記録が空' },
    veil: { description: '全体設定「中身を隠す」がオン（人前では隠すの既定がオン）' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('timelog', (d, a) => {
      d.setCfg('timelog', 'sec', !!a.sec);
      d.setCfg('timelog', 'bar', !!a.bar);
      d.setData<TimelogData>('timelog', a.empty ? { logs: [] } : initialLogs(FIXED_NOW));
      d.g.gs.veil = !!a.veil;
    }),
  },
  render: () => ({ components: { TimelogWidget }, template: '<TimelogWidget id="timelog" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×3' };
export const Small: Story = { name: '小型 1×1', args: { w: 1, h: 1 } };
export const Empty: Story = { name: '空', args: { empty: true } };
export const Seconds: Story = { name: '秒まで記録・帯なし', args: { sec: true, bar: false } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
