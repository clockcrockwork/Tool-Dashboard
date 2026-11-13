import { ESLint } from 'eslint';
import { expect, it } from 'vitest';

const eslint = new ESLint();
it('rejects browser globals and indirect global access in core', async () => {
  for (const code of [
    'document.title = "probe";', 'window.localStorage.getItem("probe");',
    'localStorage.getItem("probe");', 'indexedDB.open("probe");',
    'globalThis.document.title = "probe";', 'globalThis["localStorage"].clear();',
    'const host = globalThis; void host;', 'self.navigator.language;',
  ]) {
    const [result] = await eslint.lintText(code, { filePath: 'src/core/operations.ts' });
    expect(result?.messages.some(m => m.ruleId === 'no-restricted-globals'), code).toBe(true);
  }
});
it('checks TS and Vue negative fixtures with typed lint', async () => {
  for (const [filePath, code] of [
    ['src/core/operations.ts', 'export const bad: any = 1;'],
    ['src/App.vue', '<script setup lang="ts">\nconst bad: any = 1;\nvoid bad;\n</script>\n<template><main>Probe</main></template>'],
  ] as const) {
    const [result] = await eslint.lintText(code, { filePath });
    expect(result?.messages.some(m => m.ruleId === '@typescript-eslint/no-explicit-any')).toBe(true);
  }
});
it('rejects host imports and Parts/Tokens dependencies', async () => {
  for (const [filePath, code] of [
    ['src/core/operations.ts', 'import "vue";'],
    ['src/core/operations.ts', 'import "node:fs";'],
    ['src/core/operations.ts', 'import { readFileSync } from "fs"; export const read = readFileSync;'],
    ['src/core/operations.ts', 'import "../App.vue";'],
    ['src/core/parts.ts', 'import "./operations";'],
    ['src/core/tokens.ts', 'import "../tools/color/definition";'],
  ] as const) {
    const [result] = await eslint.lintText(code, { filePath });
    expect(result?.messages.some(m => m.ruleId === 'no-restricted-imports')).toBe(true);
  }
});

it('rejects dynamic imports in core', async () => {
  const [result] = await eslint.lintText('export async function bad() { return await import("vue"); }', { filePath: 'src/core/operations.ts' });
  expect(result?.messages.some(m => m.ruleId === 'no-restricted-syntax')).toBe(true);
});

it('rejects direct access to target records outside persistence adapters', async () => {
  const [result] = await eslint.lintText('<script setup lang="ts">\nconst probe = repository.records;\nvoid probe;\n</script>\n<template><main>Probe</main></template>', { filePath: 'src/App.vue' });
  expect(result?.messages.some(m => m.ruleId === 'no-restricted-syntax')).toBe(true);
});
