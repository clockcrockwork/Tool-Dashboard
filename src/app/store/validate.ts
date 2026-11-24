/**
 * 検証の定義 (実装ガイド 4章「固有設定の型」・5章「項目ごとに検証してから反映」). One place for the rules used by
 * the settings sheet (`Dashboard.setCfg`), restoring saved sections and importing a file, so the three never disagree.
 * External input is checked with Zod (the project's rule for untrusted data, as in `src/core`); this module stays in
 * the app layer because the rules are derived from the widget registry.
 */
import { z } from 'zod';
import { REGISTRY, type Field, type FieldValue } from '../registry/registry';

/** 1行の入力欄 (`tx`) の長さの上限. */
export const TX_MAX = 2000;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` that names a real calendar date (2026-02-30 is rejected). */
export function isRealDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1 && t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** On the `step` grid counted from `min` (float-safe). */
function onStep(v: number, min: number, step: number): boolean {
  if (!(step > 0)) return true;
  const k = (v - min) / step;
  return Math.abs(k - Math.round(k)) < 1e-9;
}

function fieldSchema(f: Field): z.ZodType<FieldValue> {
  switch (f.t) {
    case 'tg': return z.boolean();
    case 'sg': return f.o ? z.string().refine(v => (f.o ?? []).includes(v)) : z.string();
    case 'st':
    case 'rg': {
      const lo = f.min ?? Number.NEGATIVE_INFINITY, hi = f.max ?? Number.POSITIVE_INFINITY;
      const step = f.step ?? 1;
      return z.number().refine(v => Number.isFinite(v) && v >= lo && v <= hi && onStep(v, f.min ?? 0, step));
    }
    case 'tx': return z.string().max(TX_MAX);
    case 'tm': return z.string().regex(TIME_RE);
    case 'dt': return z.string().refine(isRealDate);
  }
}

const cache = new Map<string, z.ZodType<FieldValue>>();
function schemaFor(kind: string, f: Field): z.ZodType<FieldValue> {
  const key = kind + '\u0000' + f.k;
  let s = cache.get(key);
  if (!s) { s = fieldSchema(f); cache.set(key, s); }
  return s;
}

/**
 * The value if `v` is valid for setting `key` of `kind`, else undefined (caller falls back to the default).
 * `veil` (「人前では隠す」) is the one common setting every kind has.
 */
export function checkField(kind: string, key: string, v: unknown): FieldValue | undefined {
  if (key === 'veil') return typeof v === 'boolean' ? v : undefined;
  const f = REGISTRY[kind]?.f.find(x => x.k === key);
  if (!f) return undefined;
  const r = schemaFor(kind, f).safeParse(v);
  return r.success ? r.data : undefined;
}

// ---------------------------------------------------------------- section / envelope headers

/** A version number: an integer ≥ 1 (`dv` may be 0 for kinds without records). */
const versionNo = z.number().int().min(0);

/** Header of a saved/imported section: only the version fields are checked here; the rest is per-item. */
export const sectionHeader = z.looseObject({ v: versionNo.optional(), dv: versionNo.optional() });

export const envelopeHeader = z.looseObject({
  format: z.literal('lgd-dashboard'),
  v: z.number().int().min(1),
  global: z.record(z.string(), z.unknown()),
  widgets: z.record(z.string(), z.unknown()),
});
