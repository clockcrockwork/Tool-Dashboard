import { z } from 'zod';
import { importExport, parseExport, type ExportEnvelope } from './export-import';
import type { LocalRepository } from './local-repository';

const identifier = z.string().min(1).max(200);
const widget = z.looseObject({
  instanceId: identifier,
  kind: identifier,
  isVisible: z.boolean(),
  config: z.unknown().optional(),
});
const page = z.looseObject({
  pageId: identifier,
  name: z.string(),
  instances: z.array(widget),
  layouts: z.record(z.string(), z.array(z.unknown())),
});
const board = z.looseObject({ version: z.literal(1), activePageId: identifier, pages: z.array(page) });

/**
 * Prepare a non-destructive v1 board import. The original JSON text is kept on
 * every imported config as opaque recovery data; no v1 tool config is guessed
 * to be a v2 config. It remains read-only unless a real migration is supplied.
 * Layout is approximated for the v2 board; the original per-breakpoint layout,
 * page and visual settings remain in legacySource. This function does no writes.
 */
export function previewLegacyBoard(text: string): ExportEnvelope {
  if (text.length > 1_000_000) throw new Error('LEGACY_TOO_LARGE');
  const raw: unknown = JSON.parse(text);
  const input = board.parse(raw);
  const pageIds = new Set<string>();
  const instanceIds = new Set<string>();
  const configs: object[] = [];
  const placements: object[] = [];
  let position = 0;
  for (const entry of input.pages) {
    if (pageIds.has(entry.pageId)) throw new Error('DUPLICATE_PAGE');
    pageIds.add(entry.pageId);
    for (const item of entry.instances) {
      if (instanceIds.has(item.instanceId)) throw new Error('DUPLICATE_INSTANCE');
      instanceIds.add(item.instanceId);
      const placementId = `legacy-v1:${encodeURIComponent(entry.pageId)}:${encodeURIComponent(item.instanceId)}`;
      // Use an explicit unsupported version rather than accidentally treating an
      // unrelated v1 tool shape as a valid current v2 configuration.
      configs.push({ key: `instance:${item.instanceId}`, kind: item.kind, schemaVersion: 2,
        revision: 1, value: item.config ?? null, legacyFormat: 'widget-board-v1', legacySource: text });
      if (item.isVisible) placements.push({ placementId, instanceId: item.instanceId, revision: 1, position: position++, width: 1 });
    }
  }
  if (!pageIds.has(input.activePageId)) throw new Error('MISSING_ACTIVE_PAGE');
  // parseExport validates all generated IDs and bounds the resulting package.
  return parseExport(JSON.stringify({ format: 'tool-dashboard-export', exportVersion: 1,
    createdAt: new Date().toISOString(), placements, configs, targets: [] }));
}

/** Commit only after a user has reviewed the preview; collisions abort atomically. */
export async function importLegacyBoard(db: LocalRepository, text: string): Promise<void> {
  const preview = previewLegacyBoard(text);
  await db.transaction('rw', [db.placements, db.configs, db.records, db.tombstones, db.opaqueImports, db.targetStates], async () => {
    await importExport(db, preview);
    await db.opaqueImports.add({ id: crypto.randomUUID(), raw: text });
  });
}
