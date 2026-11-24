import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { useArgs } from 'storybook/preview-api';
import SwitchToggle from '../../app/parts/SwitchToggle.vue';

/**
 * スイッチ `.sw`（部品シート 5章「スイッチ」）。すぐ効く入り切り。保存ボタンは置かない。
 * `role="switch"` と `aria-checked`。名前（`label`）は設定の行の文言と同じにする。つまみは 0.2秒で移る。
 * 押すと Controls の `modelValue` も変わる。
 */
const meta = {
  title: 'Parts/SwitchToggle',
  component: SwitchToggle,
  tags: ['autodocs'],
  args: { modelValue: false, label: '1文字のキー操作', disabled: false },
  argTypes: {
    modelValue: { control: 'boolean', description: 'オン・オフ（v-model）' },
    label: { description: '読み上げ名（行の文言と同じ）' },
    disabled: { description: '無効（不透明度 0.4）' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs();
    return {
      components: { SwitchToggle },
      setup: () => ({ args, set: (v: boolean) => { updateArgs({ modelValue: v }); } }),
      template: '<SwitchToggle v-bind="args" @update:model-value="set" />',
    };
  },
} satisfies Meta<typeof SwitchToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = { name: 'オフ' };
export const On: Story = { name: 'オン', args: { modelValue: true } };
export const Disabled: Story = { name: '無効', args: { disabled: true } };
