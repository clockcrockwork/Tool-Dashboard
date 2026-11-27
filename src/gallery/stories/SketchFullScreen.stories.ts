import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';
import SketchFullScreen from '../../widgets/sketch/SketchFullScreen.vue';
import { useDash } from '../../app/context';
import { clearPad } from '../../widgets/sketch/status';
import type { LgdParams } from '../storybook';
import { sampleStrokes } from './sketch-sample';

type Args = { drawn: boolean };

/**
 * スケッチの全画面 `.fsw`（仕様書 2章「全画面ウィジェット」: スケッチの絵は全画面にしても残る）。手書き面 `.fsw-surf`、
 * 何も描いていないときの案内 `.fsw-hint`、下の帯 `.fsw-bar`（太さ・色・1つ戻す・すべて消去）。線は通常のスケッチと同じもの（保存しない）。
 * 本物の画面送りのマス目の代わりに、全画面のスケッチがある画面だけを見せるマス目に置いている（時計の全画面と同じ。スケッチは最初の構成では未配置なので置く）。
 */
const meta = {
  title: 'Widgets/SketchFullScreen',
  component: SketchFullScreen,
  tags: ['autodocs'],
  args: { drawn: false },
  argTypes: { drawn: { description: '見本の線を描いた状態（通常の大きさで描いた線もそのまま出る）' } },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 460,
      setup: (d, a) => {
        d.g.pgW = { sketch: true };
        d.g.off = { ...d.g.off, sketch: false };
        if (a.drawn) sampleStrokes(d, 'sketch');
        else clearPad(d, 'sketch');
        d.ui.page = d.layout.value.fullScreens[0]?.page ?? 0;
      },
    } satisfies LgdParams,
  },
  render: () => ({
    components: { SketchFullScreen },
    setup() {
      const d = useDash();
      const grid = computed(() => {
        const L = d.layout.value;
        const page = L.fullScreens[0]?.page ?? 0;
        return {
          position: 'absolute', inset: '14px 7px 66px', display: 'grid',
          gridTemplateColumns: 'repeat(' + String(Math.max(1, page * L.cols)) + ', 0px) repeat(' + String(L.cols) + ', 1fr)',
          gridTemplateRows: 'repeat(' + String(L.rows) + ', 1fr)',
        };
      });
      return { grid };
    },
    template: '<div :style="grid"><SketchFullScreen id="sketch" /></div>',
  }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '全画面（何も描いていない）' };
export const Drawn: Story = { name: '全画面（描いた状態）', args: { drawn: true } };
