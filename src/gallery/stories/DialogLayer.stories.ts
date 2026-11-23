import type { Meta, StoryObj } from '@storybook/vue3-vite';
import DialogLayer from '../../app/shell/overlays/DialogLayer.vue';
import ToastStack from '../../app/shell/ToastStack.vue';
import { useDash } from '../../app/context';
import { DIALOG_SAMPLES } from '../../app/store/overlays';
import type { LgdParams } from '../storybook';

type Args = { kind: 'alert' | 'confirm' };

/**
 * 確認と警告のダイアログ `.dlg`（仕様書 3章・5章、部品シート 6章「ダイアログ」）。取り消せない操作の確認と、必ず読んでほしいお知らせだけ。
 * それ以外はトーストか帯にする。開いたら、取り消せない確認は「キャンセル」、お知らせは「閉じる」にフォーカス。
 * Esc と暗幕でキャンセル。閉じたら開いたボタンへフォーカスを戻す。背後は inert。
 * 見本は表示テストと同じ文（`DIALOG_SAMPLES`）。押すと閉じる（「試す」で開き直せる）。
 */
const meta = {
  title: 'Shell/DialogLayer',
  component: DialogLayer,
  tags: ['autodocs'],
  args: { kind: 'confirm' },
  argTypes: { kind: { control: 'inline-radio', options: ['alert', 'confirm'], description: 'お知らせ（1つ）か確認（2つ）' } },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 300,
      setup: (d, a) => { d.ui.dlg = a.kind === 'alert' ? DIALOG_SAMPLES.alert() : DIALOG_SAMPLES.confirm(d); },
    } satisfies LgdParams,
  },
  render: () => ({ components: { DialogLayer }, template: '<DialogLayer />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** 取り消せない操作の確認（キャンセル・削除する）。 */
export const Confirm: Story = { name: '確認' };
/** お知らせ（閉じる だけ）。 */
export const Alert: Story = { name: 'お知らせ', args: { kind: 'alert' } };

/** ボタンから開く。フォーカスの移り方と、閉じたあとに開いたボタンへ戻ることを確かめる。 */
export const Try: Story = {
  name: '試す（開いて閉じる）',
  parameters: { lgd: { layout: 'bar', height: 320, timers: true, setup: d => { d.ui.dlg = null; } } satisfies LgdParams },
  render: () => ({
    components: { DialogLayer, ToastStack },
    setup: () => {
      const d = useDash();
      return { alert: () => { d.confirm(DIALOG_SAMPLES.alert()); }, confirm: () => { d.confirm(DIALOG_SAMPLES.confirm(d)); } };
    },
    template: '<div style="display:flex;gap:8px;padding:8px"><button class="chip" @click="alert">お知らせを開く</button><button class="chip" @click="confirm">確認を開く</button></div><DialogLayer /><ToastStack />',
  }),
};
