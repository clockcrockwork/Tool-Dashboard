/**
 * 種類 ID と配置 ID (実装ガイド 4章「登録の項目」id、7.4「同じ種類を複数置く」).
 *
 * - 種類 ID (kind) は登録表のキー (`links`)。登録の値 (大きさ、`pg`、`multi`、固有設定の定義) は種類で引く。
 * - 配置 ID (instance) は置いた1個の ID。最初の1個は種類 ID そのもの (`links`)、2個目以降は `links#2` の形。
 *   並び・置き場所・大きさ・未配置・固定・全画面 (`order` `place` `sizes` `off` `pins` `lockSz` `pgW`)、
 *   区画 `lgd.v1:w:<配置ID>`、`cfg` と `data` は配置 ID で持つ。
 * - `multi: false` の種類は配置 ID が種類 ID の1個だけ (`search#2` は不正な ID として捨てる)。
 */
import { REGISTRY, type WidgetDef } from './registry';

export const INSTANCE_SEP = '#';

/** `links#2` → `links`; `links` → `links`. Does not check that the kind exists. */
export function kindOf(id: string): string {
  const i = id.indexOf(INSTANCE_SEP);
  return i < 0 ? id : id.slice(0, i);
}

/** `links` → 1, `links#2` → 2. NaN for a malformed suffix. */
export function instanceNo(id: string): number {
  const i = id.indexOf(INSTANCE_SEP);
  if (i < 0) return 1;
  const s = id.slice(i + 1);
  return /^[1-9]\d{0,3}$/.test(s) ? Number(s) : NaN;
}

/** `links`, 2 → `links#2`; n = 1 is the kind ID itself. */
export function instanceId(kind: string, n: number): string {
  return n <= 1 ? kind : kind + INSTANCE_SEP + String(n);
}

/**
 * A placement ID this build understands: a registered kind, and for `#n` (n ≥ 2, written without leading zeros)
 * a kind with `multi: true`.
 */
export function isInstanceId(id: unknown, defs: Readonly<Record<string, WidgetDef>> = REGISTRY): id is string {
  if (typeof id !== 'string') return false;
  const def = defs[kindOf(id)];
  if (!def) return false;
  const n = instanceNo(id);
  if (n === 1) return !id.includes(INSTANCE_SEP);
  return Number.isInteger(n) && n >= 2 && def.multi;
}

/** Registry entry of a placement ID (`links#2` → links). Undefined for IDs this build does not understand. */
export function defOf(id: string): WidgetDef | undefined {
  return isInstanceId(id) ? REGISTRY[kindOf(id)] : undefined;
}

/** Display name of a placement (the kind name; `links#2` is also 「クイックリンク」). */
export function nameOf(id: string): string {
  return defOf(id)?.n ?? id;
}

/** The smallest free placement ID of `kind` (skips IDs in `taken`). */
export function nextInstanceId(kind: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  for (let n = 1; ; n++) {
    const id = instanceId(kind, n);
    if (!used.has(id)) return id;
  }
}

/** Placement IDs sorted by registry order, then by number (stable DOM order: first instances as before). */
export function sortInstances(ids: Iterable<string>): string[] {
  const rank = new Map(Object.keys(REGISTRY).map((k, i) => [k, i]));
  return [...new Set(ids)].filter(id => isInstanceId(id)).sort((a, b) =>
    (rank.get(kindOf(a)) ?? 0) - (rank.get(kindOf(b)) ?? 0) || instanceNo(a) - instanceNo(b));
}
