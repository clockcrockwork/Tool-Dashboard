import type { Meta, StoryObj } from '@storybook/vue3-vite';
import LineIcon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';

const names = Object.keys(IC) as (keyof typeof IC)[];

/**
 * 線のアイコン `.i`（部品シート 2章「アイコン」）。24の枠で線の太さ1.6、角は丸。
 * 20px で使い、帯の中では18px、行の中の小さな操作は16px。
 * 既定では飾り（`aria-hidden`）。名前はボタンの側に付ける。単独で意味を持つときだけ `label` を渡す。
 */
const meta = {
  title: 'Parts/LineIcon',
  component: LineIcon,
  tags: ['autodocs'],
  args: { d: IC.home },
  argTypes: {
    d: { control: 'select', options: names, mapping: IC, description: 'パス（`IC` の名前から選ぶ）' },
    size: { control: { type: 'select' }, options: [undefined, 20, 18, 16, 14], description: '大きさ(px)。省略は 20px' },
    label: { control: 'text', description: '読み上げ名。付けると role="img"' },
  },
} satisfies Meta<typeof LineIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ふつうの大きさ（20px）。 */
export const Default: Story = { name: '通常（20px）' };

/** 帯の中（トースト・編集の帯）は 18px。 */
export const InBar: Story = { name: '帯の中（18px）', args: { d: IC.undo, size: 18 } };

/** 行の中の小さな操作と、編集中の印は 16px / 14px。 */
export const InRow: Story = { name: '行の中（16px）', args: { d: IC.plus, size: 16 } };

/** 単独で意味を持つとき（ボタンの外）は読み上げ名を付ける。 */
export const Labeled: Story = { name: '読み上げ名つき', args: { d: IC.offline, label: 'オフライン' } };

/** `src/app/parts/icons.ts` の全部。部品シートの一覧は Design Pattern Gallery の 2章。 */
export const All: Story = {
  name: '一覧（IC）',
  render: () => ({
    components: { LineIcon },
    setup: () => ({ IC, names }),
    // .icns / .icn は部品シートだけの見本用クラス（src/gallery/gallery.css）なので、ここでは同じ値を直接書く。
    template: `<div style="display:flex;flex-wrap:wrap;gap:6px;max-width:520px"><span v-for="n in names" :key="n" :title="n" style="width:40px;height:40px;display:grid;place-items:center;border-radius:10px;background:var(--fill)"><LineIcon :d="IC[n]" /></span></div>`,
  }),
};
