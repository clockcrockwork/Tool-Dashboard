import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseHex } from '../src/tools/color/definition';

describe('single-source JSON Schema', () => {
  it('produces restrictive input shape from Zod', () => {
    const schema = z.toJSONSchema(parseHex.inputSchema);
    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(['hex']);
  });
  it('keeps output shape strict', () => {
    const schema = z.toJSONSchema(parseHex.outputSchema);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(['hex', 'r', 'g', 'b']);
  });
});
