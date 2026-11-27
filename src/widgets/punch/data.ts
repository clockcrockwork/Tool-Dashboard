/**
 * 打刻の記録 v2 (区画 `w:<配置ID>` の data). 出勤から退勤までを1つのセッションにする（日付で区切らない。夜勤も1セッション）.
 * 業務の種類（本業・副業など）を選び、出勤するとその種類でセッションを始める（docs/lgd/p2a-followup.md 4章）.
 *
 * - `types`: 業務の種類（並び順どおり）。利用者が足す・名前を変える・消す。最大8つ、名前は16文字まで。
 * - `last`: 前回選んだ種類の ID（次の出勤の既定）。
 * - `sessions`: 古い順（出勤の時刻順）。`en` が null のものが勤務中（多くて1つ）。休憩はセッションの中に `br` で持つ。
 *   `n` はそのときの種類の名前の写し: 種類を消してもセッションの種類名は残る（名前を変えると、まだある種類のセッションも変わる）。
 *   上限は新しい400件（毎日1回なら1年と少し）で、古いものから捨てる。
 *
 * v1（`{ stamps: [{ id, k, t }] }`、出勤・休憩・再開・退勤の打刻の並び）は `migrate` で出勤と退勤の組からセッションに移す
 * （種類は既定の1つ目）。組にできない並びは移行の失敗（null）とし、区画は書き換えずに残す（review #1）.
 */
import type { WidgetDataDef } from '../../app/store/store';
import { isNum, isObj, isStr } from '../shared/guards';

export type WorkType = { id: number; n: string };
export type Break = { st: number; en: number | null };
export type Session = { id: number; ty: number; n: string; st: number; en: number | null; br: Break[] };
export type PunchData = { types: WorkType[]; last: number; sessions: Session[] };

export const TYPE_MAX = 8;
export const TYPE_NAME_MAX = 16;
export const SESSION_MAX = 400;
export const BREAK_MAX = 20;
/** 種類の初期値（並び順どおり。v1 から移したセッションは1つ目）. */
export const DEFAULT_TYPES: readonly string[] = ['本業', '副業'];

export function defaultTypes(): WorkType[] {
  return DEFAULT_TYPES.map((n, i) => ({ id: i + 1, n }));
}

export function initialPunch(): PunchData {
  return { types: defaultTypes(), last: 1, sessions: [] };
}

/** A type name as kept: trimmed, at most 16 characters; null when empty. */
export function cleanName(v: unknown): string | null {
  if (!isStr(v)) return null;
  const n = Array.from(v.trim()).slice(0, TYPE_NAME_MAX).join('');
  return n ? n : null;
}

const isId = (v: unknown): v is number => isNum(v) && Number.isInteger(v) && v > 0;
const isTime = (v: unknown): v is number => isNum(v) && v >= 0;

function pickTypes(raw: unknown): WorkType[] | null {
  if (raw === undefined) return defaultTypes();
  if (!Array.isArray(raw)) return null;
  const seen = new Set<number>();
  const out: WorkType[] = [];
  for (const v of raw as unknown[]) {
    if (!isObj(v) || !isId(v.id) || seen.has(v.id)) continue;
    const n = cleanName(v.n);
    if (!n) continue;
    seen.add(v.id);
    out.push({ id: v.id, n });
    if (out.length >= TYPE_MAX) break;
  }
  return out.length ? out : defaultTypes();
}

/** Breaks of a session: inside the session, in order, not overlapping; only the last may be open, and only while on duty. */
function pickBreaks(raw: unknown, st: number, en: number | null): Break[] {
  if (!Array.isArray(raw)) return [];
  const out: Break[] = [];
  let from = st;
  for (const v of raw as unknown[]) {
    if (!isObj(v) || !isTime(v.st) || v.st < from) continue;
    if (en !== null && v.st > en) continue;
    let e: number | null = v.en === null ? null : isTime(v.en) && v.en >= v.st ? v.en : -1;
    if (e === -1) continue;
    // A break left open in a closed session ends with the session.
    if (e === null && en !== null) e = en;
    if (e !== null && en !== null && e > en) continue;
    out.push({ st: v.st, en: e });
    if (e === null) break;
    from = e;
  }
  return out.slice(-BREAK_MAX);
}

function pickSession(v: unknown, names: ReadonlyMap<number, string>): Session | null {
  if (!isObj(v) || !isNum(v.id) || !isId(v.ty) || !isTime(v.st)) return null;
  const en = v.en === null ? null : isTime(v.en) && v.en >= v.st ? v.en : -1;
  if (en === -1) return null;
  const n = cleanName(v.n) ?? names.get(v.ty);
  if (!n) return null;
  return { id: v.id, ty: v.ty, n, st: v.st, en, br: pickBreaks(v.br, v.st, en) };
}

function pickSessions(raw: unknown, types: readonly WorkType[]): Session[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  const names = new Map(types.map(t => [t.id, t.n]));
  const seen = new Set<number>();
  const out: Session[] = [];
  for (const v of raw as unknown[]) {
    const s = pickSession(v, names);
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  out.sort((a, b) => a.st - b.st);
  // At most one session on duty: the latest open one (others are broken records and are dropped).
  const open = out.filter(s => s.en === null).at(-1);
  return out.filter(s => s.en !== null || s === open).slice(-SESSION_MAX);
}

export function sanitizePunch(raw: unknown): PunchData | null {
  if (!isObj(raw)) return null;
  const types = pickTypes(raw.types);
  if (!types) return null;
  const sessions = pickSessions(raw.sessions, types);
  if (!sessions) return null;
  const first = types[0]?.id ?? 1;
  const last = isNum(raw.last) && types.some(t => t.id === raw.last) ? raw.last : first;
  return { types, last, sessions };
}

// ---------- v1 ----------

export type V1Kind = 'in' | 'break' | 'resume' | 'out';
export type V1Stamp = { id: number; k: V1Kind; t: number };
const V1_KINDS: readonly V1Kind[] = ['in', 'break', 'resume', 'out'];

/** v1 の検証（v1 の `sanitize` と同じ: 種類・時刻を確かめ、重複を捨てる）. */
function v1Stamps(raw: unknown): V1Stamp[] | null {
  if (!isObj(raw) || !Array.isArray(raw.stamps)) return null;
  const seen = new Set<number>();
  const out: V1Stamp[] = [];
  for (const v of raw.stamps as unknown[]) {
    if (!isObj(v) || !isNum(v.id) || !isTime(v.t) || !V1_KINDS.includes(v.k as V1Kind) || seen.has(v.id)) continue;
    seen.add(v.id);
    out.push({ id: v.id, k: v.k as V1Kind, t: v.t });
  }
  return out;
}

/**
 * v1 → v2: 出勤から退勤（休憩・再開はその間の休憩）を1セッションにする。種類は既定の1つ目.
 * 先頭の、最初の出勤より前の打刻は捨てる（v1 は新しい200件だけを残したので、始まりが切れたセッションの続き）.
 * それより後で組にできない並び（勤務中の出勤、勤務外の休憩・再開・退勤、休憩中でない再開、休憩中の休憩）や、時刻が戻る並びは
 * 移行の失敗（null）: 推測で直さず、区画を書き換えずに残す.
 */
export function migrateV1(raw: unknown): PunchData | null {
  const stamps = v1Stamps(raw);
  if (!stamps) return null;
  const types = defaultTypes();
  const ty = types[0] ?? { id: 1, n: DEFAULT_TYPES[0] ?? '本業' };
  const sessions: Session[] = [];
  let cur: Session | null = null;
  let prev = -Infinity;
  for (const p of stamps) {
    if (p.t < prev) return null;
    prev = p.t;
    const brk = cur?.br.at(-1);
    const onBreak = !!brk && brk.en === null;
    if (!cur) {
      if (p.k === 'in') {
        cur = { id: p.id, ty: ty.id, n: ty.n, st: p.t, en: null, br: [] };
        sessions.push(cur);
      } else if (sessions.length) return null;
      continue;
    }
    if (p.k === 'in') return null;
    if (p.k === 'break') {
      if (onBreak) return null;
      cur.br.push({ st: p.t, en: null });
    } else if (p.k === 'resume') {
      if (!onBreak) return null;
      brk.en = p.t;
    } else {
      if (onBreak) brk.en = p.t;
      cur.en = p.t;
      cur = null;
    }
  }
  return { types, last: ty.id, sessions: sessions.slice(-SESSION_MAX) };
}

export const punchData: WidgetDataDef<PunchData> = {
  version: 2,
  initial: () => initialPunch(),
  sanitize: raw => sanitizePunch(raw),
  migrate: (raw, from) => (from === 1 ? migrateV1(raw) : null),
  // Nothing temporary is kept in the record (the type editor's open state lives in the component); rebuilt so only the
  // three fields are written.
  toSaved: d => ({ types: d.types, last: d.last, sessions: d.sessions }),
};
