import type { Meta, StoryObj } from '@storybook/vue3-vite';
import GithubWidget from '../../widgets/github/GithubWidget.vue';
import { setGithubState } from '../../widgets/github/status';
import type { SourceState } from '../../widgets/shared/source';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; st: SourceState; veil: boolean; edit: boolean };

/**
 * GitHub PR（`github`、部品シート 9章）。標準 3×2、最小 2×2。見本のデータ（未接続の点つき）。状態アイコン付きの行
 * （Open・Review・Draft・Merged）。外部情報の5状態: 通常・読み込み・更新中・空・失敗。
 */
const meta = {
  title: 'Widgets/GithubWidget',
  component: GithubWidget,
  tags: ['autodocs'],
  args: { w: 3, h: 2, st: 'ok', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 2, max: 3, step: 1 }, description: '縦のマス数' },
    st: { control: 'select', options: ['ok', 'load', 'stale', 'empty', 'err'], description: '状態（表示テスト用）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('github', (d, a) => {
      setGithubState(d, a.st as SourceState);
      d.g.gs.veil = !!a.veil;
      d.setCfg('github', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { GithubWidget }, template: '<GithubWidget id="github" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 3×2' };
export const Small: Story = { name: '小型 2×2', args: { w: 2 } };
export const Loading: Story = { name: '読み込み', args: { st: 'load' } };
export const Stale: Story = { name: '更新中', args: { st: 'stale' } };
export const Empty: Story = { name: '空（未接続）', args: { st: 'empty' } };
export const Failed: Story = { name: '失敗', args: { st: 'err' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
