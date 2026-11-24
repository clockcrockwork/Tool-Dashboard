import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { useArgs } from 'storybook/preview-api';
import SizeGrid from '../../app/parts/SizeGrid.vue';

/**
 * 大きさのマス `.sz`（部品シート 5章「大きさのマス」）。ウィジェットの設定で大きさを選ぶ 4×3 のマスと「全画面」。
 * 押せるのは、登録の `min`・`max` と、その端末のボードの列数・行数（`cols`・`rows`）に収まるマスだけ。
 * 「全画面」は登録で `pg: true` のもの（時計・スケッチ）だけ。選ぶとマスはどれも選ばれていない見た目になる。
 * マスを押すと Controls の `size` が、「全画面」を押すと `full` が変わる。
 */
const meta = {
  title: 'Parts/SizeGrid',
  component: SizeGrid,
  tags: ['autodocs'],
  args: { size: [2, 2], min: [1, 1], max: [4, 3], cols: 4, rows: 3, locked: false, canFull: false, full: false },
  argTypes: {
    size: { control: 'object', description: '今の大きさ [横, 縦]' },
    min: { control: 'object', description: '登録の最小 [横, 縦]' },
    max: { control: 'object', description: '登録の最大 [横, 縦]' },
    cols: { control: { type: 'range', min: 2, max: 8 }, description: 'その端末のボードの列数（スマホは2）' },
    rows: { control: { type: 'range', min: 1, max: 6 }, description: 'その端末のボードの行数' },
    locked: { description: '大きさを固定中（すべて押せない）' },
    canFull: { description: '全画面にできる（登録の pg）' },
    full: { description: '全画面を選んでいる' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs();
    return {
      components: { SizeGrid },
      setup: () => ({
        args,
        pick: (w: number, h: number) => { updateArgs({ size: [w, h], full: false }); },
        toggleFull: () => { updateArgs({ full: !args.full }); },
      }),
      template: '<SizeGrid v-bind="args" @pick="pick" @full="toggleFull" />',
    };
  },
} satisfies Meta<typeof SizeGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = { name: '選んだ範囲（2×2）' };
export const Locked: Story = { name: '大きさを固定中', args: { locked: true } };
export const Phone: Story = { name: '収まらないマス（最小2×2、スマホの2列）', args: { min: [2, 2], cols: 2 } };
export const FullScreen: Story = { name: '全画面にできるもの（全画面を選択中）', args: { size: [2, 1], canFull: true, full: true } };
