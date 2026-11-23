import type { Meta, StoryObj } from '@storybook/vue3-vite';
import SelectButton from '../../app/parts/SelectButton.vue';
import MenuLayer from '../../app/shell/overlays/MenuLayer.vue';
import { useDash } from '../../app/context';
import { openSelectMenu } from '../../app/store/overlays';
import { selectExpanded, selectLabel } from '../../app/store/sheets';
import { boards } from '../dash';
import type { LgdParams } from '../storybook';

/**
 * 選択メニューを開くボタン `.chip.sel`（部品シート 5章「選択メニュー」）。選ぶものが5個以上のとき（日の出・日の入りの場所、
 * ボードが5つ以上のときの「ホーム」「追加先」「置くボード」）。4個までは選択の並び（`SegChoice`）。
 * メニューそのものは重なる層（`MenuLayer`、Shell/MenuLayer）が描く。見えない名前「場所：」を値の前に読み上げる。
 */
const meta = {
  title: 'Parts/SelectButton',
  component: SelectButton,
  tags: ['autodocs'],
  args: { label: '場所', value: '東京', expanded: false },
  argTypes: {
    label: { description: '読み上げ名（見えない）' },
    value: { description: '選んでいる値' },
    expanded: { description: 'メニューが開いている（aria-expanded）' },
  },
} satisfies Meta<typeof SelectButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = { name: '閉じている' };
export const Expanded: Story = { name: '開いている（ボタンだけ）', args: { expanded: true } };

/** 本物の選択メニューとつないだ例。押すと「ホーム」の選択メニューが開き、選ぶと値が変わる（ボード6つ）。 */
export const WithMenu: Story = {
  name: '押して選ぶ（ホーム、ボード6つ）',
  parameters: { lgd: { layout: 'bar', height: 420, setup: d => { boards(d, 6); } } satisfies LgdParams },
  render: () => ({
    components: { SelectButton, MenuLayer },
    setup: () => {
      const d = useDash();
      return {
        d, selectLabel, selectExpanded,
        open: (e: MouseEvent) => {
          const btn = e.currentTarget as HTMLElement;
          const root = btn.closest<HTMLElement>('.dash');
          if (root) openSelectMenu(d, root, 'home', 'ホーム', btn);
        },
      };
    },
    template: '<div style="padding:8px"><SelectButton label="ホーム" :value="selectLabel(d, \'home\')" :expanded="selectExpanded(d, \'home\')" @open="open" /></div><MenuLayer />',
  }),
};
