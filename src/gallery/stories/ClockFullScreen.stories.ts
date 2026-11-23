import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';
import ClockFullScreen from '../../widgets/clock/ClockFullScreen.vue';
import { useDash } from '../../app/context';
import type { LgdParams } from '../storybook';

type Args = { h12: boolean; page: boolean };

/**
 * 時計の全画面 `.fsw`（仕様書 2章「全画面ウィジェット」、部品シート 7章「全画面ウィジェット」）。
 * 大きさを「全画面」にした時計は、ボードのあとに1画面をまるごと使う。背景はその画面を表示している間だけ動き、
 * 右上のボタンで止められる（動きを減らす設定では CSS で止まる）。
 *
 * 本物の画面送りのマス目の代わりに、全画面の時計がある画面だけを見せるマス目（前の画面の列は幅0）に置いている。
 * 上下左右の負の余白は本体と同じ（マス目の余白の分だけはみ出す）。
 */
const meta = {
  title: 'Widgets/ClockFullScreen',
  component: ClockFullScreen,
  tags: ['autodocs'],
  args: { h12: false, page: true },
  argTypes: {
    h12: { description: '設定「12時間表示」' },
    page: { description: 'その画面を表示中（背景が動く）' },
  },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 460,
      setup: (d, a) => {
        d.g.pgW = { clock: true };
        d.setCfg('clock', 'h12', !!a.h12);
        d.ui.page = a.page ? d.layout.value.focusIdx : 0;
      },
    } satisfies LgdParams,
  },
  render: () => ({
    components: { ClockFullScreen },
    setup() {
      const d = useDash();
      const grid = computed(() => {
        const L = d.layout.value;
        return {
          position: 'absolute', inset: '14px 7px 66px', display: 'grid',
          gridTemplateColumns: 'repeat(' + String(Math.max(1, L.focusIdx * L.cols)) + ', 0px) repeat(' + String(L.cols) + ', 1fr)',
          gridTemplateRows: 'repeat(' + String(L.rows) + ', 1fr)',
        };
      });
      return { grid };
    },
    template: '<div :style="grid"><ClockFullScreen /></div>',
  }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '全画面（表示中）' };
export const Paused: Story = { name: 'ほかの画面を表示中（背景が止まる）', args: { page: false } };
export const TwelveHour: Story = { name: '12時間表示', args: { h12: true } };
