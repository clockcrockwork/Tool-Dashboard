import { builtinModules } from 'node:module';
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
      'no-restricted-globals': ['error', ...['window', 'document', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator', 'globalThis', 'self'].map(name => ({ name, message: 'Inject a narrow host-independent port instead.' }))],
      'no-restricted-syntax': ['error', { selector: 'ImportExpression', message: 'Core dependencies must be statically reviewable.' }],
      'no-restricted-imports': ['error', { paths: builtinModules, patterns: [
        { group: ['vue', 'vue/**', '@vue/**', 'vite', 'hono', 'hono/**', '@cloudflare/*', 'cloudflare:*', 'node:*', '**/*.vue', '**/web/**', '**/board/**'], message: 'Core must be platform independent.' },
      ] }],
    },
  },
  {
    files: ['src/core/parts.ts', 'src/core/tokens.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['*'], message: 'Parts and tokens are dependency-free declarations.' }] }],
    },
  },
);
