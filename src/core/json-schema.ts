import { z } from 'zod';

const staticDefaults = new WeakSet<z.core.$ZodType>();
/** Zod erases whether .default received a callback. Own construction so external
 * defaults are validated, immutable JSON primitives, never dynamic factories. */
export function operationDefault<S extends z.ZodType>(schema: S, value: z.core.util.NoUndefined<z.output<S>> & (string | number | boolean | null)) {
  schema.parse(value);
  const result = schema.default(value);
  staticDefaults.add(result);
  return result;
}

/** Deliberately small external schema vocabulary, reviewed against pinned Zod 4.6.7.
 * Extend this allowlist only with runtime/export parity fixtures. Zod's converter
 * silently drops custom checks, so successful conversion alone is insufficient.
 */
export function operationJsonSchema(schema: z.ZodType, io: 'input' | 'output') {
  return z.toJSONSchema(schema, {
    io,
    metadata: z.registry(),
    unrepresentable: 'throw',
    override: ({ zodSchema }) => {
      const def = zodSchema._zod.def;
      if (!['object', 'string', 'number', 'boolean', 'literal', 'enum', 'array', 'optional', 'nullable', 'default', 'never'].includes(def.type)) {
        throw new Error('UNSUPPORTED_OPERATION_SCHEMA:' + def.type);
      }
      const details: object = def;
      if (def.type === 'default' && !staticDefaults.has(zodSchema)) throw new Error('UNSUPPORTED_OPERATION_SCHEMA:use-operationDefault');
      if ('format' in details && !(def.type === 'number' && details.format === 'safeint')) {
        throw new Error('UNSUPPORTED_OPERATION_SCHEMA:format');
      }
      if ('when' in def && def.when) throw new Error('UNSUPPORTED_OPERATION_SCHEMA:conditional-check');
      if ('coerce' in def && def.coerce) throw new Error('UNSUPPORTED_OPERATION_SCHEMA:coerce');
      if (def.type === 'object' && def.catchall?._zod.def.type !== 'never') {
        throw new Error('UNSUPPORTED_OPERATION_SCHEMA:non-strict-object');
      }
      for (const check of def.checks ?? []) {
        const rule = check._zod.def;
        const numeric = ['less_than', 'greater_than', 'multiple_of'].includes(rule.check);
        const integer = rule.check === 'number_format' && 'format' in rule && rule.format === 'safeint';
        const regex = rule.check === 'string_format' && 'format' in rule && rule.format === 'regex'
          && 'pattern' in rule && rule.pattern instanceof RegExp && rule.pattern.flags === '';
        if (rule.when || !(numeric || integer || regex)) {
          throw new Error('UNSUPPORTED_OPERATION_SCHEMA_CHECK:' + rule.check);
        }
      }
    },
  });
}
