import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { ConflictError, LocalRepository, recordKey, targetKey, type TargetRef } from './local-repository';

const databases: Dexie[] = [];
const ref = (kind: string, targetId: string) => ({ providerId: 'local' as const, resourceType: 'data' as const, kind, targetId });
function repository() {
  const db = new LocalRepository(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
async function seedTarget(db: LocalRepository, targetRef: TargetRef) {
  await db.targetStates.add({ targetRef, lineage: crypto.randomUUID(), revision: 1, retired: false });
}
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())); });

describe('local repository', () => {
  it('keeps same-kind configurations independent and rejects stale writes', async () => {
    const db = repository();
    const first = await db.add('color', { value: '#112233' });
    const second = await db.add('color', { value: '#445566' });
    const firstKey = `instance:${first.instanceId}`;
    await db.updateConfig(firstKey, 1, { value: '#ffffff' });
    await expect(db.updateConfig(firstKey, 1, { value: '#000000' })).rejects.toBeInstanceOf(ConflictError);
    expect((await db.configs.get(`instance:${second.instanceId}`))?.value).toEqual({ value: '#445566' });
  });
  it('detaches without deleting settings and refuses deletion after an intervening change', async () => {
    const db = repository();
    const placement = await db.add('clock', { value: 'UTC' });
    const preview = await db.previewRemoval(placement.placementId);
    await db.updateConfig(preview.config.key, 1, { value: 'Asia/Tokyo' });
    await expect(db.remove(preview, 'delete')).rejects.toBeInstanceOf(ConflictError);
    expect(await db.placements.get(placement.placementId)).toBeDefined();
    await db.remove(await db.previewRemoval(placement.placementId), 'detach');
    expect(await db.configs.get(preview.config.key)).toBeDefined();
    const restored = await db.restore(placement.instanceId);
    expect(restored.placementId).not.toBe(placement.placementId);
    expect(restored.instanceId).toBe(placement.instanceId);
  });
  it('compares revisions across separate connections', async () => {
    const db = repository();
    const other = new LocalRepository(db.name);
    databases.push(other);
    const placement = await db.add('clock', { value: 'UTC' });
    const key = `instance:${placement.instanceId}`;
    const stale = await other.configs.get(key);
    await db.updateConfig(key, 1, { value: 'Asia/Tokyo' });
    await expect(other.updateConfig(key, stale?.revision ?? 0, { value: 'UTC' })).rejects.toBeInstanceOf(ConflictError);
  });
  it('retains data referenced by another config', async () => {
    const db = repository();
    const placement = await db.add('color', { value: '#000000' });
    await seedTarget(db, ref('color', 'shared'));
    await db.configs.update(`instance:${placement.instanceId}`, { targetRef: ref('color', 'shared') });
    await db.configs.add({ key: 'standalone:color', kind: 'color', schemaVersion: 1, revision: 1, value: {}, targetRef: ref('color', 'shared') });
    await db.records.add({ id: 'record', targetRef: ref('color', 'shared'), schemaVersion: 1, revision: 1, value: {} });
    const preview = await db.previewRemoval(placement.placementId);
    expect(preview.shared).toBe(true);
    await db.remove(preview, 'delete');
    expect(await db.records.get(recordKey(ref('color', 'shared'), 'record'))).toBeDefined();
  });
  it('does not delete a different kind with the same target id', async () => {
    const db = repository();
    const placement = await db.add('color', { value: '#000000' });
    await seedTarget(db, ref('color', 'same'));
    await db.configs.update(`instance:${placement.instanceId}`, { targetRef: ref('color', 'same') });
    await db.records.add({ id: 'other', targetRef: ref('clock', 'same'), schemaVersion: 1, revision: 1, value: {} });
    await db.remove(await db.previewRemoval(placement.placementId), 'delete');
    expect(await db.records.get(recordKey(ref('clock', 'same'), 'other'))).toBeDefined();
  });
  it('allows the same record id in different targets without cross-deletion', async () => {
    const db = repository();
    const placement = await db.add('color', { value: '#000000' });
    const first = ref('color', 'one');
    const second = ref('color', 'two');
    await seedTarget(db, first);
    await db.configs.update(`instance:${placement.instanceId}`, { targetRef: first });
    await db.records.bulkAdd([
      { id: 'same', targetRef: first, schemaVersion: 1, revision: 1, value: {} },
      { id: 'same', targetRef: second, schemaVersion: 1, revision: 1, value: {} },
    ]);
    await db.remove(await db.previewRemoval(placement.placementId), 'delete');
    expect(await db.records.get(recordKey(first, 'same'))).toBeUndefined();
    expect(await db.records.get(recordKey(second, 'same'))).toBeDefined();
  });
  it('detects an empty target that was filled and emptied after preview', async () => {
    const db = repository();
    const placement = await db.add('color', { value: '#000000' });
    const target = ref('color', 'target');
    await seedTarget(db, target);
    await db.configs.update(`instance:${placement.instanceId}`, { targetRef: target });
    const preview = await db.previewRemoval(placement.placementId);
    const initial = preview.targetState;
    if (!initial) throw new Error('Missing target');
    const filled = await db.putRecord(initial, { id: 'r', targetRef: target, revision: 1, schemaVersion: 1, value: {} }, null);
    await db.deleteRecord(filled, 'r', 1);
    await expect(db.remove(preview, 'delete')).rejects.toBeInstanceOf(ConflictError);
    expect(await db.placements.get(placement.placementId)).toBeDefined();
    await expect(db.putRecord(initial, { id: 'r', targetRef: target, revision: 1, schemaVersion: 1, value: {} }, null)).rejects.toBeInstanceOf(ConflictError);
  });
  it('does not delete a different provider with the same target id', async () => {
    const db = repository();
    const placement = await db.add('color', { value: '#000000' });
    await seedTarget(db, ref('color', 'same'));
    await db.configs.update(`instance:${placement.instanceId}`, { targetRef: ref('color', 'same') });
    // A foreign/unsupported provider is inserted as opaque storage data.
    await db.table<Record<string, unknown>>('recordsV4').add({ id: 'foreign', targetRef: { ...ref('color', 'same'), providerId: 'other' }, schemaVersion: 1, revision: 1, value: {} });
    await db.remove(await db.previewRemoval(placement.placementId), 'delete');
    expect(await db.table('recordsV4').get(['other', 'data', 'color', 'same', 'foreign'])).toBeDefined();
  });
  it('assigns stable increasing positions when adds overlap', async () => {
    const db = repository();
    const placements = await Promise.all([db.add('clock', { value: 'UTC' }), db.add('color', { value: '#123456' })]);
    expect(placements.map(p => p.position).sort()).toEqual([1, 2]);
    await db.movePlacement(placements, placements[1].placementId, -1);
    const ordered = (await db.placements.toArray()).sort((a, b) => a.position - b.position);
    expect(ordered.map(p => p.placementId)).toEqual([placements[1].placementId, placements[0].placementId]);
    await expect(db.movePlacement(placements, placements[1].placementId, -1)).rejects.toBeInstanceOf(ConflictError);
  });
  it('rejects revision overflow and removal of unknown placement fields', async () => {
    const db = repository();
    const placement = await db.add('clock', { value: 'UTC' });
    const key = `instance:${placement.instanceId}`;
    await db.configs.update(key, { revision: Number.MAX_SAFE_INTEGER });
    await expect(db.updateConfig(key, Number.MAX_SAFE_INTEGER, { value: 'UTC' })).rejects.toBeInstanceOf(ConflictError);
    await db.table<Record<string, unknown>>('placements').update(placement.placementId, { future: 'keep' });
    await expect(db.remove(await db.previewRemoval(placement.placementId), 'detach')).rejects.toThrow('VERSION_UNSUPPORTED');
    expect(await db.placements.get(placement.placementId)).toBeDefined();
  });
  it('preserves unsupported config versions and refuses destructive changes', async () => {
    const db = repository();
    const placement = await db.add('color', { value: '#123456' });
    const key = `instance:${placement.instanceId}`;
    await db.configs.update(key, { schemaVersion: 2 });
    await expect(db.updateConfig(key, 1, { value: '#ffffff' })).rejects.toThrow('VERSION_UNSUPPORTED');
    const preview = await db.previewRemoval(placement.placementId);
    await expect(db.remove(preview, 'delete')).rejects.toThrow('VERSION_UNSUPPORTED');
    expect(await db.placements.get(placement.placementId)).toBeDefined();
  });
});

function legacyDb(name: string): Dexie {
  const db = new Dexie(name);
  db.version(1).stores({ placements: 'placementId, instanceId', configs: 'key, kind, targetId', records: 'id, targetId', tombstones: 'key' });
  db.version(2).stores({ opaqueImports: 'id' });
  databases.push(db);
  return db;
}

it('upgrades legacy local targets transactionally and preserves other fields', async () => {
  const name = `test-${crypto.randomUUID()}`;
  const old = legacyDb(name);
  await old.table('configs').add({ key: 'instance:a', kind: 'color', targetId: 'target', revision: 1, schemaVersion: 1, value: { value: '#123456' }, extra: 'keep' });
  await old.table('records').add({ id: 'r', kind: 'color', targetId: 'target', revision: 1, schemaVersion: 1, value: { x: 1 } });
  old.close();
  const db = new LocalRepository(name);
  databases.push(db);
  expect(await db.configs.get('instance:a')).toMatchObject({ targetRef: ref('color', 'target'), extra: 'keep' });
  expect(await db.records.get(recordKey(ref('color', 'target'), 'r'))).toMatchObject({ targetRef: ref('color', 'target') });
  expect(await db.targetStates.get(targetKey(ref('color', 'target')))).toMatchObject({ revision: 1, retired: false });
});

it('rolls back the whole upgrade if a legacy target is malformed', async () => {
  const name = `test-${crypto.randomUUID()}`;
  const old = legacyDb(name);
  await old.table('configs').add({ key: 'instance:a', kind: 'color', targetId: 'target', revision: 1, schemaVersion: 1, value: {} });
  await old.table('records').add({ id: 'broken', kind: 'color', targetId: '', revision: 1, schemaVersion: 1, value: {} });
  old.close();
  const db = new LocalRepository(name);
  await expect(db.open()).rejects.toThrow();
  db.close();
  await old.open();
  expect(await old.table('configs').get('instance:a')).toMatchObject({ targetId: 'target' });
});

it('leaves the v3 store intact if composite-key migration fails', async () => {
  const name = `test-${crypto.randomUUID()}`;
  const old = legacyDb(name);
  old.version(3).stores({
    configs: 'key, kind, [targetRef.providerId+targetRef.resourceType+targetRef.kind+targetRef.targetId]',
    records: 'id, [targetRef.providerId+targetRef.resourceType+targetRef.kind+targetRef.targetId]',
  });
  await old.table('records').add({ id: 'r', targetRef: { ...ref('color', 'target'), providerId: 'future' }, revision: 1, schemaVersion: 1, value: {} });
  old.close();
  const db = new LocalRepository(name);
  await expect(db.open()).rejects.toThrow();
  db.close();
  await old.open();
  expect(await old.table('records').get('r')).toMatchObject({ id: 'r', targetRef: { providerId: 'future' } });
});
