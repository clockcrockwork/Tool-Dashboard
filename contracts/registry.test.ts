import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCatalog, defineUtility } from '../src/core/catalog';
import { defineOperation } from '../src/core/operations';
import { catalog } from '../src/tools/catalog';

const safe = defineOperation({
  id: 'demo.safe', contractVersion: 1, description: 'Test-only operation',
  inputSchema: z.strictObject({ count: z.number().int() }),
  outputSchema: z.strictObject({ count: z.number().int() }),
  runtimes: ['browser'], exposeTo: [], effect: 'read', dataClass: 'public',
  maxInputBytes: 64, execute: (input) => input,
});
const utility = (kind: string) => defineUtility({
  kind, version: '1.0.0', title: kind, description: kind,
  ui: { widget: false, standalone: false, mcpApp: false }, operations: [safe],
});

describe('static registry contract', () => {
  it('contains UI-only clock without an MCP operation', () => {
    expect(catalog.find(t => t.kind === 'clock')?.operations).toHaveLength(0);
  });
  it('rejects duplicate utility and operation IDs', () => {
    expect(() => defineCatalog([utility('dup'), utility('dup')])).toThrow('DUPLICATE_TOOL');
    expect(() => defineCatalog([utility('a'), utility('b')])).toThrow('DUPLICATE_OPERATION');
  });
  it('requires explicit model/app visibility on remote exposure', () => {
    expect(() => defineOperation({
      id: 'unsafe', contractVersion: 1, description: 'bad',
      inputSchema: z.strictObject({ ok: z.boolean() }),
      outputSchema: z.strictObject({ ok: z.boolean() }),
      runtimes: ['server'], exposeTo: ['remote-mcp'], effect: 'read', dataClass: 'public',
      maxInputBytes: 16, execute: (input) => input,
    })).toThrow('explicit visibility');
  });
  it('rejects non-JSON-Schema boundaries', () => {
    expect(() => defineOperation({
      id: 'not-json', contractVersion: 1, description: 'bad',
      inputSchema: z.strictObject({ when: z.date() }),
      outputSchema: z.strictObject({ count: z.number() }),
      runtimes: ['browser'], exposeTo: [], effect: 'read', dataClass: 'public',
      maxInputBytes: 1024, execute: () => ({ count: 1 }),
    })).toThrow();
  });
});
