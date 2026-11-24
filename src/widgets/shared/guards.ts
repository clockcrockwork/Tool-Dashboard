/** Small type guards for `WidgetDataDef.sanitize` (保存の検証). Unknown fields are dropped by building new objects. */
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const isStr = (v: unknown): v is string => typeof v === 'string';
export const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

/** Keeps the array items that `pick` accepts (returns null for a rejected item). Null when `raw` is not an array. */
export function pickList<T>(raw: unknown, pick: (x: unknown) => T | null, max: number): T[] | null {
  if (!Array.isArray(raw)) return null;
  const out: T[] = [];
  for (const x of raw) {
    const v = pick(x);
    if (v !== null) out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/** `HH:MM` (prototype `fm`). */
export function hhmm(t: number): string {
  const d = new Date(t);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
