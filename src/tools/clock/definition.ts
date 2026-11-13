import { defineUtility } from '../../core/catalog';

/** UI-only: a clock widget must not auto-generate an MCP tool. */
export const clockUtility = defineUtility({
  kind: 'clock', version: '1.0.0', title: 'Clock',
  description: 'Local clock display (full view in Stage 1b).',
  ui: { widget: true, standalone: true, mcpApp: false },
  operations: [],
});
