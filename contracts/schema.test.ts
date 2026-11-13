import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { operationDefault, operationJsonSchema } from '../src/core/json-schema';
import { catalog } from '../src/tools/catalog';
import { defineOperation } from '../src/core/operations';

const operation = (inputSchema: z.ZodType) => defineOperation({
  id: 'test.schema', contractVersion: 1, description: 'Schema fixture',
  inputSchema, outputSchema: z.strictObject({ n: z.number() }),
  runtimes: ['browser'], exposeTo: [], effect: 'read', dataClass: 'public',
  maxInputBytes: 128, execute: () => ({ n: 2 }),
});

describe('single-source JSON Schema', () => {
  it('snapshots both external schemas for every registered operation', () => {
    for (const tool of catalog) for (const op of tool.operations) {
      expect({ input: operationJsonSchema(op.inputSchema, 'input'), output: operationJsonSchema(op.outputSchema, 'output') })
        .toMatchSnapshot(op.id);
    }
  });
  it('keeps defaulted input optional, but output required', async () => {
    const schema = z.strictObject({ n: operationDefault(z.number(), 2) });
    expect(operationJsonSchema(schema, 'input').required).toBeUndefined();
    expect(operationJsonSchema(schema, 'output').required).toEqual(['n']);
    await expect(operation(schema).run({})).resolves.toEqual({ n: 2 });
  });
  it.each([
    z.strictObject({ n: z.number().refine(n => n % 2 === 0) }),
    z.strictObject({ nested: z.array(z.strictObject({ n: z.number().superRefine((n, ctx) => { if (n % 2) ctx.addIssue({ code: 'custom', message: 'even' }); }) })) }),
    z.strictObject({ n: z.number().refine(n => n > 0).optional().default(2) }),
    z.strictObject({ n: z.number().catch(2) }),
    z.strictObject({ n: z.coerce.number() }),
    z.strictObject({ n: z.string().transform(Number) }),
    z.strictObject({ n: z.string().trim() }),
    z.strictObject({ n: z.string().regex(/abc/i) }),
    z.object({ n: z.number() }),
    z.strictObject({ url: z.url({ hostname: /^example\.com$/ }) }),
    z.strictObject({ url: z.url({ normalize: true }) }),
    (() => { const check = z.gte(5); check._zod.def.when = () => false; return z.strictObject({ n: z.number().check(check) }); })(),
    z.strictObject({ text: z.string().min(1) }),
    z.strictObject({ n: z.number().default(() => Math.random()) }),
  ])('rejects unsupported or lossy boundaries at registration', schema => {
    expect(() => operation(schema)).toThrow();
  });
  it('rejects refinements on output as well', () => {
    expect(() => operationJsonSchema(z.strictObject({ n: z.number().refine(n => n > 0) }), 'output')).toThrow();
  });
  it('exports supported numeric constraints', () => {
    const schema = z.strictObject({ n: z.number().multipleOf(2).min(0).max(10) });
    expect(operationJsonSchema(schema, 'input').properties).toEqual({
      n: { type: 'number', multipleOf: 2, minimum: 0, maximum: 10 },
    });
  });
});
