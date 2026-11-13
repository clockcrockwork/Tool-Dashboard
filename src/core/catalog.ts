import type { RegisteredOperation } from './operations';

export type UtilityDefinition = Readonly<{
  kind: string;
  version: string;
  title: string;
  description: string;
  ui: Readonly<{ widget: boolean; standalone: boolean; mcpApp: boolean }>;
  operations: readonly RegisteredOperation[];
}>;

export function defineUtility<const T extends UtilityDefinition>(definition: T): T {
  if (!definition.ui.widget && !definition.ui.standalone && definition.operations.length === 0) {
    throw new Error('Utility ' + definition.kind + ' has no available surface or operation');
  }
  return definition;
}

export function defineCatalog<const T extends readonly UtilityDefinition[]>(tools: T): T {
  const kinds = new Set<string>();
  const operationIds = new Set<string>();
  for (const tool of tools) {
    if (kinds.has(tool.kind)) throw new Error('DUPLICATE_TOOL:' + tool.kind);
    kinds.add(tool.kind);
    for (const operation of tool.operations) {
      if (operationIds.has(operation.id)) throw new Error('DUPLICATE_OPERATION:' + operation.id);
      operationIds.add(operation.id);
    }
  }
  return tools;
}
