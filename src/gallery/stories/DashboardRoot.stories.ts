import type { Meta, StoryObj } from '@storybook/vue3-vite';
import DashboardRoot from '../../app/shell/DashboardRoot.vue';
import { useDash } from '../../app/context';
import type { Panel } from '../../app/store/types';
import type { LgdParams } from '../storybook';

type Args = { edit: boolean; panel: Panel; sel: string; tour: number };

/**
 * ダッシュボード全体 `DashboardRoot`（実装ガイド 2章、プロトタイプ Main.dc.html の画面そのもの）。
 * 壁紙・横に送る画面のマス目・ウィジェット・下部バー・シート・トースト・重なる層をすべて含む。保存はメモリの中だけ、時刻は 10:24:36 に固定。
 *
 * 入れ物で包まず（`bare`）、Storybook の画面いっぱいに描く。ツールバーの「テーマ」はライト／ダーク（両方並べるときは「自動」）。
 * キー操作（← → Home Esc / , E 1〜9 Ctrl+Z）もそのまま効く。
 */
const meta = {
  title: 'Shell/DashboardRoot',
  component: DashboardRoot,
  tags: ['autodocs'],
  args: { edit: false, panel: 'none', sel: '', tour: -1 },
  argTypes: {
    edit: { description: '編集モード' },
    panel: { control: 'select', options: ['none', 'global', 'help', 'devices', 'index', 'add', 'widget'], description: '開いているシート' },
    sel: { control: 'select', options: ['', 'clock', 'search', 'weather', 'rain', 'todo', 'links', 'memo'], description: '選んでいるウィジェット（ウィジェットの設定）' },
    tour: { control: { type: 'range', min: -1, max: 4, step: 1 }, description: '最初の案内の手順（-1 は無し）' },
  },
  parameters: {
    layout: 'fullscreen',
    lgd: {
      bare: true,
      setup: (d, a) => {
        Object.assign(d.ui, { edit: !!a.edit, panel: a.panel, sel: typeof a.sel === 'string' && a.sel ? a.sel : null, tour: Number(a.tour) });
        d.g.tourDone = Number(a.tour) < 0;
      },
    } satisfies LgdParams,
  },
  render: () => ({ components: { DashboardRoot }, setup: () => ({ d: useDash() }), template: '<DashboardRoot :dash="d" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

/** ホーム（最初の画面）。 */
export const Home: Story = { name: 'ホーム' };
/** 編集モード（枠が点線、下部バーが編集の帯に替わる、上に「編集中」の帯）。 */
export const EditMode: Story = { name: '編集モード', args: { edit: true } };
/** 編集モードで TODO を選び、ウィジェットの設定を開いたところ（選択の枠つき）。 */
export const EditSelected: Story = { name: '編集モード・ウィジェットの設定', args: { edit: true, panel: 'widget', sel: 'todo' } };
/** 全体の設定を開いたところ。 */
export const Settings: Story = { name: '設定を開いたとき', args: { panel: 'global' } };
/** はじめて開いたときの案内（1手順目）。 */
export const FirstRun: Story = { name: '最初の案内', args: { tour: 0 } };
