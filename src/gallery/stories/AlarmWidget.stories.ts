import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AlarmWidget from '../../widgets/alarm/AlarmWidget.vue';
import type { AlarmData } from '../../widgets/alarm/data';
import { ALARM_ASK } from '../../widgets/alarm/alarm';
import { setNotifyAsk } from '../../app/runtime/notify';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; on1: boolean; on2: boolean; a1: string; ask: 'none' | 'ask' | 'no'; veil: boolean; edit: boolean };

/**
 * アラーム（`alarm`）。標準 2×1。時刻＋スイッチの2行。スイッチのオン・オフは記録（`w:alarm` の data）、時刻は設定（a1・a2）。
 * 見張って鳴らすのは Dashboard の実行管理（未配置でも動く）。鳴るのは開いている間だけ（トースト、タブが裏なら許可済みの通知）。
 * 人前では隠している間も鳴り、知らせは伏せた文（ToastStack「伏せた通知」）。スイッチをオンにしたとき、通知の許否がまだなら
 * 共通の枠の許可のお願い（`ask`）。断られたら「通知を出せません」（`no`）。どちらでもアラームはオンのまま鳴る。
 */
const meta = {
  title: 'Widgets/AlarmWidget',
  component: AlarmWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, on1: true, on2: false, a1: '07:00', ask: 'none', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    on1: { description: 'アラーム1のスイッチ' },
    on2: { description: 'アラーム2のスイッチ' },
    a1: { description: '設定「アラーム1の時刻」（HH:MM）' },
    ask: { control: 'inline-radio', options: ['none', 'ask', 'no'], description: '許可のお願い（共通の通知が共通の枠の cover に出す）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('alarm', (d, a) => {
      d.setData<AlarmData>('alarm', { on: [!!a.on1, !!a.on2] });
      d.setCfg('alarm', 'a1', String(a.a1));
      setNotifyAsk(d, 'alarm', a.ask === 'none' ? null : a.ask === 'no' ? 'no' : 'ask', ALARM_ASK);
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
export const Ask: Story = { name: '許可のお願い', args: { on2: true, ask: 'ask' } };
export const Denied: Story = { name: '通知を出せません', args: { on2: true, ask: 'no' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
export const Editing: Story = { name: '編集中', args: { edit: true } };
