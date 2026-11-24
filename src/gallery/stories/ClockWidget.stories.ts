import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ClockWidget from '../../widgets/clock/ClockWidget.vue';
import { FIXED_NOW, solo } from '../dash';
import type { LgdParams, StoryArgs } from '../storybook';

type ClockArgs = { w: number; h: number; sec: boolean; h12: boolean; pm: boolean; edit: boolean };

const size = (a: StoryArgs): readonly [number, number] => [Number(a.w) || 2, Number(a.h) || 1];

/**
 * 時計（`clock`、部品シート 9章「時計」）。大きな数字・秒・日付。標準は 2×1。
 *
 * 小型でも主役の数字を残し、秒は小さく添える。数字はコンテナ単位（`cqh`/`cqw`）で枠に合わせて伸び縮みする。
 * 時刻は 2026-11-19 10:24:36（JST）に固定している（再現度テストと同じ）。設定は「秒を表示」「12時間表示」。
 */
const meta = {
  title: 'Widgets/ClockWidget',
  component: ClockWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, sec: true, h12: false, pm: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    sec: { description: '設定「秒を表示」' },
    h12: { description: '設定「12時間表示」' },
    pm: { description: '時刻を5時間進めて 15:24:36 にする（12時間表示の確認用）' },
    edit: { description: '編集モード（枠が点線になり、中身は押せない）' },
  },
  parameters: {
    lgd: {
      layout: 'grid',
      grid: size,
      setup: (d, a) => {
        solo(d, 'clock', size(a));
        d.setCfg('clock', 'sec', !!a.sec);
        d.setCfg('clock', 'h12', !!a.h12);
        d.ui.edit = !!a.edit;
        d.ui.t = FIXED_NOW + (a.pm ? 5 * 3600_000 : 0);
      },
    } satisfies LgdParams,
  },
  render: () => ({ components: { ClockWidget }, template: '<ClockWidget id="clock" />' }),
} satisfies Meta<ClockArgs>;

export default meta;
type Story = StoryObj<ClockArgs>;

/** 標準の大きさ 2×1。 */
export const Normal: Story = { name: '通常 2×1' };

/** 小型 1×1。数字と日付だけでも破綻しない。 */
export const Small: Story = { name: '小型 1×1', args: { w: 1, h: 1 } };

/** いちばん大きい 4×3。 */
export const Large: Story = { name: '大きい 4×3', args: { w: 4, h: 3 } };

/** 設定「秒を表示」がオフ。 */
export const NoSeconds: Story = { name: '秒なし', args: { sec: false } };

/** 設定「12時間表示」がオン。午後 15:24 が「3:24」になる。 */
export const TwelveHour: Story = { name: '12時間表示（午後）', args: { h12: true, pm: true } };

/** 編集モード。枠が点線になる（右上の固定の印はボードの側が描く）。 */
export const Editing: Story = { name: '編集中', args: { edit: true } };
