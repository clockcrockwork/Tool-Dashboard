/**
 * 登録の `store` (実装ガイド 4章「登録の項目」, 7.5): the record a kind saves and its version.
 * Not written in the registry: it is read from the record definitions (`WIDGET_DATA`), so it is defined once.
 * Each placement keeps its own record in its own section (`lgd.v1:w:<配置ID>`; `share` is undecided, 実装ガイド 7.6).
 */
import { WIDGET_DATA } from '../../widgets';
import { widgetKey } from '../store/persist';
import type { WidgetDataDef } from '../store/types';

export type StoreRef = Readonly<{
  /** Saved section of a placement of this kind (`lgd.v1:w:links#2`). */
  section: (placementId: string) => string;
  /** Version of the record's shape (`WidgetDataDef.version`, saved as `dv`). */
  version: number;
}>;

/** The record of `kind`, or undefined for kinds that save settings only. */
export function storeOf(kind: string, defs: Readonly<Record<string, WidgetDataDef<unknown>>> = WIDGET_DATA): StoreRef | undefined {
  const def = defs[kind];
  return def ? { section: widgetKey, version: def.version } : undefined;
}
