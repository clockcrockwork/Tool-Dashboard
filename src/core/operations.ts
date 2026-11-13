import { z } from 'zod';
import { operationJsonSchema } from './json-schema';

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
  operationJsonSchema(definition.inputSchema, 'input');
  operationJsonSchema(definition.outputSchema, 'output');

  return {
    ...definition,
    async run(raw: unknown, context: OperationContext = {}): Promise<z.output<O>> {
      let serial: string | undefined;
      try {
        serial = JSON.stringify(raw);
      } catch {
        throw new OperationError('INVALID_INPUT');
      }
      if (serial === undefined) throw new OperationError('INVALID_INPUT');
      if (new TextEncoder().encode(serial).byteLength > definition.maxInputBytes) {
        throw new OperationError('PAYLOAD_TOO_LARGE');
      }
      const input = parseBoundary(definition.inputSchema, raw, 'INVALID_INPUT');
      let result: unknown;
      try {
        result = await definition.execute(input, context);
      } catch {
        throw new OperationError('EXECUTION_FAILED');
      }
      return parseBoundary(definition.outputSchema, result, 'INVALID_OUTPUT');
    },
  };
}

/** Safe public failures: never copy payloads, validation details or executor errors. */
export type OperationErrorCode = 'INVALID_INPUT' | 'PAYLOAD_TOO_LARGE' | 'INVALID_OUTPUT' | 'EXECUTION_FAILED';
export class OperationError extends Error {
  constructor(readonly code: OperationErrorCode) {
    super(code);
    this.name = 'OperationError';
  }
}

function parseBoundary<S extends z.ZodType>(schema: S, value: unknown, code: 'INVALID_INPUT' | 'INVALID_OUTPUT'): z.output<S> {
  try {
    return schema.parse(value);
  } catch {
    throw new OperationError(code);
  }
}
