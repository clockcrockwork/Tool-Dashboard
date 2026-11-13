import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { LocalRepository, ConflictError } from './local-repository';
import { importLegacyBoard, previewLegacyBoard } from './legacy-import';

const dbs: LocalRepository[] = [];
function db() { const value = new LocalRepository(`legacy-${crypto.randomUUID()}`); dbs.push(value); return value; }
afterEach(async () => { await Promise.all(dbs.splice(0).map(value => value.delete())); });
const source = JSON.stringify({
  version: 1, activePageId: 'one', opaque: { keep: true },
  pages: [{ pageId: 'one', name: 'Home', layouts: { lg: [{ instanceId: 'a', x: 4, w: 2, y: 0, h: 1 }], sm: [] },
    instances: [{ instanceId: 'a', kind: 'color', isVisible: true, config: { version: 1, hex: '#123456', other: [1] } },
      { instanceId: 'b', kind: 'mystery', isVisible: false, config: { version: 99, data: 'opaque' } }] }],
});

it('splits identities deterministically, preserves the complete raw board and never invents supported configs', async () => {
  const preview = previewLegacyBoard(source);
  expect(preview.placements[0]?.placementId).toBe('legacy-v1:one:a');
  expect(preview.placements).toHaveLength(1);
  expect(preview.configs).toHaveLength(2);
  expect(preview.configs[0]?.legacySource).toBe(source);
  expect(preview.configs[0]?.schemaVersion).toBe(2);
  expect(previewLegacyBoard(source).placements).toEqual(preview.placements);
  const store = db();
  await importLegacyBoard(store, source);
  expect((await store.configs.get('instance:b'))?.value).toEqual({ version: 99, data: 'opaque' });
  await expect(store.updateConfig('instance:a', 1, { value: '#abcdef' })).rejects.toThrow('VERSION_UNSUPPORTED');
});

it('does not partially import on collision', async () => {
  const store = db();
  await store.configs.add({ key: 'instance:b', kind: 'mystery', schemaVersion: 1, revision: 1, value: {} });
  await expect(importLegacyBoard(store, source)).rejects.toBeInstanceOf(ConflictError);
  expect(await store.configs.get('instance:a')).toBeUndefined();
  expect(await store.placements.count()).toBe(0);
});

it('rejects ambiguous instance identities', () => {
  const parsed = JSON.parse(source) as { pages: { instances: unknown[] }[] };
  parsed.pages[0]!.instances.push(parsed.pages[0]!.instances[0]);
  expect(() => previewLegacyBoard(JSON.stringify(parsed))).toThrow('DUPLICATE_INSTANCE');
});

it('preserves the raw text of an empty board', async () => {
  const text = JSON.stringify({ version: 1, activePageId: 'p', pages: [{ pageId: 'p', name: '', instances: [], layouts: {} }], opaque: true });
  const store = db();
  await importLegacyBoard(store, text);
  expect((await store.opaqueImports.toArray()).map(item => item.raw)).toContain(text);
});
