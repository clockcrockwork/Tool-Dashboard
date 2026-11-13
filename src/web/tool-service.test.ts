import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { LocalRepository } from './local-repository';
import { InvalidDraft, submitTool } from './tool-service';

const dbs: LocalRepository[] = [];
function makeDb() { const db = new LocalRepository(`service-${crypto.randomUUID()}`); dbs.push(db); return db; }
afterEach(async () => { await Promise.all(dbs.splice(0).map(db => db.delete())); });

it('validates draft before updating configuration', async () => {
  const db = makeDb(); const p = await db.add('color', { value: '#112233' });
  const key = `instance:${p.instanceId}`;
  await expect(submitTool(db, { kind: 'color', key, revision: 1, value: '', isCurrent: () => true })).rejects.toBeInstanceOf(InvalidDraft);
  expect(await db.configs.get(key)).toMatchObject({ revision: 1, value: { value: '#112233' } });
});
it('drops a superseded invocation before committing', async () => {
  const db = makeDb(); const p = await db.add('color', { value: '#112233' });
  const key = `instance:${p.instanceId}`;
  expect(await submitTool(db, { kind: 'color', key, revision: 1, value: '#ffffff', isCurrent: () => false })).toBeNull();
  expect((await db.configs.get(key))?.revision).toBe(1);
});
it('runs the common operation and saves only with the expected revision', async () => {
  const db = makeDb(); const p = await db.add('color', { value: '#112233' });
  const key = `instance:${p.instanceId}`;
  expect(await submitTool(db, { kind: 'color', key, revision: 1, value: '#ffffff', isCurrent: () => true })).toMatchObject({ revision: 2, result: { r: 255, g: 255, b: 255 } });
  await expect(submitTool(db, { kind: 'color', key, revision: 1, value: '#000000', isCurrent: () => true })).rejects.toThrow('CONFLICT');
});
