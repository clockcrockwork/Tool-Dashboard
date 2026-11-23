import type { Meta, StoryObj } from '@storybook/vue3-vite';
import SearchWidget from '../../widgets/search/SearchWidget.vue';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; eng: string; url: string; edit: boolean };

/** 検索（`search`）。標準 3×1、最小 2×1。Enter は変換中を除く。独自の検索URL（%s が検索語）を入れると対象の切替は出さない。 */
const meta = {
  title: 'Widgets/SearchWidget',
  component: SearchWidget,
  tags: ['autodocs'],
  args: { w: 3, h: 1, eng: 'Google', url: '', edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    eng: { control: 'select', options: ['Google', 'Bing', 'DuckDuckGo', 'Yahoo!'], description: '設定「検索先」' },
    url: { control: 'text', description: '設定「独自の検索URL」' },
    edit: { description: '編集モード' },
  },
  parameters: { lgd: widgetLgd('search', (d, a) => { d.setCfg('search', 'eng', String(a.eng)); d.setCfg('search', 'url', String(a.url)); }) },
  render: () => ({ components: { SearchWidget }, template: '<SearchWidget />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 3×1' };
export const Small: Story = { name: '小型 2×1', args: { w: 2 } };
export const CustomUrl: Story = { name: '独自の検索URL', args: { url: 'https://example.com/?q=%s' } };
