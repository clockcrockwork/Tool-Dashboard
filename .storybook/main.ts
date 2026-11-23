// Storybook（部品の状態と操作の確認）。使い方は docs/lgd/gallery-and-storybook.md。
// ストーリーは src/ 以下の *.stories.ts（今は src/gallery/stories/ にまとめて置いている）。
// Vite の設定はリポジトリ直下の vite.config.ts（@vitejs/plugin-vue）をそのまま使う。
import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  // vue-docgen-api は 10.x で非推奨の警告が出るため、型から読む vue-component-meta を使う（Controls の推定に使う）。
  framework: { name: '@storybook/vue3-vite', options: { docgen: { plugin: 'vue-component-meta', tsconfig: 'tsconfig.app.json' } } },
  core: { disableTelemetry: true },
};

export default config;
