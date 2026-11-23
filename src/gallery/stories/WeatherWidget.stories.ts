import type { Meta, StoryObj } from '@storybook/vue3-vite';
import WeatherWidget from '../../widgets/weather/WeatherWidget.vue';
import { setWeatherState } from '../../widgets/weather/status';
import type { WxState } from '../../widgets/weather/weather';
import { widgetLgd } from '../storybook';

type Args = { w: number; h: number; unit: '°C' | '°F'; st: WxState; edit: boolean };

/**
 * 天気（`weather`、部品シート 9章・12章「天気」）。標準 2×1、最小 1×1。見本のデータ（未接続の点つき）。
 * 1×1では湿度を外し、朝・昼・夜の気温だけを残す。大きくすると時間ごと・週の段が増える（初回は下書きのあと表示）。
 * 外部情報の5状態: 通常・読み込み（s-load）・更新中（s-stale）・空（s-empty）・失敗（s-err）。
 */
const meta = {
  title: 'Widgets/WeatherWidget',
  component: WeatherWidget,
  tags: ['autodocs'],
  args: { w: 2, h: 1, unit: '°C', st: 'ok', edit: false },
  argTypes: {
    w: { control: { type: 'range', min: 1, max: 4, step: 1 }, description: '横のマス数' },
    h: { control: { type: 'range', min: 1, max: 3, step: 1 }, description: '縦のマス数' },
    unit: { control: 'inline-radio', options: ['°C', '°F'], description: '設定「単位」' },
    st: { control: 'select', options: ['ok', 'load', 'stale', 'empty', 'err'], description: '状態（表示テスト用）' },
    edit: { description: '編集モード' },
  },
  parameters: { lgd: widgetLgd('weather', (d, a) => { d.setCfg('weather', 'unit', String(a.unit)); setWeatherState(d, a.st as WxState); }) },
  render: () => ({ components: { WeatherWidget }, template: '<WeatherWidget />' }),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Normal: Story = { name: '通常 2×1' };
export const Small: Story = { name: '小型 1×1', args: { w: 1 } };
export const Large: Story = { name: '大きい 4×2（時間ごと・週）', args: { w: 4, h: 2 } };
export const Loading: Story = { name: '読み込み', args: { st: 'load' } };
export const Stale: Story = { name: '更新中', args: { st: 'stale' } };
export const Empty: Story = { name: '空（未接続）', args: { st: 'empty' } };
export const Failed: Story = { name: '失敗', args: { st: 'err' } };
