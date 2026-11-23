import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { useArgs } from 'storybook/preview-api';
import CollapseSection from '../../app/parts/CollapseSection.vue';

/**
 * 折りたたみの節 `.dsh` / `.dsc` / `.dsb`（部品シート 8章「折りたたみの節」）。全体の設定の節（外観・レイアウト・操作・ローカルAI・表示テスト・データ）。
 * 見出しの中のボタンに `aria-expanded`。開いている節はこの端末に覚える（既定は外観とレイアウトだけ開く）。開け閉めは「元に戻す」の対象にしない。
 * 押すと Controls の `open` が変わる。
 */
const meta = {
  title: 'Parts/CollapseSection',
  component: CollapseSection,
  tags: ['autodocs'],
  args: { title: 'データ', open: true },
  argTypes: { title: { description: '節の名前' }, open: { description: '開いている' } },
  render: (args) => {
    const [, updateArgs] = useArgs();
    return {
      components: { CollapseSection },
      setup: () => ({ args, toggle: () => { updateArgs({ open: !args.open }); } }),
      template: `<div class="sheet shx" style="position:relative;display:block;opacity:1;translate:none;width:300px">
        <CollapseSection v-bind="args" @toggle="toggle"><div style="display:flex;gap:8px;padding:4px 0 8px"><button class="chip">書き出し（コピー）</button></div></CollapseSection>
      </div>`,
    };
  },
} satisfies Meta<typeof CollapseSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { name: '開いた節' };
export const Closed: Story = { name: '閉じた節', args: { title: 'ローカルAI', open: false } };
