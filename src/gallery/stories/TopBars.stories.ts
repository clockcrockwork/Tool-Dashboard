import type { Meta, StoryObj } from '@storybook/vue3-vite';
import TopBars from '../../app/shell/overlays/TopBars.vue';
import ToastStack from '../../app/shell/ToastStack.vue';
import { sampleNotice, showNotice } from '../../app/store/overlays';
import type { LgdParams } from '../storybook';

type Args = { notice: boolean; upd: boolean };

/**
 * 上部の帯 `.rcv`（部品シート 6章「知らせの帯」）: 受け渡しの知らせと、新しい版の帯。利用者の判断が要る知らせで、時間で消えない。
 * 2本出るときは縦に重ねる。シート・前面表示・編集中・最初の案内の間は出さない。× で閉じると、次に新しいものが届くまで出さない。
 * 受け渡しの知らせの中身は P2 の受け渡しウィジェットが入れる。ここでは表示テストと同じ見本（`sampleNotice`）。
 */
const meta = {
  title: 'Shell/TopBars',
  component: TopBars,
  tags: ['autodocs'],
  args: { notice: true, upd: false },
  argTypes: { notice: { description: '受け渡しの知らせ' }, upd: { description: '新しい版の帯' } },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 150,
      setup: (d, a) => {
        showNotice(d, a.notice ? sampleNotice(d) : null);
        d.ui.rcvHide = -1;
        Object.assign(d.ui, { upd: !!a.upd, updLater: false });
      },
    } satisfies LgdParams,
  },
  render: () => ({ components: { TopBars, ToastStack }, template: '<TopBars /><ToastStack />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Notice: Story = { name: '受け渡しの知らせ' };
export const NewVersion: Story = { name: '新しい版', args: { notice: false, upd: true } };
export const Both: Story = { name: '2本重なる', args: { notice: true, upd: true } };
