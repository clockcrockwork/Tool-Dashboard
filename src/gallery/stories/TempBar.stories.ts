import type { Meta, StoryObj } from '@storybook/vue3-vite';
import TempBar from '../../app/shell/overlays/TempBar.vue';
import ToastStack from '../../app/shell/ToastStack.vue';
import { boards } from '../dash';
import type { LgdParams } from '../storybook';

type Args = { id: string; boards: number };

/**
 * 一時利用の帯 `.tmpbar`（仕様書 2章「置かずに使う」、部品シート 7章「置かずに使う帯」）。
 * 「ウィジェットを追加」の ▶ で、置かずに開いているときだけ下に出る。「‹ 戻る」で開いたシートへ戻り、
 * 「「ボード名」に追加」で今のボード（追加先）に置く。
 */
const meta = {
  title: 'Shell/TempBar',
  component: TempBar,
  tags: ['autodocs'],
  args: { id: 'memo', boards: 1 },
  argTypes: {
    id: { control: 'select', options: ['memo', 'todo', 'links', 'clock', 'weather'], description: '置かずに使っているウィジェット' },
    boards: { control: { type: 'range', min: 1, max: 6 }, description: 'ボードの数（追加先の名前が変わる）' },
  },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 120,
      setup: (d, a) => {
        const id = String(a.id);
        boards(d, Number(a.boards) || 1);
        d.g.off = { [id]: true };
        Object.assign(d.ui, { temp: id, big: id, ret: 'add', panel: 'none' });
      },
    } satisfies LgdParams,
  },
  render: () => ({ components: { TempBar, ToastStack }, template: '<TempBar /><ToastStack />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Memo: Story = { name: 'メモを置かずに使う' };
export const TwoBoards: Story = { name: 'ボードが2つ', args: { id: 'todo', boards: 2 } };
