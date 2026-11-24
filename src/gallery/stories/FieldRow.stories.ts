import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import FieldRow from '../../app/parts/FieldRow.vue';
import SwitchToggle from '../../app/parts/SwitchToggle.vue';
import SegChoice from '../../app/parts/SegChoice.vue';
import RangeInput from '../../app/parts/RangeInput.vue';

/**
 * 設定の1行 `.fld`（部品シート 5章「スイッチ」の設定の行、7章「シート」）。左に名前、右に操作。
 * 名前に文字以外を混ぜたいときは `label` スロットを使う。操作の読み上げ名は行の文言と同じにする。
 */
const meta = {
  title: 'Parts/FieldRow',
  component: FieldRow,
  tags: ['autodocs'],
  args: { label: '1文字のキー操作' },
  argTypes: { label: { description: '左の名前' } },
  render: args => ({
    components: { FieldRow, SwitchToggle },
    setup: () => ({ args, on: ref(true) }),
    template: '<div class="sheet shx" style="position:relative;display:block;opacity:1;translate:none;width:324px"><FieldRow v-bind="args"><SwitchToggle v-model="on" :label="args.label" /></FieldRow></div>',
  }),
} satisfies Meta<typeof FieldRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** スイッチの行。 */
export const WithSwitch: Story = { name: 'スイッチ' };

/** いろいろな操作の行（シートの中の並び）。 */
export const Rows: Story = {
  name: '行の並び（スイッチ・選択の並び・スライダー）',
  render: () => ({
    components: { FieldRow, SwitchToggle, SegChoice, RangeInput },
    setup: () => ({ wheel: ref(true), dens: ref(1), glass: ref(60) }),
    template: `<div class="sheet shx" style="position:relative;display:block;opacity:1;translate:none;width:324px">
      <FieldRow label="ウィジェットの大きさ"><SegChoice v-model="dens" :options="[[0, '小'], [1, '中'], [2, '大']]" label="ウィジェットの大きさ" /></FieldRow>
      <FieldRow label="ホイールで画面を切り替え"><SwitchToggle v-model="wheel" label="ホイールで画面を切り替え" /></FieldRow>
      <FieldRow label="ガラスの透明感"><RangeInput v-model="glass" :min="0" :max="100" label="ガラスの透明感" /></FieldRow>
    </div>`,
  }),
};
