import type { Meta, StoryObj } from '@storybook/vue3-vite';
import RssWidget from '../../widgets/rss/RssWidget.vue';
import { setRssFeed, setRssState } from '../../widgets/rss/status';
import type { SourceState } from '../../widgets/rss/source';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; feed: number; st: SourceState; veil: boolean; edit: boolean };

/**
 * RSS（`rss`、部品シート 9章）。標準 3×3、最小 2×2。見本のデータ（未接続の点つき）。切替でフィードを選び、選んだ中を縦に送る。
 * 選んでいるフィードは保存しない（プロトタイプと同じ）。外部情報の5状態: 通常・読み込み・更新中・空・失敗。
 */
const meta = {
  title: 'Widgets/RssWidget',
  component: RssWidget,
  tags: ['autodocs'],
  args: { w: 3, h: 3, feed: 0, st: 'ok', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 2, max: 3, step: 1 }, description: '縦のマス数' },
    feed: { control: 'inline-radio', options: [0, 1, 2], description: '選んでいるフィード（Dev / Design / Tools）' },
    st: { control: 'select', options: ['ok', 'load', 'stale', 'empty', 'err'], description: '状態（表示テスト用）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('rss', (d, a) => {
      setRssFeed(d, 'rss', Number(a.feed));
      setRssState(d, a.st as SourceState);
      d.g.gs.veil = !!a.veil;
      d.setCfg('rss', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { RssWidget }, template: '<RssWidget id="rss" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 3×3（Dev）' };
export const Design: Story = { name: 'Design を選んだ', args: { feed: 1 } };
export const Small: Story = { name: '小型 2×2', args: { w: 2, h: 2 } };
export const Loading: Story = { name: '読み込み', args: { st: 'load' } };
export const Stale: Story = { name: '更新中', args: { st: 'stale' } };
export const Empty: Story = { name: '空（未接続）', args: { st: 'empty' } };
export const Failed: Story = { name: '失敗', args: { st: 'err' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
