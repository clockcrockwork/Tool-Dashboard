import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { useArgs } from 'storybook/preview-api';
import NumStepper from '../../app/parts/NumStepper.vue';

/**
 * 数のステッパー `.stp`（部品シート 5章「数のステッパー」）。小さな整数（割り勘の人数、トーストの秒数、メモの文字サイズ…）。
 * 押し続けると 0.5秒後から速く進む。真ん中は直接入力でき、範囲外は無視。↑↓、PageUp / PageDown で10ずつ。
 * 最小・最大に達すると − / ＋ が押せなくなる。
 */
const meta = {
  title: 'Parts/NumStepper',
  component: NumStepper,
  tags: ['autodocs'],
  args: { modelValue: 4, min: 1, max: 20, step: 1, unit: '', label: '人数' },
  argTypes: {
    modelValue: { control: { type: 'number' }, description: '値（v-model）' },
    min: { description: '最小' },
    max: { description: '最大' },
    step: { description: '刻み（ポモドーロの集中時間は5）' },
    unit: { description: '単位（%・秒・px など）' },
    label: { description: '読み上げ名' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs();
    return {
      components: { NumStepper },
      setup: () => ({ args, set: (v: number) => { updateArgs({ modelValue: v }); } }),
      template: '<NumStepper v-bind="args" @update:model-value="set" />',
    };
  },
} satisfies Meta<typeof NumStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = { name: '通常' };
export const AtMin: Story = { name: '最小に達した', args: { modelValue: 1 } };
export const WithUnit: Story = { name: '単位つき（%）', args: { modelValue: 10, min: 0, max: 30, unit: '%', label: '税率' } };
export const Step5: Story = { name: '5分刻み', args: { modelValue: 25, min: 5, max: 90, step: 5, unit: '分', label: '集中' } };
