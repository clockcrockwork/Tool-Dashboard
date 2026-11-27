import type { Meta, StoryObj } from '@storybook/vue3-vite';
import SunWidget from '../../widgets/sun/SunWidget.vue';
import { setSunAsk, setSunGeo } from '../../widgets/sun/status';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; loc: string; geo: 'none' | 'sapporo' | 'tromso'; ask: 'none' | 'ask' | 'no'; veil: boolean; edit: boolean };

/**
 * 日の出・日の入り（`sun`、仕様書 11章、部品シート 12章「日の出・日の入り（許可）」）。標準 2×1、最小 2×1。端末の中の計算だけ（通信しない）。
 * 2×1 は一文＋時刻＋24時間の帯、縦2で太陽の通り道と昼の長さ・薄明・ゴールデンアワー、縦3で7日間。
 * 場所が「現在地」のときの許可のお願いは共通の許可のお願い（`askPerm`、`ask`）。断られたら東京で表示（`no`）。
 * `geo` は取得した現在地の見本（保存しない。sapporo は札幌付近、tromso は白夜・極夜の見本）。
 */
const meta = {
  title: 'Widgets/SunWidget',
  component: SunWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, loc: '東京', geo: 'none', ask: 'none', veil: false, edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 2, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    loc: { control: 'select', options: ['東京', '大阪', '札幌', '福岡', '那覇', '現在地'], description: '設定「場所」' },
    geo: { control: 'inline-radio', options: ['none', 'sapporo', 'tromso'], description: '取得した現在地（場所が「現在地」のとき。保存しない）' },
    ask: { control: 'inline-radio', options: ['none', 'ask', 'no'], description: '現在地の許可のお願い（共通の許可のお願い）' },
    veil: { description: '「中身を隠す」がオンで、このウィジェットを人前では隠す' },
    edit: { description: '編集モード' },
  },
  parameters: {
    lgd: widgetLgd('sun', (d, a) => {
      d.setCfg('sun', 'loc', String(a.loc));
      setSunGeo(d, a.geo === 'sapporo' ? { lat: 43.06, lng: 141.35 } : a.geo === 'tromso' ? { lat: 69.65, lng: 18.96 } : null);
      setSunAsk(d, 'sun', a.ask === 'none' ? null : a.ask === 'no' ? 'no' : 'ask');
      d.g.gs.veil = !!a.veil;
      d.setCfg('sun', 'veil', !!a.veil);
    }),
  },
  render: () => ({ components: { SunWidget }, template: '<SunWidget id="sun" />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1（東京）' };
export const Tall2: Story = { name: '縦2 2×2（太陽の通り道・3つの数）', args: { h: 2 } };
export const Tall3: Story = { name: '縦3 2×3（7日間）', args: { h: 3 } };
export const Here: Story = { name: '現在地（取得済み・札幌付近）', args: { loc: '現在地', geo: 'sapporo', h: 2 } };
export const Polar: Story = { name: '一日中沈まない・昇らない（トロムソ付近）', args: { loc: '現在地', geo: 'tromso', h: 3 } };
export const Ask: Story = { name: '現在地の許可のお願い', args: { loc: '現在地', ask: 'ask' } };
export const Denied: Story = { name: '現在地を使えません（東京で表示中）', args: { loc: '現在地', ask: 'no' } };
export const Veil: Story = { name: '人前では隠す', args: { veil: true } };
