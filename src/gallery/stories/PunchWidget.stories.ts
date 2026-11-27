import type { Meta, StoryObj } from '@storybook/vue3-vite';
import PunchWidget from '../../widgets/punch/PunchWidget.vue';
import { initialPunch, type PunchData, type Session } from '../../widgets/punch/data';
import { FIXED_NOW } from '../dash';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; state: 'off' | 'in' | 'break' | 'done' | 'night'; veil: boolean; edit: boolean };

const H = 3_600_000;
const DAY = 24 * H;

/** Past sessions so the totals and the list have something: weekdays of this month, 9:00–18:00 with a 1 h break. */
function past(now: number): Session[] {
  const out: Session[] = [];
  for (let i = 6; i >= 1; i--) {
    const st = new Date(now - i * DAY);
    st.setHours(9, 0, 0, 0);
    const t = st.getTime();
    if (st.getDay() === 0 || st.getDay() === 6) continue;
    out.push({ id: t, ty: i === 2 ? 2 : 1, n: i === 2 ? '副業' : '本業', st: t, en: t + 9 * H, br: [{ st: t + 3 * H, en: t + 4 * H }] });
  }
  return out;
}

function record(state: Args['state'], now: number): PunchData {
  const base = initialPunch();
  const sessions = past(now);
  const t = now - 2.5 * H;
  if (state === 'in') sessions.push({ id: t, ty: 1, n: '本業', st: t, en: null, br: [{ st: t + H, en: t + 1.5 * H }] });
  if (state === 'break') sessions.push({ id: t, ty: 1, n: '本業', st: t, en: null, br: [{ st: t + 2 * H, en: null }] });
  if (state === 'done') sessions.push({ id: t, ty: 1, n: '本業', st: t, en: now - 0.5 * H, br: [] });
  if (state === 'night') {
    // 夜勤: 昨日 22:00 に出勤、日をまたいで勤務中（1つのセッション）.
    const st = new Date(now - DAY);
    st.setHours(22, 0, 0, 0);
    sessions.push({ id: st.getTime(), ty: 2, n: '副業', st: st.getTime(), en: null, br: [] });
    return { ...base, last: 2, sessions };
  }
  return { ...base, sessions };
}

/**
 * 打刻（`punch`）。標準 2×2。業務の種類（選択チップ、＋で追加、調整のボタンで名前と削除）＋状態＋このセッションの時間＋
 * このセッションの打刻（勤務外は前回）＋今日・今月の合計（出勤の時刻で決める）＋出勤・退勤／休憩・再開。
 * 出勤から退勤までが1つのセッションで、夜勤もそのまま1つ。横3以上は右に、縦3以上は下に最近のセッションの一覧。
 * 設定「タイムログにも記録」がオンなら「出勤（本業）」のような文をタイムログにも足す。トーストの「元に戻す」はその打刻で変えたところだけを戻す。
 */
const meta = {
  title: 'Widgets/PunchWidget',
  component: PunchWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 2, state: 'off', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数（登録の最小は 2。1 は段階表示の確認用）' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    state: { control: 'inline-radio', options: ['off', 'in', 'break', 'done', 'night'], description: '未出勤／勤務中／休憩中／退勤済み／夜勤（日をまたいで勤務中）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('punch', (d, a) => {
      d.setData<PunchData>('punch', record(a.state as Args['state'], FIXED_NOW));
      d.g.gs.veil = !!a.veil;
      d.setCfg('punch', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { PunchWidget }, template: '<PunchWidget id="punch" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×2（未出勤）' };
export const OnDuty: Story = { name: '勤務中', args: { state: 'in' } };
export const OnBreak: Story = { name: '休憩中', args: { state: 'break' } };
export const Done: Story = { name: '退勤済み', args: { state: 'done' } };
export const Night: Story = { name: '夜勤（日をまたぐ1セッション）', args: { state: 'night' } };
export const Small: Story = { name: '小型 1×1', args: { w: 1, h: 1, state: 'in' } };
export const Wide: Story = { name: '2×1', args: { w: 2, h: 1, state: 'in' } };
export const Side: Story = { name: '大きい 3×2（右に最近のセッション）', args: { w: 3, h: 2, state: 'in' } };
export const Tall: Story = { name: '大きい 2×3（下に最近のセッション）', args: { w: 2, h: 3, state: 'done' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true, state: 'in' } };
