import { defineCatalog } from '../core/catalog';
import { clockUtility } from './clock/definition';
import { colorUtility } from './color/definition';

/** Browser and future MCP adapter must derive operations from this one list. */
export const catalog = defineCatalog([clockUtility, colorUtility] as const);
