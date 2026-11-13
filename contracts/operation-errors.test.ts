import { expect, it } from 'vitest';
import { z } from 'zod';
import { defineOperation } from '../src/core/operations';

const make = (execute: (input: { n: number }) => { n: number } | Promise<{ n: number }>) => defineOperation({
  id: 'test.errors', contractVersion: 1, description: 'Errors',
  inputSchema: z.strictObject({ n: z.number() }), outputSchema: z.strictObject({ n: z.number().int() }),
  runtimes: ['browser'], exposeTo: [], effect: 'read', dataClass: 'public', maxInputBytes: 64, execute,
});
it('rejects invalid executor output, including async results', async () => {
  await expect(make(() => ({ n: 1.5 })).run({ n: 1 })).rejects.toMatchObject({ code: 'INVALID_OUTPUT', message: 'INVALID_OUTPUT' });
  await expect(make(() => Promise.resolve({ n: 1.5 })).run({ n: 1 })).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
});
it('classifies input/size/serialization errors before execute', async () => {
  let calls = 0;
  const op = make(input => { calls++; return input; });
  for (const input of [undefined, { n: 'private-value' }, 1n]) {
    await expect(op.run(input)).rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'INVALID_INPUT' });
  }
  await expect(op.run({ n: 'x'.repeat(100) })).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  expect(calls).toBe(0);
});
it('never exposes synchronous or asynchronous executor exception details', async () => {
  for (const execute of [() => { throw new Error('secret-token'); }, () => Promise.reject(new Error('secret-token'))]) {
    await expect(make(execute).run({ n: 1 })).rejects.toMatchObject({ code: 'EXECUTION_FAILED', message: 'EXECUTION_FAILED' });
  }
});
