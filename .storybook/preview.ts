/** 全ストーリー共通: フォントと見た目の正本の CSS を読み込み、メモリ上の Dashboard と `.dash` で包む。 */
import type { Preview } from '@storybook/vue3-vite';
import '../src/app/styles/fonts';
import '../src/app/styles/dashboard.css';
import { withDashboard } from '../src/gallery/storybook';

const preview: Preview = {
  decorators: [withDashboard],
  globalTypes: {
    theme: {
      description: 'テーマ（左ライト・右ダークで並べるか、片方だけ）',
      toolbar: {
        title: 'テーマ',
        icon: 'mirror',
        items: [
          { value: 'both', title: '両方並べる' },
          { value: 'light', title: 'ライト' },
          { value: 'dark', title: 'ダーク' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'both' },
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
  },
};

export default preview;
