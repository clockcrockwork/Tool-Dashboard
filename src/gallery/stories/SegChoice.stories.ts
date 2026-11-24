import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { ConcreteComponent } from 'vue';
import { useArgs } from 'storybook/preview-api';
import SegChoice from '../../app/parts/SegChoice.vue';

type Args = { options: readonly (readonly [string, string])[]; modelValue: string; label: string };

/**
 * 選択の並び `.seg` / `.sg`（部品シート 5章「選択の並び」）。同じ画面の見せ方を 2〜4個から1つ選ぶ。
 * 5個以上や、利用者が作る項目は切替チップか選択メニュー（`SelectButton`）にする。
 * 並び全体に `role="group"` と名前、選んでいるものに `aria-pressed="true"`。押すと Controls の `modelValue` も変わる。
 */
const meta = {
  title: 'Parts/SegChoice',
  // 総称型（generic）の部品は Meta の型に合わないので、文字列の値の部品として渡す
  component: SegChoice as unknown as ConcreteComponent<Args>,
  tags: ['autodocs'],
  args: { options: [['web', 'ウェブ'], ['img', '画像'], ['vid', '動画']], modelValue: 'web', label: '検索の種類' },
  argTypes: {
    options: { control: 'object', description: '[値, 文言] の並び（2〜4個）' },
    modelValue: { control: 'text', description: '選んでいる値（v-model）' },
    label: { description: '並び全体の読み上げ名' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs();
    return {
      components: { SegChoice },
      setup: () => ({ args, set: (v: string) => { updateArgs({ modelValue: v }); } }),
      template: '<SegChoice v-bind="args" @update:model-value="set" />',
    };
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Three: Story = { name: '3択' };
export const Two: Story = { name: '2択（PC・スマホ）', args: { options: [['pc', 'PC'], ['m', 'スマホ']], modelValue: 'm', label: '表示' } };
/** 全体の設定の「テーマ」と同じ並び。 */
export const Theme: Story = { name: 'テーマ（自動・ライト・ダーク）', args: { options: [['auto', '自動'], ['light', 'ライト'], ['dark', 'ダーク']], modelValue: 'auto', label: 'テーマ' } };
