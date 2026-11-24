import { builtinModules } from 'node:module';
import pluginVue from 'eslint-plugin-vue';
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

export default withVueTs(
  { rootDir: import.meta.dirname },
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'prototype.jsx', 'design/**', 'vrt/**', 'storybook-static/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommendedTypeChecked,
  {
    // Templates mirror the Claude Design prototype markup; whitespace between inline elements is
    // visible, so formatting rules that insert line breaks are disabled (docs/lgd/development-flow.md).
    files: ['**/*.vue'],
    rules: {
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
    },
  },
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
