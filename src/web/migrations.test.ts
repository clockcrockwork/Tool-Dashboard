import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { LocalRepository } from './local-repository';
import { migrateConfigs, MigrationError, type ConfigMigrationRegistry } from './migrations';

const databases: LocalRepository[] = [];
function makeDb() {
  const db = new LocalRepository(`migration-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())); });

// Test-only old formats: production has no documented pre-v1 config format.
const policy: ConfigMigrationRegistry = {
  color: {
    currentVersion: 2,
    steps: {
      0: value => ({ v1: value }),
      1: value => ({ v2: value }),
    },
    isCurrent: value => typeof value === 'object' && value !== null && 'v2' in value,
  },
};

it('migrates each instance and standalone sequentially and leaves unsupported records untouched', async () => {
  const db = makeDb();
  const first = await db.add('color', { value: '#112233' });
  const second = await db.add('color', { value: '#445566' });
  await db.standalone('color', { value: '#abcdef' });
  const unknown = { key: 'instance:unknown', kind: 'future-tool', schemaVersion: 1, revision: 7, value: { opaque: [1, 2] } };
  const future = { key: 'instance:future', kind: 'color', schemaVersion: 99, revision: 9, value: { opaque: true } };
  await db.configs.bulkAdd([unknown, future]);
  await db.configs.update(`instance:${first.instanceId}`, { schemaVersion: 0 });
  expect(await migrateConfigs(db, policy)).toEqual({ migrated: 3, unsupported: 2 });
  expect((await db.configs.get(`instance:${first.instanceId}`))?.value).toEqual({ v2: { v1: { value: '#112233' } } });
  expect((await db.configs.get(`instance:${second.instanceId}`))?.value).toEqual({ v2: { value: '#445566' } });
  expect((await db.configs.get('standalone:color'))?.revision).toBe(2);
  expect(await db.configs.get(unknown.key)).toEqual(unknown);
  expect(await db.configs.get(future.key)).toEqual(future);
  expect(await migrateConfigs(db, policy)).toEqual({ migrated: 0, unsupported: 2 });
});

it('rolls back all writes when a later record fails and permits retry', async () => {
  const db = makeDb();
  const first = await db.add('color', { value: '#112233' });
  const second = await db.add('color', { value: '#445566' });
  const before = await db.configs.toArray();
  let calls = 0;
  const broken: ConfigMigrationRegistry = { color: { ...policy.color!, steps: { 1: value => {
    if (++calls === 2) throw new Error('bad migration');
    return { v2: value };
  } } } };
  await expect(migrateConfigs(db, broken)).rejects.toBeInstanceOf(MigrationError);
  expect(await db.configs.toArray()).toEqual(before);
  await migrateConfigs(db, policy);
  expect((await db.configs.get(`instance:${first.instanceId}`))?.revision).toBe(2);
  expect((await db.configs.get(`instance:${second.instanceId}`))?.revision).toBe(2);
});

it('rejects a missing migration step without changing data', async () => {
  const db = makeDb();
  await db.add('color', { value: '#000000' });
  const before = await db.configs.toArray();
  await expect(migrateConfigs(db, { color: { currentVersion: 2, steps: {}, isCurrent: () => true } })).rejects.toBeInstanceOf(MigrationError);
  expect(await db.configs.toArray()).toEqual(before);
});
