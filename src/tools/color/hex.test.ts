import { describe, expect, it } from 'vitest';
import { hexToRgb } from './hex';
import { parseHex } from './definition';

describe('color.hex_to_rgb', () => {
  it('returns deterministic RGB channels', () => {
    expect(hexToRgb('#336699')).toEqual({ hex: '#336699', r: 51, g: 102, b: 153 });
  });
  it('runs through the validated operation boundary', async () => {
    await expect(parseHex.run({ hex: '#abcDEF' })).resolves.toEqual({ hex: '#ABCDEF', r: 171, g: 205, b: 239 });
  });
  it('rejects malformed and oversized payloads', async () => {
    await expect(parseHex.run({ hex: '#fff' })).rejects.toThrow();
    await expect(parseHex.run({ hex: '#334455', unexpected: 1 })).rejects.toThrow();
    await expect(parseHex.run({ hex: '#' + 'f'.repeat(300) })).rejects.toThrow('PAYLOAD_TOO_LARGE');
  });
});
