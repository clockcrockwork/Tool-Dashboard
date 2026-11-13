import { z } from 'zod';
import { ConflictError, recordKey, recordTombstoneKey, targetKey, type LocalRepository, type RemovalPreview } from './local-repository';

// Loose objects intentionally retain fields from newer producers. Unsupported
// tool kinds/versions can be recovered without interpreting their payloads.
const id = z.string().min(1).max(512);
const revision = z.number().int().positive().safe();
const placementSchema = z.looseObject({
  placementId: id, instanceId: id, revision, position: z.number().finite(), width: z.number().int().positive(),
});
const targetRefSchema = z.looseObject({ providerId: z.literal('local'), resourceType: z.literal('data'), kind: id, targetId: id });
const legacyConfigSchema = z.looseObject({ key: id, kind: id, schemaVersion: revision, revision, value: z.unknown(), targetId: id.optional() });
const legacyRecordSchema = z.looseObject({ id, targetId: id, kind: id, schemaVersion: revision, revision, value: z.unknown() });
const configSchema = z.looseObject({ key: id, kind: id, schemaVersion: revision, revision, value: z.unknown(), targetRef: targetRefSchema.optional() });
const recordSchema = z.looseObject({ id, targetRef: targetRefSchema, schemaVersion: revision, revision, value: z.unknown() });
const targetSchema = z.looseObject({ targetRef: targetRefSchema, records: z.array(recordSchema), revision: revision.optional(), lineage: id.optional() });
const currentTargetSchema = z.looseObject({ targetRef: targetRefSchema, records: z.array(recordSchema), revision, lineage: id });
const legacyTargetSchema = z.looseObject({ targetRef: targetRefSchema, records: z.array(legacyRecordSchema) });
const common = { format: z.literal('tool-dashboard-export'), createdAt: z.iso.datetime(), placements: z.array(placementSchema) };
const legacySchema = z.looseObject({ ...common, exportVersion: z.literal(1), configs: z.array(legacyConfigSchema), targets: z.array(legacyTargetSchema) });
const version2Schema = z.looseObject({ ...common, exportVersion: z.literal(2), configs: z.array(configSchema), targets: z.array(targetSchema) });
const envelopeSchema = z.looseObject({ ...common, exportVersion: z.literal(3), configs: z.array(configSchema), targets: z.array(targetSchema) });
const currentSchema = z.looseObject({ ...common, exportVersion: z.literal(3), configs: z.array(configSchema), targets: z.array(currentTargetSchema) });
export type ExportEnvelope = z.infer<typeof envelopeSchema>;

function unique(values: string[]): boolean { return new Set(values).size === values.length; }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function assertJson(value: unknown, path = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || path.has(value)) throw new Error('NON_JSON_VALUE');
  const prototype: unknown = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) throw new Error('NON_JSON_VALUE');
  path.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      if (!Object.hasOwn(value, index)) throw new Error('NON_JSON_VALUE');
      assertJson(value[index], path);
    }
  } else for (const item of Object.values(value)) assertJson(item, path);
  path.delete(value);
}
function recoveredRevision(saved: number, tombstone: number | undefined): number {
  if (tombstone !== undefined && tombstone >= Number.MAX_SAFE_INTEGER) throw new ConflictError();
  return Math.max(saved, (tombstone ?? 0) + 1);
}

/** Validate the entire package without mutating the database or discarding unknown fields. */
export function parseExport(text: string): ExportEnvelope {
  // An explicit limit prevents an unexpectedly large file exhausting the UI.
  if (text.length > 10_000_000) throw new Error('EXPORT_TOO_LARGE');
  const raw: unknown = JSON.parse(text);
  const header = z.looseObject({ exportVersion: z.number().int() }).parse(raw);
  let envelope: ExportEnvelope;
  if (header.exportVersion === 1) {
    const legacy = legacySchema.parse(raw);
    envelope = { ...legacy, exportVersion: 3,
      configs: legacy.configs.map(({ targetId, ...config }) => ({ ...config, ...(targetId === undefined ? {} : { targetRef: { providerId: 'local' as const, resourceType: 'data' as const, kind: config.kind, targetId } }) })),
      targets: legacy.targets.map(target => ({ ...target, revision: undefined, lineage: undefined, records: target.records.map(({ targetId, kind, ...record }) => ({ ...record, targetRef: { providerId: 'local' as const, resourceType: 'data' as const, kind, targetId } })) })),
    };
  } else if (header.exportVersion === 2) {
    const legacy = version2Schema.parse(raw);
    envelope = { ...legacy, exportVersion: 3, targets: legacy.targets.map(target => ({ ...target, revision: undefined, lineage: undefined })) };
  }
  else envelope = currentSchema.parse(raw);
  const { placements, configs, targets } = envelope;
  if (!unique(placements.map(p => p.placementId)) || !unique(configs.map(c => c.key)) ||
      !unique(targets.map(t => canonical(t.targetRef))) ||
      !unique(targets.flatMap(t => t.records.map(r => canonical([r.targetRef, r.id]))))) throw new Error('DUPLICATE_ID');
  const configsByKey = new Map(configs.map(c => [c.key, c]));
  const targetsById = new Map(targets.map(t => [canonical(t.targetRef), t]));
  for (const p of placements) if (!configsByKey.has(`instance:${p.instanceId}`)) throw new Error('MISSING_CONFIG');
  for (const c of configs) {
    if (!Object.hasOwn(c, 'value') || (!c.key.startsWith('instance:') && c.key !== `standalone:${c.kind}`)) throw new Error('INVALID_CONFIG');
    if (c.targetRef) {
      const target = targetsById.get(canonical(c.targetRef));
      if (!target || c.targetRef.kind !== c.kind || canonical(target.targetRef) !== canonical(c.targetRef)) throw new Error('MISSING_TARGET');
    }
  }
  for (const target of targets) {
    if (!configs.some(c => c.targetRef && canonical(c.targetRef) === canonical(target.targetRef) && c.kind === target.targetRef.kind)) throw new Error('UNREFERENCED_TARGET');
    for (const record of target.records) {
      if (!Object.hasOwn(record, 'value') || canonical(record.targetRef) !== canonical(target.targetRef)) throw new Error('INVALID_RECORD');
    }
  }
  return envelopeSchema.parse(envelope);
}

/** Serialize exactly what was reviewed for removal, not a later database snapshot. */
export function serializeRemoval(preview: RemovalPreview): string {
  const targets = preview.config.targetRef ? [{
    targetRef: preview.config.targetRef,
    records: preview.records,
    revision: preview.targetState?.revision, lineage: preview.targetState?.lineage,
  }] : [];
  const envelope = {
    format: 'tool-dashboard-export', exportVersion: 3, createdAt: new Date().toISOString(),
    placements: [preview.placement], configs: [preview.config], targets,
  };
  assertJson(envelope);
  const text = JSON.stringify(envelope, null, 2);
  parseExport(text);
  return text;
}

/**
 * Import only into vacant identities. Explicit recovery can reuse a retired ID,
 * but its revision advances beyond the tombstone, preventing stale CAS writes.
 * The operation is atomic and never silently merges a target into existing data.
 */
export async function importExport(db: LocalRepository, input: ExportEnvelope): Promise<'imported' | 'opaque'> {
  assertJson(input);
  return importText(db, JSON.stringify(input));
}

/** Validate and save a future-version package without attempting to interpret it. */
export async function saveOpaqueImport(db: LocalRepository, text: string): Promise<void> {
  if (text.length > 10_000_000) throw new Error('EXPORT_TOO_LARGE');
  const raw: unknown = JSON.parse(text);
  const header = z.looseObject({ format: z.literal('tool-dashboard-export'), exportVersion: z.number().int().safe().min(4) }).parse(raw);
  void header;
  await db.opaqueImports.add({ id: crypto.randomUUID(), raw: text });
}

/** Preview the same supported/opaque decision used at import, without writes. */
export function inspectExport(text: string): { kind: 'opaque' } | { kind: 'supported'; envelope: ExportEnvelope } {
  if (text.length > 10_000_000) throw new Error('EXPORT_TOO_LARGE');
  const source: unknown = JSON.parse(text);
  const header = z.looseObject({ exportVersion: z.number().int() }).parse(source);
  const targetRefKeys = ['providerId', 'resourceType', 'kind', 'targetId'];
  const hasExtraRef = (ref: object) => Object.keys(ref).some(key => !targetRefKeys.includes(key));
  let unknownTargetRef = false;
  if (header.exportVersion === 1) {
    const legacy = legacySchema.parse(source);
    unknownTargetRef = legacy.targets.some(t => hasExtraRef(t.targetRef));
  } else {
    const current = header.exportVersion === 2 ? version2Schema.parse(source) : currentSchema.parse(source);
    unknownTargetRef = current.configs.some(c => c.targetRef !== undefined && hasExtraRef(c.targetRef)) ||
      current.targets.some(t => hasExtraRef(t.targetRef) || t.records.some(r => hasExtraRef(r.targetRef)));
  }
  if (unknownTargetRef) {
    return { kind: 'opaque' };
  }
  return { kind: 'supported', envelope: parseExport(text) };
}

/** Import a supported file, or preserve it untouched when its target identity is opaque. */
export async function importText(db: LocalRepository, text: string): Promise<'imported' | 'opaque'> {
  const inspection = inspectExport(text);
  if (inspection.kind === 'opaque') {
    await db.opaqueImports.add({ id: crypto.randomUUID(), raw: text });
    return 'opaque';
  }
  const envelope = inspection.envelope;
  const extras = (obj: object, keys: string[]) => Object.keys(obj).some(key => !keys.includes(key));
  const originalHeader = z.looseObject({ exportVersion: z.number() }).parse(JSON.parse(text) as unknown);
  const opaque = originalHeader.exportVersion < 3 || extras(envelope, ['format', 'exportVersion', 'createdAt', 'placements', 'configs', 'targets']) ||
      envelope.targets.some(t => extras(t, ['targetRef', 'records', 'revision', 'lineage']) ||
        extras(t.targetRef, ['providerId', 'resourceType', 'kind', 'targetId']));
  await db.transaction('rw', [db.placements, db.configs, db.records, db.tombstones, db.opaqueImports, db.targetStates], async () => {
    for (const placement of envelope.placements) if (await db.placements.get(placement.placementId)) throw new ConflictError();
    const reusedConfigs = new Set<string>();
    for (const config of envelope.configs) {
      const existing = await db.configs.get(config.key);
      if (existing) {
        if (canonical(existing) !== canonical(config)) throw new ConflictError();
        reusedConfigs.add(config.key);
      }
    }
    const reusedTargets = new Set<string>();
    for (const target of envelope.targets) {
      const key = targetKey(target.targetRef);
      const existing = await db.targetStates.get(key);
      const matchingConfigs = (await db.configs.toArray()).filter(c => c.targetRef && canonical(c.targetRef) === canonical(target.targetRef));
      const matchingRecords = (await db.records.toArray()).filter(r => canonical(r.targetRef) === canonical(target.targetRef));
      if (existing && !existing.retired) {
        const ordered = (records: typeof matchingRecords) => [...records].sort((a, b) => a.id.localeCompare(b.id));
        if (!target.lineage || !target.revision || existing.lineage !== target.lineage || existing.revision !== target.revision ||
            canonical(ordered(matchingRecords)) !== canonical(ordered(target.records))) throw new ConflictError();
        reusedTargets.add(canonical(target.targetRef));
      } else if (existing) {
        if (!target.lineage || !target.revision || existing.lineage !== target.lineage ||
            existing.revision !== target.revision + 1 || matchingConfigs.length || matchingRecords.length) throw new ConflictError();
        await db.targetStates.put({ ...existing, retired: false, revision: recoveredRevision(existing.revision, existing.revision) });
      } else {
        if (matchingConfigs.length || matchingRecords.length) throw new ConflictError();
        await db.targetStates.add({ targetRef: target.targetRef, lineage: target.lineage ?? crypto.randomUUID(), revision: target.revision ?? 1, retired: false });
      }
    }
    for (const config of envelope.configs) {
      if (reusedConfigs.has(config.key)) continue;
      const tombstone = await db.tombstones.get(config.key);
      const { targetRef, ...rest } = config;
      await db.configs.add({ ...rest, ...(targetRef === undefined ? {} : { targetRef }), revision: recoveredRevision(config.revision, tombstone?.revision) });
    }
    for (const target of envelope.targets) for (const record of target.records) {
      if (reusedTargets.has(canonical(target.targetRef))) continue;
      if (await db.records.get(recordKey(record.targetRef, record.id))) throw new ConflictError();
      const tombstone = await db.tombstones.get(recordTombstoneKey(record.targetRef, record.id));
      const legacyTombstone = await db.tombstones.get(`record:${record.id}`);
      const retiredRevision = Math.max(tombstone?.revision ?? 0, legacyTombstone?.revision ?? 0);
      await db.records.add({ ...record, revision: recoveredRevision(record.revision, retiredRevision) });
    }
    for (const placement of envelope.placements) {
      const tombstone = await db.tombstones.get(`placement:${placement.placementId}`);
      await db.placements.add({ ...placement, revision: recoveredRevision(placement.revision, tombstone?.revision) });
    }
    if (opaque) await db.opaqueImports.add({ id: crypto.randomUUID(), raw: text });
  });
  return 'imported';
}
