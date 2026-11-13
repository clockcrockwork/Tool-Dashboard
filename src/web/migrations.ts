import type { LocalRepository } from './local-repository';

/** A step maps exactly one version to the next. Steps must be deterministic and synchronous. */
export interface ConfigMigrationPolicy {
  readonly currentVersion: number;
  readonly steps: Readonly<Record<number, (value: unknown) => unknown>>;
  readonly isCurrent: (value: unknown) => boolean;
}
export type ConfigMigrationRegistry = Readonly<Record<string, ConfigMigrationPolicy>>;

export class MigrationError extends Error {
  constructor() { super('CONFIG_MIGRATION_FAILED'); }
}

/**
 * Migrate the complete config set atomically. Unknown kinds and newer versions
 * are preserved byte-for-byte by leaving their records untouched. A failure in
 * any supported record aborts the entire transaction, including earlier puts.
 * The caller must not render editable views until this resolves successfully.
 *
 * Only add policies for documented formats and validators; a missing step is a
 * failure, never permission to guess a default or silently discard data.
 */
export async function migrateConfigs(
  db: LocalRepository,
  registry: ConfigMigrationRegistry,
): Promise<{ migrated: number; unsupported: number }> {
  return db.transaction('rw', db.configs, async () => {
    const configs = await db.configs.toArray();
    let migrated = 0;
    let unsupported = 0;
    for (const config of configs) {
      const policy = Object.hasOwn(registry, config.kind) ? registry[config.kind] : undefined;
      if (!policy || config.schemaVersion > policy.currentVersion) {
        unsupported++;
        continue;
      }
      if (!Number.isSafeInteger(config.schemaVersion) || config.schemaVersion < 0 ||
          !Number.isSafeInteger(policy.currentVersion) || policy.currentVersion < 0) throw new MigrationError();
      if (config.schemaVersion === policy.currentVersion) continue;
      if (!Number.isSafeInteger(config.revision) || config.revision < 1 || config.revision >= Number.MAX_SAFE_INTEGER) throw new MigrationError();
      let value: unknown = structuredClone(config.value);
      try {
        for (let version = config.schemaVersion; version < policy.currentVersion; version++) {
          const step = Object.hasOwn(policy.steps, version) ? policy.steps[version] : undefined;
          if (!step) throw new MigrationError();
          value = step(value);
        }
        if (!policy.isCurrent(value)) throw new MigrationError();
      } catch {
        throw new MigrationError();
      }
      await db.configs.put({ ...config, value, schemaVersion: policy.currentVersion, revision: config.revision + 1 });
      migrated++;
    }
    return { migrated, unsupported };
  });
}
