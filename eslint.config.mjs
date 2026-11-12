import pluginVue from 'eslint-plugin-vue';
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

export default withVueTs(
  { rootDir: import.meta.dirname },
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'prototype.jsx'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommendedTypeChecked,
  {
    files: ['src/core/**/*.ts', 'src/tools/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-restricted-imports': ['error', { patterns: [
        { group: ['vue', 'vite', 'hono', '@cloudflare/*', '**/web/**', '**/board/**'], message: 'Core must be platform independent.' },
      ] }],
    },
  },
);
