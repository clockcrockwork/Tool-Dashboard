import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { useArgs } from 'storybook/preview-api';
import RangeInput from '../../app/parts/RangeInput.vue';

/**
 * スライダー `.rg`（部品シート 5章「スライダー」）。連続した値（透明感・品質・音量）。値は横か見出しに数字で出す。
 * 引かずに、タップした位置へ移る。キーボードは矢印・Home・End。動かすたびに値を出す（input イベント）。
 */
const meta = {
  title: 'Parts/RangeInput',
  component: RangeInput,
  tags: ['autodocs'],
  args: { modelValue: 80, min: 40, max: 100, step: 1, label: '品質' },
  argTypes: {
    modelValue: { control: { type: 'number' }, description: '値（v-model）' },
    min: { description: '最小' },
    max: { description: '最大' },
    step: { description: '刻み' },
    label: { description: '読み上げ名' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs();
    return {
      components: { RangeInput },
      setup: () => ({ args, set: (v: number) => { updateArgs({ modelValue: v }); } }),
      template: '<div style="width:220px"><span class="cap">{{ args.label }} {{ args.modelValue }}</span><RangeInput v-bind="args" @update:model-value="set" /></div>',
    };
  },
} satisfies Meta<typeof RangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Quality: Story = { name: '品質 80' };
/** 全体の設定「ガラスの透明感」（0〜100）。 */
export const Glass: Story = { name: 'ガラスの透明感', args: { modelValue: 60, min: 0, max: 100, label: 'ガラスの透明感' } };
