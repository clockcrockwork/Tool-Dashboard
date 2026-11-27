import type { Meta, StoryObj } from '@storybook/vue3-vite';
import SheetsHost from '../../app/shell/sheets/SheetsHost.vue';
import OverlaysHost from '../../app/shell/overlays/OverlaysHost.vue';
import ToastStack from '../../app/shell/ToastStack.vue';
import type { Panel } from '../../app/store/types';
import type { LgdParams } from '../storybook';

type Args = { panel: Exclude<Panel, 'none'>; sel: string; narrow: boolean };

/**
 * シート6枚（仕様書 3章・4章、部品シート 7章「シート」）: 全体の設定・操作ヒント・端末をつなぐ・ウィジェット一覧・
 * ウィジェットを追加・ウィジェットの設定。`d.ui.panel` で開く（ウィジェットの設定は `d.ui.sel` も）。
 *
 * PCは右（幅324px）、幅720px未満は下から（`narrow`）。ウィジェットの設定だけは暗幕を敷かず、選んだウィジェットの反対側に出る。
 * 見出しの「‹」や外側で1つ前の層に戻る。重なる層（選択メニュー・ダイアログ・一時利用の帯）とトーストも一緒に置いてあるので、
 * シートの中の操作はそのまま動く（保存はメモリの中だけ）。
 */
const meta = {
  title: 'Shell/Sheets',
  component: SheetsHost,
  tags: ['autodocs'],
  args: { panel: 'global', sel: 'todo', narrow: false },
  argTypes: {
    panel: { control: 'select', options: ['global', 'help', 'devices', 'index', 'add', 'widget'], description: '開くシート（d.ui.panel）' },
    sel: { control: 'select', options: ['clock', 'search', 'weather', 'rain', 'todo', 'links', 'memo', 'alarm', 'pomo'], description: 'ウィジェットの設定で選ぶウィジェット（d.ui.sel）' },
    narrow: { description: '幅720px未満の端末（下からのシート）' },
  },
  parameters: {
    lgd: {
      layout: 'bar',
      height: 780,
      setup: (d, a) => {
        d.env.width = a.narrow ? 390 : 1440;
        d.env.height = a.narrow ? 844 : 900;
        Object.assign(d.ui, { panel: a.panel, sel: a.panel === 'widget' ? String(a.sel) : null, edit: a.panel === 'widget' });
      },
    } satisfies LgdParams,
  },
  render: () => ({ components: { SheetsHost, OverlaysHost, ToastStack }, template: '<SheetsHost /><ToastStack /><OverlaysHost />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** 全体の設定（外観・レイアウト・操作・ローカルAI・表示テスト・データの折りたたみの節）。 */
export const Global: Story = { name: '全体の設定' };
/** 操作ヒント（キーと操作の一覧、使い始めの準備）。 */
export const Help: Story = { name: '操作ヒント', args: { panel: 'help' } };
/** 端末をつなぐ（受け渡しの相手）。 */
export const Devices: Story = { name: '端末をつなぐ', args: { panel: 'devices' } };
/** ウィジェット一覧（ボードごとの並び。名前を押すとその場所へ）。 */
export const Index: Story = { name: 'ウィジェット一覧', args: { panel: 'index' } };
/** ウィジェットを追加（検索欄・分類・一覧の行。▶ で置かずに使う、＋ で追加）。 */
export const Add: Story = { name: 'ウィジェットを追加', args: { panel: 'add' } };
/** ウィジェットの設定（サイズ・固定・人前では隠す・固有の項目・置くボード・並び順・外す）。暗幕なし。 */
export const Widget: Story = { name: 'ウィジェットの設定（TODO）', args: { panel: 'widget', sel: 'todo' } };
/** ウィジェットの設定で全画面にできるもの（時計）。 */
export const WidgetClock: Story = { name: 'ウィジェットの設定（時計・全画面あり）', args: { panel: 'widget', sel: 'clock' } };
/** 通知を使う種類（`perm: ['notify']`）の設定: 固有の項目のあとに共通の一文「ダッシュボードを開いている間だけ知らせます」（実装ガイド 7.2）。 */
export const WidgetPomo: Story = { name: 'ウィジェットの設定（ポモドーロ・通知の一文）', args: { panel: 'widget', sel: 'pomo' } };
export const WidgetAlarm: Story = { name: 'ウィジェットの設定（アラーム・通知の一文）', args: { panel: 'widget', sel: 'alarm' } };
/** スマホ（幅390px）では下からのシート。 */
export const Narrow: Story = {
  name: 'スマホ（下からのシート）',
  args: { narrow: true },
  parameters: { lgd: { layout: 'bar', height: 780, width: 390, setup: meta.parameters.lgd.setup } satisfies LgdParams },
};
