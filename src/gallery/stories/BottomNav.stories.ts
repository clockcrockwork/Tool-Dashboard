import type { Meta, StoryObj } from '@storybook/vue3-vite';
import BottomNav from '../../app/shell/BottomNav.vue';
import { boards } from '../dash';
import type { LgdParams } from '../storybook';

type NavArgs = { boards: number; page: number; edit: boolean; tour: number };

/**
 * 下部バー `.nav`（仕様書 4章「下部バーの並び」、部品シート 7章「下部バーと画面の点」「画面が多いときの表示」）。
 *
 * ふだん: ⌂ ‹ 画面の点 › 一覧・編集・設定。これ以上ボタンを足さない。⌂ はホームでは押せない。
 * 編集モード: 元に戻す・ボード・ウィジェット・完了（`.dash.edit` のときだけ `.ebar` が出る）。
 * 画面の点は7つまで。8画面以上（または点が入りきらない幅）では「3 / 12」と進み具合の線を出し、押すと一覧を開く。
 *
 * 空のボードは1画面として数えるので、ここでは `boards` の数をそのまま画面の数にしている。
 */
const meta = {
  title: 'Shell/BottomNav',
  component: BottomNav,
  tags: ['autodocs'],
  args: { boards: 3, page: 0, edit: false, tour: -1 },
  argTypes: {
    boards: { control: { type: 'range', min: 1, max: 14, step: 1 }, description: 'ボードの数（＝画面の数）' },
    page: { control: { type: 'number', min: 0 }, description: '今の画面（0から）' },
    edit: { description: '編集モード' },
    tour: { control: 'select', options: [-1, 0, 1, 2, 3], description: '最初の案内の段（-1 は案内なし）。強調するボタンが変わる' },
  },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 76,
      setup: (d, a) => {
        boards(d, Number(a.boards) || 1);
        d.ui.page = Number(a.page) || 0;
        d.ui.edit = !!a.edit;
        d.ui.tour = Number(a.tour);
      },
    } satisfies LgdParams,
  },
  render: () => ({ components: { BottomNav }, template: '<BottomNav />' }),
} satisfies Meta<NavArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ホームの画面（⌂ は押せない）。画面の点が3つ。 */
export const Normal: Story = { name: '通常' };

/** 2つ目の画面。⌂ が押せるようになる。 */
export const SecondScreen: Story = { name: '2画面目', args: { page: 1 } };

/** 編集モードの帯。元に戻すは履歴がないので押せない。 */
export const EditMode: Story = { name: '編集モード', args: { edit: true } };

/** 8画面以上は点の代わりに「3 / 12」と進み具合の線。 */
export const ManyScreens: Story = { name: '画面が多いとき（3 / 12）', args: { boards: 12, page: 2 } };

/** 最初の案内の2段目: 一覧のボタンを強調（`.hl`）。 */
export const Tour: Story = { name: '最初の案内で強調', args: { tour: 1 } };
