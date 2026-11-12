import { z } from 'zod';

export type RuntimeSurface = 'browser' | 'server';
export type AgentTransport = 'remote-mcp' | 'webmcp';
export type McpCaller = 'model' | 'app';
export type OperationEffect = 'read' | 'write';
export type DataClass = 'public' | 'user-private' | 'file';
export type OperationContext = Readonly<{ signal?: AbortSignal }>;

export type OperationDefinition<I extends z.ZodType, O extends z.ZodType> = Readonly<{
  id: string;
  contractVersion: number;
  description: string;
  inputSchema: I;
  outputSchema: O;
  runtimes: readonly RuntimeSurface[];
  exposeTo: readonly AgentTransport[];
  mcpVisibility?: readonly McpCaller[];
  effect: OperationEffect;
  dataClass: DataClass;
  maxInputBytes: number;
  execute(input: z.output<I>, context: OperationContext): z.output<O> | Promise<z.output<O>>;
}>;

export type RegisteredOperation<Output = unknown> = Readonly<{
  id: string;
  contractVersion: number;
  description: string;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  runtimes: readonly RuntimeSurface[];
  exposeTo: readonly AgentTransport[];
  mcpVisibility?: readonly McpCaller[];
  effect: OperationEffect;
  dataClass: DataClass;
  maxInputBytes: number;
  run(input: unknown, context?: OperationContext): Promise<Output>;
}>;

export function defineOperation<I extends z.ZodType, O extends z.ZodType>(
  definition: OperationDefinition<I, O>,
): RegisteredOperation<z.output<O>> {
  const isRemote = definition.exposeTo.includes('remote-mcp');
  if (isRemote && (!definition.runtimes.includes('server') || !definition.mcpVisibility?.length)) {
    throw new Error('Remote MCP operation ' + definition.id + ' requires server runtime and explicit visibility');
  }
  if (definition.exposeTo.includes('webmcp') && !definition.runtimes.includes('browser')) {
    throw new Error('WebMCP operation ' + definition.id + ' requires browser runtime');
  }
  if (!isRemote && definition.mcpVisibility?.length) {
    throw new Error('Non-remote operation must not declare MCP visibility: ' + definition.id);
  }
  if (!Number.isSafeInteger(definition.maxInputBytes) || definition.maxInputBytes < 1) {
    throw new Error('Invalid payload bound for ' + definition.id);
  }
  // Fail closed: JSON Schema cannot represent dates, transforms, functions, etc.
  z.toJSONSchema(definition.inputSchema);
  z.toJSONSchema(definition.outputSchema);

  return {
    ...definition,
    async run(raw: unknown, context: OperationContext = {}): Promise<z.output<O>> {
      const serial = JSON.stringify(raw);
      if (serial === undefined || new TextEncoder().encode(serial).byteLength > definition.maxInputBytes) {
        throw new Error('PAYLOAD_TOO_LARGE');
      }
      const input = definition.inputSchema.parse(raw);
      const result = await definition.execute(input, context);
      return definition.outputSchema.parse(result);
    },
  };
}
