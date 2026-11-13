import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { ConflictError, LocalRepository, recordKey } from './local-repository';
import { importExport, importText, inspectExport, parseExport, saveOpaqueImport, serializeRemoval } from './export-import';

const databases: LocalRepository[] = [];
function repository() {
  const db = new LocalRepository(`export-test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())); });

describe('portable recovery', () => {
  it('exports, deletes, and restores with fresh revisions that reject stale writes', async () => {
    const db = repository();
    const placement = await db.add('color', { value: '#123456' });
    const preview = await db.previewRemoval(placement.placementId);
    const snapshot = parseExport(serializeRemoval(preview));
    await db.remove(preview, 'delete');
    await importExport(db, snapshot);
    const restored = await db.configs.get(preview.config.key);
    expect(restored?.value).toEqual({ value: '#123456' });
    expect(restored?.revision).toBeGreaterThan(preview.config.revision);
    await expect(db.updateConfig(preview.config.key, preview.config.revision, {})).rejects.toBeInstanceOf(ConflictError);
    expect((await db.placements.get(placement.placementId))?.revision).toBeGreaterThan(placement.revision);
  });
  it('preserves unknown kinds and record fields without rewriting identities', async () => {
    const source = repository();
    const target = repository();
    const placement = { placementId: crypto.randomUUID(), instanceId: crypto.randomUUID(), revision: 1, position: 1, width: 1 };
    await source.placements.add(placement);
    await source.configs.add({ key: `instance:${placement.instanceId}`, kind: 'future-tool', schemaVersion: 2, revision: 1, value: { data: 'opaque' } });
    const data = parseExport(serializeRemoval(await source.previewRemoval(placement.placementId)));
    const withFuture = parseExport(JSON.stringify({ ...data, configs: data.configs.map(c => ({ ...c, future: { ref: placement.instanceId } })) }));
    await importExport(target, withFuture);
    expect(await target.configs.get(`instance:${placement.instanceId}`)).toMatchObject({ future: { ref: placement.instanceId }, value: { data: 'opaque' } });
    expect(parseExport(serializeRemoval(await target.previewRemoval(placement.placementId))).configs[0]).toMatchObject({ future: { ref: placement.instanceId } });
  });
  it('rejects collisions atomically without changing existing data', async () => {
    const db = repository();
    const placement = await db.add('clock', { value: 'UTC' });
    const data = parseExport(serializeRemoval(await db.previewRemoval(placement.placementId)));
    await expect(importExport(db, data)).rejects.toBeInstanceOf(ConflictError);
    expect(await db.configs.count()).toBe(1);
    expect(await db.placements.count()).toBe(1);
  });
  it('rejects duplicate or inconsistent references before any writes', async () => {
    const db = repository();
    const placement = await db.add('clock', { value: 'UTC' });
    const data = parseExport(serializeRemoval(await db.previewRemoval(placement.placementId)));
    expect(() => parseExport(JSON.stringify({ ...data, placements: [data.placements[0], data.placements[0]] }))).toThrow('DUPLICATE_ID');
    expect(() => parseExport(JSON.stringify({ ...data, configs: [] }))).toThrow('MISSING_CONFIG');
  });
  it('retains the exact original text for unknown envelope fields', async () => {
    const db = repository();
    const source = repository();
    const placement = await source.add('clock', { value: 'UTC' });
    const data = parseExport(serializeRemoval(await source.previewRemoval(placement.placementId)));
    const raw = JSON.stringify({ ...data, future: { opaque: true } }, null, 2);
    await importText(db, raw);
    expect((await db.opaqueImports.toArray())[0]?.raw).toBe(raw);
    expect(await db.configs.count()).toBe(1);
  });
  it('preserves unknown target identity as raw without creating unusable records', async () => {
    const db = repository();
    const targetRef = { providerId: 'local', resourceType: 'data', kind: 'color', targetId: 't', futureScope: 'opaque' };
    const raw = JSON.stringify({ format: 'tool-dashboard-export', exportVersion: 2, createdAt: new Date().toISOString(),
      placements: [{ placementId: 'p', instanceId: 'i', revision: 1, position: 0, width: 1 }],
      configs: [{ key: 'instance:i', kind: 'color', revision: 1, schemaVersion: 1, value: { value: '#123456' }, targetRef }],
      targets: [{ targetRef, records: [] }],
    });
    expect(inspectExport(raw)).toEqual({ kind: 'opaque' });
    expect(await importText(db, raw)).toBe('opaque');
    expect(await db.placements.count()).toBe(0);
    expect(await db.configs.count()).toBe(0);
    expect((await db.opaqueImports.toArray())[0]?.raw).toBe(raw);
  });
  it('stores an unsupported future package as opaque raw without interpreting it', async () => {
    const db = repository();
    const raw = '{ "format":"tool-dashboard-export", "exportVersion":4, "future": [1,2] }';
    await saveOpaqueImport(db, raw);
    expect((await db.opaqueImports.toArray())[0]?.raw).toBe(raw);
    expect(await db.configs.count()).toBe(0);
  });
  it('relinks an unchanged shared instance and refuses to relink a changed one', async () => {
    const db = repository();
    const placement = await db.add('clock', { value: 'UTC' });
    const second = await db.restore(placement.instanceId);
    const preview = await db.previewRemoval(placement.placementId);
    const exported = parseExport(serializeRemoval(preview));
    await db.remove(preview, 'delete');
    await importExport(db, exported);
    expect((await db.placements.get(placement.placementId))?.instanceId).toBe(second.instanceId);
    const next = await db.previewRemoval(placement.placementId);
    const nextExport = parseExport(serializeRemoval(next));
    await db.remove(next, 'delete');
    await db.updateConfig(next.config.key, next.config.revision, { value: 'Asia/Tokyo' });
    await expect(importExport(db, nextExport)).rejects.toBeInstanceOf(ConflictError);
    expect(await db.placements.get(placement.placementId)).toBeUndefined();
  });
  it('relinks a shared data target only at the exported revision', async () => {
    const db = repository();
    const first = await db.add('color', { value: '#123456' });
    const second = await db.add('color', { value: '#abcdef' });
    const targetRef = { providerId: 'local', resourceType: 'data', kind: 'color', targetId: 'shared' } as const;
    await db.targetStates.add({ targetRef, lineage: 'lineage-1', revision: 1, retired: false });
    await db.configs.update(`instance:${first.instanceId}`, { targetRef });
    await db.configs.update(`instance:${second.instanceId}`, { targetRef });
    await db.records.add({ id: 'record-1', targetRef, revision: 1, schemaVersion: 1, value: { x: 1 } });
    const preview = await db.previewRemoval(first.placementId);
    const exported = parseExport(serializeRemoval(preview));
    await db.remove(preview, 'delete');
    await importExport(db, exported);
    expect(await db.records.count()).toBe(1);
    const secondPreview = await db.previewRemoval(first.placementId);
    const secondExport = parseExport(serializeRemoval(secondPreview));
    await db.remove(secondPreview, 'delete');
    await db.records.update(recordKey(targetRef, 'record-1'), { revision: 2, value: { x: 2 } });
    await db.targetStates.update(['local', 'data', 'color', 'shared'], { revision: 2 });
    await expect(importExport(db, secondExport)).rejects.toBeInstanceOf(ConflictError);
    expect(await db.placements.get(first.placementId)).toBeUndefined();
  });
  it('relinks an empty shared target only when lineage and revision match', async () => {
    const db = repository();
    const first = await db.add('color', { value: '#123456' });
    const second = await db.add('color', { value: '#abcdef' });
    const targetRef = { providerId: 'local', resourceType: 'data', kind: 'color', targetId: 'empty' } as const;
    await db.targetStates.add({ targetRef, lineage: 'lineage-empty', revision: 1, retired: false });
    await db.configs.update(`instance:${first.instanceId}`, { targetRef });
    await db.configs.update(`instance:${second.instanceId}`, { targetRef });
    const preview = await db.previewRemoval(first.placementId);
    const snapshot = parseExport(serializeRemoval(preview));
    await db.remove(preview, 'delete');
    await importExport(db, snapshot);
    const again = await db.previewRemoval(first.placementId);
    const stale = parseExport(serializeRemoval(again));
    await db.remove(again, 'delete');
    await db.targetStates.update(['local', 'data', 'color', 'empty'], { revision: 3 });
    await expect(importExport(db, stale)).rejects.toBeInstanceOf(ConflictError);
  });
  it('restores an exclusively deleted target above its retired revision', async () => {
    const db = repository();
    const placement = await db.add('color', { value: '#123456' });
    const targetRef = { providerId: 'local', resourceType: 'data', kind: 'color', targetId: 'exclusive' } as const;
    await db.targetStates.add({ targetRef, lineage: 'lineage-exclusive', revision: 1, retired: false });
    await db.configs.update(`instance:${placement.instanceId}`, { targetRef });
    const preview = await db.previewRemoval(placement.placementId);
    const snapshot = parseExport(serializeRemoval(preview));
    await db.remove(preview, 'delete');
    await importExport(db, snapshot);
    expect(await db.targetStates.get(['local', 'data', 'color', 'exclusive'])).toMatchObject({ revision: 3, retired: false });
  });
  it('converts a v1 target reference while retaining the exact source text', async () => {
    const db = repository();
    const raw = JSON.stringify({ format: 'tool-dashboard-export', exportVersion: 1, createdAt: new Date().toISOString(),
      placements: [{ placementId: 'p', instanceId: 'i', revision: 1, position: 0, width: 1 }],
      configs: [{ key: 'instance:i', kind: 'color', revision: 1, schemaVersion: 1, value: { value: '#123456' }, targetId: 't' }],
      targets: [{ targetRef: { providerId: 'local', resourceType: 'data', kind: 'color', targetId: 't' }, records: [{ id: 'r', targetId: 't', kind: 'color', revision: 1, schemaVersion: 1, value: {} }] }],
    }, null, 2);
    await importText(db, raw);
    expect((await db.configs.get('instance:i'))?.targetRef?.targetId).toBe('t');
    expect((await db.records.get(recordKey({ providerId: 'local', resourceType: 'data', kind: 'color', targetId: 't' }, 'r')))?.targetRef.targetId).toBe('t');
    expect((await db.opaqueImports.toArray())[0]?.raw).toBe(raw);
  });
});
