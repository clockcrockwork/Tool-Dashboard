import Dexie, { type Table } from 'dexie';
import { z } from 'zod';

const colorConfig = z.strictObject({ value: z.string().regex(/^#[0-9a-fA-F]{6}$/) });
const clockConfig = z.strictObject({ value: z.string().min(1) });
function validateConfig(kind: string, value: unknown): void {
  if (kind === 'color') { colorConfig.parse(value); return; }
  if (kind === 'clock') {
    const parsed = clockConfig.parse(value);
    try { new Intl.DateTimeFormat('en', { timeZone: parsed.value }); }
    catch { throw new Error('INVALID_TIME_ZONE'); }
    return;
  }
  throw new Error('VERSION_UNSUPPORTED');
}

/** Board placements contain presentation only; configuration has one owner. */
export interface Placement {
  placementId: string;
  instanceId: string;
  revision: number;
  position: number;
  width: number;
}
export interface TargetRef {
  providerId: 'local';
  resourceType: 'data';
  kind: string;
  targetId: string;
}
const targetRefSchema = z.strictObject({
  providerId: z.literal('local'), resourceType: z.literal('data'),
  kind: z.string().min(1), targetId: z.string().min(1),
});
const targetIndex = '[targetRef.providerId+targetRef.resourceType+targetRef.kind+targetRef.targetId]';
export function targetKey(ref: TargetRef): [string, string, string, string] {
  const checked = targetRefSchema.parse(ref);
  return [checked.providerId, checked.resourceType, checked.kind, checked.targetId];
}
export type RecordKey = [string, string, string, string, string];
export function recordKey(ref: TargetRef, recordId: string): RecordKey {
  if (typeof recordId !== 'string' || !recordId) throw new Error('INVALID_RECORD_ID');
  return [...targetKey(ref), recordId];
}
export function recordTombstoneKey(ref: TargetRef, recordId: string): string {
  return `record-v2:${JSON.stringify(recordKey(ref, recordId))}`;
}
export interface Config {
  key: string;
  kind: string;
  schemaVersion: number;
  revision: number;
  value: unknown;
  targetRef?: TargetRef;
}
export function isSupportedConfig(config: Config): boolean {
  if (config.schemaVersion !== 1 || Object.keys(config).some(key => !['key', 'kind', 'schemaVersion', 'revision', 'value', 'targetRef'].includes(key))) return false;
  try { if (config.targetRef) targetKey(config.targetRef); validateConfig(config.kind, config.value); return true; }
  catch { return false; }
}
export interface DataRecord {
  id: string;
  targetRef: TargetRef;
  schemaVersion: number;
  revision: number;
  value: unknown;
}
export interface TargetState { targetRef: TargetRef; lineage: string; revision: number; retired: boolean }
export interface RemovalPreview {
  placement: Placement;
  config: Config;
  records: DataRecord[];
  targetState?: TargetState;
  shared: boolean;
  references: string[];
}
export class ConflictError extends Error {
  constructor() { super('CONFLICT'); }
}
function nextRevision(revision: number): number {
  if (!Number.isSafeInteger(revision) || revision < 1 || revision >= Number.MAX_SAFE_INTEGER) throw new ConflictError();
  return revision + 1;
}
function hasOnlyKeys(value: object, keys: string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}

export class LocalRepository extends Dexie {
  placements!: Table<Placement, string>;
  configs!: Table<Config, string>;
  get records(): Table<DataRecord, RecordKey> { return this.table('recordsV4'); }
  targetStates!: Table<TargetState, [string, string, string, string]>;
  tombstones!: Table<{ key: string; revision: number }, string>;
  opaqueImports!: Table<{ id: string; raw: string }, string>;

  constructor(name = 'tool-dashboard') {
    super(name);
    this.version(1).stores({
      placements: 'placementId, instanceId',
      configs: 'key, kind, targetId',
      records: 'id, targetId',
      tombstones: 'key',
    });
    this.version(2).stores({ opaqueImports: 'id' });
    this.version(3).stores({
      configs: `key, kind, ${targetIndex}`,
      records: `id, ${targetIndex}`,
    }).upgrade(async transaction => {
      // v1/v2 were local-only. Abort the complete upgrade on ambiguity instead
      // of guessing or partially rewriting persisted data.
      await transaction.table('configs').toCollection().modify((raw: unknown) => {
        const schema = z.looseObject({ kind: z.string().min(1), targetId: z.string().min(1).optional(), targetRef: z.unknown().optional() });
        const old = schema.parse(raw);
        if (old.targetRef !== undefined) throw new Error('AMBIGUOUS_TARGET_MIGRATION');
        if (old.targetId !== undefined) {
          old.targetRef = { providerId: 'local', resourceType: 'data', kind: old.kind, targetId: old.targetId };
          delete old.targetId;
        }
        Object.assign(raw as object, old);
        if (old.targetRef !== undefined) Reflect.deleteProperty(raw as object, 'targetId');
      });
      await transaction.table('records').toCollection().modify((raw: unknown) => {
        const old = z.looseObject({ kind: z.string().min(1), targetId: z.string().min(1), targetRef: z.unknown().optional() }).parse(raw);
        if (old.targetRef !== undefined) throw new Error('AMBIGUOUS_TARGET_MIGRATION');
        Object.assign(raw as object, { targetRef: { providerId: 'local', resourceType: 'data', kind: old.kind, targetId: old.targetId } });
        Reflect.deleteProperty(raw as object, 'targetId');
        Reflect.deleteProperty(raw as object, 'kind');
      });
    });
    this.version(4).stores({
      recordsV4: '[targetRef.providerId+targetRef.resourceType+targetRef.kind+targetRef.targetId+id], [targetRef.providerId+targetRef.resourceType+targetRef.kind+targetRef.targetId]',
    }).upgrade(async transaction => {
      // IndexedDB cannot change a store's primary key in-place. Copy first;
      // the next version removes the old store in the same upgrade transaction.
      const records: unknown[] = await transaction.table('records').toArray();
      const destination = transaction.table('recordsV4');
      for (const raw of records) {
        const record = z.looseObject({ id: z.string().min(1), targetRef: targetRefSchema }).parse(raw);
        recordKey(record.targetRef, record.id);
        await destination.add(record);
      }
    });
    this.version(5).stores({ records: null });
    this.version(6).stores({ targetStates: '[targetRef.providerId+targetRef.resourceType+targetRef.kind+targetRef.targetId]' }).upgrade(async transaction => {
      const states = transaction.table('targetStates');
      const configs: Config[] = await transaction.table<Config>('configs').toArray();
      const records: DataRecord[] = await transaction.table<DataRecord>('recordsV4').toArray();
      for (const ref of [...configs.flatMap(c => c.targetRef ? [c.targetRef] : []), ...records.map(r => r.targetRef)]) {
        const key = targetKey(ref);
        if (!await states.get(key)) await states.add({ targetRef: ref, lineage: crypto.randomUUID(), revision: 1, retired: false });
      }
    });
  }

  async add(kind: string, value: unknown): Promise<Placement> {
    validateConfig(kind, value);
    const instanceId = crypto.randomUUID();
    return this.transaction('rw', this.placements, this.configs, async () => {
      const position = await this.nextPosition();
      const placement: Placement = { placementId: crypto.randomUUID(), instanceId, revision: 1, position, width: 1 };
      await this.configs.add({ key: `instance:${instanceId}`, kind, schemaVersion: 1, revision: 1, value });
      await this.placements.add(placement);
      return placement;
    });
  }

  private async nextPosition(): Promise<number> {
    const placements = await this.placements.toArray();
    const max = Math.max(0, ...placements.map(p => p.position));
    if (!Number.isFinite(max) || max + 1 <= max) throw new Error('INVALID_LAYOUT');
    return max + 1;
  }

  async updateConfig(key: string, revision: number, value: unknown): Promise<Config> {
    return this.transaction('rw', this.configs, async () => {
      const current = await this.configs.get(key);
      if (!current || current.revision !== revision) throw new ConflictError();
      if (!isSupportedConfig(current)) throw new Error('VERSION_UNSUPPORTED');
      // Never silently discard fields from a future or unrecognized value shape.
      validateConfig(current.kind, current.value);
      validateConfig(current.kind, value);
      const next = { ...current, value, revision: nextRevision(revision) };
      await this.configs.put(next);
      return next;
    });
  }

  async standalone(kind: string, initialValue: unknown): Promise<Config> {
    validateConfig(kind, initialValue);
    return this.transaction('rw', this.configs, async () => {
      const key = `standalone:${kind}`;
      const existing = await this.configs.get(key);
      if (existing) return existing;
      const config: Config = { key, kind, schemaVersion: 1, revision: 1, value: initialValue };
      await this.configs.add(config);
      return config;
    });
  }

  /** All ordinary record writes update the containing target in the same transaction. */
  async putRecord(expected: TargetState, record: DataRecord, expectedRecordRevision: number | null): Promise<TargetState> {
    if (JSON.stringify(targetKey(expected.targetRef)) !== JSON.stringify(targetKey(record.targetRef))) throw new ConflictError();
    return this.transaction('rw', this.records, this.targetStates, this.tombstones, async () => {
      const state = await this.targetStates.get(targetKey(expected.targetRef));
      if (!state || state.retired || state.lineage !== expected.lineage || state.revision !== expected.revision) throw new ConflictError();
      const old = await this.records.get(recordKey(record.targetRef, record.id));
      if (!old && (await this.tombstones.get(recordTombstoneKey(record.targetRef, record.id)) || await this.tombstones.get(`record:${record.id}`))) throw new ConflictError();
      if ((old?.revision ?? null) !== expectedRecordRevision || record.revision !== (old ? nextRevision(old.revision) : 1)) throw new ConflictError();
      if (record.schemaVersion !== 1 || !hasOnlyKeys(record, ['id', 'targetRef', 'schemaVersion', 'revision', 'value']) || (old && (old.schemaVersion !== 1 || !hasOnlyKeys(old, ['id', 'targetRef', 'schemaVersion', 'revision', 'value'])))) throw new Error('VERSION_UNSUPPORTED');
      await this.records.put(record);
      const next = { ...state, revision: nextRevision(state.revision) };
      await this.targetStates.put(next);
      return next;
    });
  }

  async deleteRecord(expected: TargetState, recordId: string, revision: number): Promise<TargetState> {
    return this.transaction('rw', this.records, this.targetStates, this.tombstones, async () => {
      const state = await this.targetStates.get(targetKey(expected.targetRef));
      const record = await this.records.get(recordKey(expected.targetRef, recordId));
      if (!state || state.retired || state.lineage !== expected.lineage || state.revision !== expected.revision || !record || record.revision !== revision) throw new ConflictError();
      if (!hasOnlyKeys(record, ['id', 'targetRef', 'schemaVersion', 'revision', 'value']) || record.schemaVersion !== 1) throw new Error('VERSION_UNSUPPORTED');
      await this.records.delete(recordKey(expected.targetRef, recordId));
      await this.tombstones.put({ key: recordTombstoneKey(expected.targetRef, recordId), revision: nextRevision(revision) });
      const next = { ...state, revision: nextRevision(state.revision) };
      await this.targetStates.put(next);
      return next;
    });
  }

  async restore(instanceId: string): Promise<Placement> {
    return this.transaction('rw', this.placements, this.configs, async () => {
      if (!await this.configs.get(`instance:${instanceId}`)) throw new ConflictError();
      const placement: Placement = { placementId: crypto.randomUUID(), instanceId, revision: 1, position: await this.nextPosition(), width: 1 };
      await this.placements.add(placement);
      return placement;
    });
  }

  async updatePlacement(placementId: string, revision: number, position: number, width: number): Promise<void> {
    if (!Number.isFinite(position) || !Number.isInteger(width) || width < 1 || width > 2) throw new Error('INVALID_LAYOUT');
    await this.transaction('rw', this.placements, async () => {
      const current = await this.placements.get(placementId);
      if (!current || current.revision !== revision) throw new ConflictError();
      if (!hasOnlyKeys(current, ['placementId', 'instanceId', 'revision', 'position', 'width'])) throw new Error('VERSION_UNSUPPORTED');
      await this.placements.put({ ...current, revision: nextRevision(revision), position, width });
    });
  }

  async movePlacement(expected: ReadonlyArray<{ placementId: string; revision: number }>, placementId: string, direction: -1 | 1): Promise<void> {
    await this.transaction('rw', this.placements, async () => {
      const placements = (await this.placements.toArray()).sort((a, b) => a.position - b.position || a.placementId.localeCompare(b.placementId));
      if (expected.length !== placements.length || placements.some((p, i) => p.placementId !== expected[i]?.placementId || p.revision !== expected[i]?.revision)) throw new ConflictError();
      const index = placements.findIndex(p => p.placementId === placementId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= placements.length) throw new ConflictError();
      const moving = placements[index];
      if (!moving) throw new ConflictError();
      placements.splice(index, 1);
      placements.splice(destination, 0, moving);
      for (const [i, placement] of placements.entries()) {
        if (!hasOnlyKeys(placement, ['placementId', 'instanceId', 'revision', 'position', 'width'])) throw new Error('VERSION_UNSUPPORTED');
        await this.placements.put({ ...placement, position: i + 1, revision: nextRevision(placement.revision) });
      }
    });
  }

  async previewRemoval(placementId: string): Promise<RemovalPreview> {
    return this.transaction('r', this.placements, this.configs, this.records, this.targetStates, async () => {
      const placement = await this.placements.get(placementId);
      if (!placement) throw new ConflictError();
      const config = await this.configs.get(`instance:${placement.instanceId}`);
      if (!config) throw new ConflictError();
      const placements = await this.placements.where('instanceId').equals(placement.instanceId).toArray();
      const targetConfigs = config.targetRef ? await this.configs.where(targetIndex).equals(targetKey(config.targetRef)).toArray() : [];
      const records = config.targetRef ? await this.records.where(targetIndex).equals(targetKey(config.targetRef)).toArray() : [];
      const targetState = config.targetRef ? await this.targetStates.get(targetKey(config.targetRef)) : undefined;
      if (config.targetRef && (!targetState || targetState.retired)) throw new ConflictError();
      const references = [...placements.filter(p => p.placementId !== placementId).map(p => p.placementId),
        ...targetConfigs.filter(c => c.key !== config.key).map(c => c.key)];
      return { placement, config, records, ...(targetState ? { targetState } : {}), shared: references.length > 0, references };
    });
  }

  /** The caller must obtain explicit confirmation before invoking this method. */
  async remove(preview: RemovalPreview, mode: 'detach' | 'delete'): Promise<void> {
    await this.transaction('rw', this.placements, this.configs, this.records, this.tombstones, this.targetStates, async () => {
      const fresh = await this.previewRemoval(preview.placement.placementId);
      // Compare identities, revisions and membership; do not serialize opaque user payloads.
      const recordVersions = (records: DataRecord[]) => JSON.stringify(records.map(r => [r.id, r.revision] as const).sort(([a], [b]) => a.localeCompare(b)));
      if (fresh.placement.revision !== preview.placement.revision ||
          fresh.placement.instanceId !== preview.placement.instanceId ||
          fresh.config.key !== preview.config.key || fresh.config.revision !== preview.config.revision ||
          fresh.config.kind !== preview.config.kind || JSON.stringify(fresh.config.targetRef) !== JSON.stringify(preview.config.targetRef) ||
          JSON.stringify(fresh.targetState) !== JSON.stringify(preview.targetState) ||
          recordVersions(fresh.records) !== recordVersions(preview.records) ||
          JSON.stringify([...fresh.references].sort()) !== JSON.stringify([...preview.references].sort())) throw new ConflictError();
      if (!hasOnlyKeys(fresh.placement, ['placementId', 'instanceId', 'revision', 'position', 'width'])) throw new Error('VERSION_UNSUPPORTED');
      const placementRetiredRevision = nextRevision(fresh.placement.revision);
      if (mode === 'delete') {
        if (!isSupportedConfig(fresh.config)) throw new Error('VERSION_UNSUPPORTED');
        validateConfig(fresh.config.kind, fresh.config.value);
        if (fresh.records.some(record => record.schemaVersion !== 1 || !hasOnlyKeys(record, ['id', 'targetRef', 'schemaVersion', 'revision', 'value']) || !targetRefSchema.safeParse(record.targetRef).success)) throw new Error('VERSION_UNSUPPORTED');
      }
      await this.placements.delete(fresh.placement.placementId);
      await this.tombstones.put({ key: `placement:${fresh.placement.placementId}`, revision: placementRetiredRevision });
      if (mode === 'detach') return;
      const otherPlacements = await this.placements.where('instanceId').equals(fresh.placement.instanceId).count();
      if (otherPlacements === 0) {
        await this.configs.delete(fresh.config.key);
        await this.tombstones.put({ key: fresh.config.key, revision: nextRevision(fresh.config.revision) });
        if (!fresh.shared) for (const record of fresh.records) {
          await this.records.delete(recordKey(record.targetRef, record.id));
          await this.tombstones.put({ key: recordTombstoneKey(record.targetRef, record.id), revision: nextRevision(record.revision) });
        }
        if (!fresh.shared && fresh.targetState) await this.targetStates.put({ ...fresh.targetState, revision: nextRevision(fresh.targetState.revision), retired: true });
      }
    });
  }
}
