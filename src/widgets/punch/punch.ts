/**
 * 打刻の計算（純粋関数）. セッションの長さ、出勤の時刻で決める日・月の集計、出勤・休憩・再開・退勤、業務の種類の追加・名前・削除.
 *
 * - 勤務時間は「出勤から退勤（勤務中なら今）まで」から休憩を引く。時刻の差で出すので常時の処理は要らない。
 * - 集計は出勤の時刻で決める: 月の集計は、出勤の時刻がその月に入っているセッションの合計（月末の夜に出勤して翌月に退勤しても
 *   出勤の月）。今日も同じ。日・月の境界はローカル時刻で、`new Date(y, m, d)` の演算で出す（DST のある地域でも1日が
 *   24時間とは限らないので、ミリ秒を足さない）。
 */
import { fm, p2 } from '../shared/time';
import { BREAK_MAX, SESSION_MAX, TYPE_MAX, cleanName, type PunchData, type Session, type WorkType } from './data';

export type PunchOp = 'in' | 'break' | 'resume' | 'out';
/** The text for the toast and the time log row (prototype `stamp(kind, label)`); the type name follows in （）. */
export const OP_LABEL: Readonly<Record<PunchOp, string>> = { in: '出勤', break: '休憩開始', resume: '休憩終了', out: '退勤' };

// ---------- time ----------

/** Start of the local day of `t`, and of the next day (local calendar arithmetic, DST safe). */
export function dayRange(t: number): [number, number] {
  const d = new Date(t);
  return [new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()];
}

/** Start of the local month of `t`, and of the next month. */
export function monthRange(t: number): [number, number] {
  const d = new Date(t);
  return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()];
}

/** `H:MM:SS`. */
export function hms(sec: number): string {
  return String(Math.floor(sec / 3600)) + ':' + p2(Math.floor(sec / 60) % 60) + ':' + p2(sec % 60);
}

/** `H:MM`. */
export function hm(sec: number): string {
  return String(Math.floor(sec / 3600)) + ':' + p2(Math.floor(sec / 60) % 60);
}

const WD = ['日', '月', '火', '水', '木', '金', '土'] as const;
/** `11/19(木)`. */
export function md(t: number): string {
  const d = new Date(t);
  return String(d.getMonth() + 1) + '/' + String(d.getDate()) + '(' + (WD[d.getDay()] ?? '') + ')';
}

// ---------- sessions ----------

export function openSession(d: PunchData): Session | null {
  return d.sessions.find(s => s.en === null) ?? null;
}

export function onBreak(s: Session | null): boolean {
  return !!s && s.en === null && s.br.at(-1)?.en === null;
}

/** Worked seconds of one session: from 出勤 to 退勤 (or `now` while on duty), breaks excluded. */
export function sessionSecs(s: Session, now: number): number {
  const end = s.en ?? Math.max(now, s.st);
  let ms = end - s.st;
  for (const b of s.br) ms -= Math.max(0, Math.min(b.en ?? end, end) - b.st);
  return Math.max(0, Math.floor(ms / 1000));
}

/** Worked seconds of the sessions of type `ty` whose 出勤 falls in [from, to). */
export function sumSecs(sessions: readonly Session[], ty: number, from: number, to: number, now: number): number {
  let sec = 0;
  for (const s of sessions) if (s.ty === ty && s.st >= from && s.st < to) sec += sessionSecs(s, now);
  return sec;
}

/** 今日と今月の合計（出勤の時刻で決める）. */
export function totals(d: PunchData, ty: number, now: number): { today: number; month: number } {
  const [d0, d1] = dayRange(now);
  const [m0, m1] = monthRange(now);
  return { today: sumSecs(d.sessions, ty, d0, d1, now), month: sumSecs(d.sessions, ty, m0, m1, now) };
}

/** The type the next 出勤 uses, or the open session's type: 前回選んだ種類. */
export function curType(d: PunchData): WorkType | null {
  const open = openSession(d);
  const id = open ? open.ty : d.last;
  return d.types.find(t => t.id === id) ?? (open ? { id: open.ty, n: open.n } : d.types[0] ?? null);
}

/** `22:04–06:10` (翌 when it ends the next day, the date when later), `22:04–` while on duty. */
export function span(s: Session): string {
  if (s.en === null) return fm(s.st) + '–';
  const [, d1] = dayRange(s.st);
  const [, d2] = dayRange(d1);
  const pre = s.en < d1 ? '' : s.en < d2 ? '翌' : md(s.en) + ' ';
  return fm(s.st) + '–' + pre + fm(s.en);
}

/** The latest event time of a session (to keep times in order if the clock goes back). */
function lastTime(s: Session): number {
  const b = s.br.at(-1);
  return Math.max(s.st, b ? (b.en ?? b.st) : s.st);
}

export function nextSessionId(d: PunchData, now: number): number {
  return Math.max(now, ...d.sessions.map(x => x.id + 1));
}

/** What the main button does (出勤／退勤). */
export function mainOp(d: PunchData): PunchOp {
  return openSession(d) ? 'out' : 'in';
}

/** What the break button does (休憩／再開); null while off duty (disabled), or when the session has 20 breaks. */
export function breakOp(d: PunchData): PunchOp | null {
  const s = openSession(d);
  if (!s) return null;
  if (onBreak(s)) return 'resume';
  return s.br.length >= BREAK_MAX ? null : 'break';
}

function withSession(d: PunchData, s: Session): PunchData {
  return { ...d, sessions: d.sessions.map(x => (x.id === s.id ? s : x)) };
}

/**
 * One punch. Returns the next record and the event time used (null when the operation does not apply now).
 * 出勤 starts a session with the current type; 退勤 closes the open session (and an open break with it).
 */
export function punch(d: PunchData, op: PunchOp, now: number, id = nextSessionId(d, now)): { data: PunchData; t: number } | null {
  const s = openSession(d);
  if (op === 'in') {
    const ty = curType(d);
    if (s || !ty) return null;
    const ns: Session = { id, ty: ty.id, n: ty.n, st: now, en: null, br: [] };
    return { data: { ...d, sessions: [...d.sessions, ns].slice(-SESSION_MAX) }, t: now };
  }
  if (!s) return null;
  const t = Math.max(now, lastTime(s));
  const br = s.br.slice();
  const last = br.at(-1);
  if (op === 'out') {
    if (last && last.en === null) br[br.length - 1] = { st: last.st, en: t };
    return { data: withSession(d, { ...s, en: t, br }), t };
  }
  if (op === 'break') {
    if (onBreak(s) || br.length >= BREAK_MAX) return null;
    return { data: withSession(d, { ...s, br: [...br, { st: t, en: null }] }), t };
  }
  if (!last || last.en !== null) return null;
  br[br.length - 1] = { st: last.st, en: t };
  return { data: withSession(d, { ...s, br }), t };
}

/**
 * Takes back one punch made at `t` on session `sid` (トーストの「元に戻す」): only what that punch changed.
 * 出勤 removes that session; 退勤 opens it again (and the break it closed); 休憩 removes that break; 再開 opens that break
 * again. When later punches make it impossible (another session is on duty now, the session was closed since…), the record
 * is left as it is.
 */
export function unpunch(d: PunchData, op: PunchOp, sid: number, t: number, closedBreak: boolean): PunchData {
  const s = d.sessions.find(x => x.id === sid);
  if (!s) return d;
  if (op === 'in') return { ...d, sessions: d.sessions.filter(x => x.id !== sid) };
  const br = s.br.slice();
  const last = br.at(-1);
  if (op === 'out') {
    if (s.en !== t || openSession(d)) return d;
    if (closedBreak && last && last.en === t) br[br.length - 1] = { st: last.st, en: null };
    return withSession(d, { ...s, en: null, br });
  }
  if (op === 'break') {
    if (s.en !== null || !last || last.st !== t) return d;
    return withSession(d, { ...s, br: br.slice(0, -1) });
  }
  if (s.en !== null || !last || last.en !== t) return d;
  br[br.length - 1] = { st: last.st, en: null };
  return withSession(d, { ...s, br });
}

// ---------- types ----------

/** Selects a type (前回選んだ種類). While on duty it also changes the open session's type. */
export function selectType(d: PunchData, id: number): PunchData {
  const ty = d.types.find(t => t.id === id);
  if (!ty) return d;
  const s = openSession(d);
  const next = { ...d, last: id };
  return s && s.ty !== id ? withSession(next, { ...s, ty: id, n: ty.n }) : next;
}

/** A type ID not used by any type or session (a deleted type's sessions never join a new type). */
export function nextTypeId(d: PunchData): number {
  return Math.max(0, ...d.types.map(t => t.id), ...d.sessions.map(s => s.ty)) + 1;
}

/** Adds 「種類N」 and selects it. Null at 8 types or while on duty. */
export function addType(d: PunchData): PunchData | null {
  if (d.types.length >= TYPE_MAX || openSession(d)) return null;
  const names = new Set(d.types.map(t => t.n));
  let i = d.types.length + 1;
  while (names.has('種類' + String(i))) i++;
  const id = nextTypeId(d);
  return { ...d, types: [...d.types, { id, n: '種類' + String(i) }], last: id };
}

/** Renames a type; its sessions take the new name. Null when the name is empty. */
export function renameType(d: PunchData, id: number, name: string): PunchData | null {
  const n = cleanName(name);
  if (!n || !d.types.some(t => t.id === id)) return null;
  return {
    ...d,
    types: d.types.map(t => (t.id === id ? { id, n } : t)),
    sessions: d.sessions.map(s => (s.ty === id ? { ...s, n } : s)),
  };
}

export function canRemoveType(d: PunchData, id: number): boolean {
  return d.types.length > 1 && d.types.some(t => t.id === id) && openSession(d)?.ty !== id;
}

/**
 * Removes a type. Its sessions stay with their type name (shown in the list, written in the time log), but are no longer
 * counted under any chip. The last type and the open session's type cannot be removed.
 */
export function removeType(d: PunchData, id: number): PunchData | null {
  if (!canRemoveType(d, id)) return null;
  const types = d.types.filter(t => t.id !== id);
  return { ...d, types, last: d.last === id ? (types[0]?.id ?? d.last) : d.last };
}

/** 削除の「元に戻す」: puts the type back at its place (and selects it again if it was selected), other edits stay. */
export function restoreType(d: PunchData, ty: WorkType, at: number, wasLast: boolean): PunchData {
  if (d.types.some(t => t.id === ty.id) || d.types.length >= TYPE_MAX) return d;
  const types = d.types.slice();
  types.splice(Math.min(at, types.length), 0, ty);
  const sessions = d.sessions.map(s => (s.ty === ty.id && s.n !== ty.n ? { ...s, n: ty.n } : s));
  return { ...d, types, sessions, last: wasLast && !openSession(d) ? ty.id : d.last };
}

// ---------- view ----------

export type PunchView = {
  state: string;
  worked: string;
  /** 勤務中: このセッションの打刻。勤務外: 前回のセッション. */
  line: string;
  /** 今日と今月の合計（選んでいる種類）. */
  sum: string;
  typeName: string;
  mainLabel: string;
  mainCls: string;
  off: boolean;
  breakLabel: string;
};

const TAG = { in: '出', break: '休', resume: '戻', out: '退' } as const;

/** このセッションの打刻（新しい4つ）. 出勤が今日より前（夜勤など）なら出勤に日付を付ける. */
function sessionLine(s: Session, now: number): string {
  const ev: string[] = [TAG.in + ' ' + (s.st < dayRange(now)[0] ? md(s.st) + ' ' : '') + fm(s.st)];
  for (const b of s.br) {
    ev.push(TAG.break + ' ' + fm(b.st));
    if (b.en !== null && b.en !== s.en) ev.push(TAG.resume + ' ' + fm(b.en));
  }
  if (s.en !== null) ev.push(TAG.out + ' ' + fm(s.en));
  return ev.slice(-4).join('　');
}

export function punchView(d: PunchData, now: number): PunchView {
  const s = openSession(d);
  const ty = curType(d);
  const tid = ty?.id ?? 0;
  const t = totals(d, tid, now);
  const [d0] = dayRange(now);
  const done = d.sessions.filter(x => x.en !== null);
  const prev = done.filter(x => x.ty === tid).at(-1);
  const brk = onBreak(s);
  const b = breakOp(d);
  return {
    state: s ? (brk ? '休憩中' : '勤務中') : done.some(x => (x.en ?? 0) >= d0) ? '退勤済み' : '未出勤',
    worked: hms(s ? sessionSecs(s, now) : t.today),
    line: s ? sessionLine(s, now) : prev ? '前回 ' + md(prev.st) + ' ' + span(prev) : '打刻なし',
    sum: '今日 ' + hm(t.today) + '　今月 ' + hm(t.month),
    typeName: ty?.n ?? '',
    mainLabel: s ? '退勤' : '出勤',
    mainCls: s ? '' : 'on',
    off: b === null,
    breakLabel: brk ? '再開' : '休憩',
  };
}

export type SessionRow = { id: number; day: string; n: string; span: string; len: string; open: boolean };

/** Recent sessions, newest first (all types; a deleted type's sessions keep their name). */
export function recentRows(d: PunchData, now: number, max = 30): SessionRow[] {
  return d.sessions.slice(-max).reverse().map(s => ({
    id: s.id, day: md(s.st), n: s.n, span: span(s), len: hm(sessionSecs(s, now)), open: s.en === null,
  }));
}

/** How much the widget shows for its size (仕様書 3章「段階表示」). */
export type PunchTier = { chips: boolean; break: boolean; lines: boolean; list: '' | 'below' | 'side' };

export function punchTier(sz: { w: number; h: number }): PunchTier {
  if (sz.w < 2) return { chips: false, break: false, lines: false, list: '' };
  if (sz.h < 2) return { chips: false, break: true, lines: false, list: '' };
  return { chips: true, break: true, lines: true, list: sz.w >= 3 ? 'side' : sz.h >= 3 ? 'below' : '' };
}
