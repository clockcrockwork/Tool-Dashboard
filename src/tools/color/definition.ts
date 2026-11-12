import { z } from 'zod';
import { defineUtility } from '../../core/catalog';
import { defineOperation } from '../../core/operations';
import { hexToRgb } from './hex';

export const parseHex = defineOperation({
  id: 'color.hex_to_rgb',
  contractVersion: 1,
  description: 'Convert a non-sensitive #RRGGBB value to RGB channel numbers.',
  inputSchema: z.strictObject({ hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
  outputSchema: z.strictObject({ hex: z.string(), r: z.number().int(), g: z.number().int(), b: z.number().int() }),
  runtimes: ['browser', 'server'],
  exposeTo: ['remote-mcp', 'webmcp'],
  mcpVisibility: ['model'],
  effect: 'read',
  dataClass: 'public',
  maxInputBytes: 128,
  execute: ({ hex }) => hexToRgb(hex),
});

export const colorUtility = defineUtility({
  kind: 'color', version: '1.0.0', title: 'Color conversion',
  description: 'Convert small, non-sensitive color values.',
  ui: { widget: true, standalone: true, mcpApp: false },
  operations: [parseHex],
});
