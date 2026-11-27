import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BREAK_MAX, SESSION_MAX, TYPE_MAX, initialPunch, migrateV1, punchData, sanitizePunch, type PunchData, type Session } from './data';
import {
  addType, breakOp, canRemoveType, curType, dayRange, mainOp, monthRange, openSession, punch, punchTier, punchView, recentRows,
  removeType, renameType, restoreType, selectType, sessionSecs, span, totals, unpunch,
} from './punch';
import { punchText, stampPunch, undoPunch, type PunchTargets } from './transfer';
import { LOG_MAX, initialLogs, type LogItem } from '../timelog/data';

const H = 3_600_000;
const M = 60_000;
let tz0: string | undefined;
/** Runs in a time zone (Node reads TZ on each Date call). Tests use Asia/Tokyo unless they say otherwise. */
const setTZ = (tz: string): void => { process.env.TZ = tz; };
beforeEach(() => { tz0 = process.env.TZ; setTZ('Asia/Tokyo'); });
afterEach(() => { if (tz0 === undefined) delete process.env.TZ; else process.env.TZ = tz0; });

const at = (y: number, mo: number, d: number, h = 0, mi = 0): number => new Date(y, mo - 1, d, h, mi).getTime();
const ses = (id: number, ty: number, n: string, st: number, en: number | null, br: Session['br'] = []): Session => ({ id, ty, n, st, en, br });
const withSessions = (sessions: Session[], extra: Partial<PunchData> = {}): PunchData => ({ ...initialPunch(), sessions, ...extra });
/** Punches and returns the record (fails the test when it does not apply). */
const go = (d: PunchData, op: Parameters<typeof punch>[1], t: number): PunchData => {
  const r = punch(d, op, t);
  if (!r) throw new Error('punch ' + op + ' did not apply');
  return r.data;
};

describe('punch: sessions', () => {
  it('before the first 出勤: 未出勤 0:00:00 打刻なし, main 出勤, break disabled', () => {
    const T = at(2026, 11, 19, 10, 24);
    expect(punchView(initialPunch(), T)).toEqual({
      state: '未出勤', worked: '0:00:00', line: '打刻なし', sum: '今日 0:00　今月 0:00', typeName: '本業',
      mainLabel: '出勤', mainCls: 'on', off: true, breakLabel: '休憩',
    });
    expect(mainOp(initialPunch())).toBe('in');
    expect(breakOp(initialPunch())).toBeNull();
  });

  it('出勤 starts a session with the selected type; 休憩・再開 inside it; 退勤 closes it', () => {
    const T = at(2026, 11, 19, 9, 0);
    let d = go(initialPunch(), 'in', T);
    expect(openSession(d)).toEqual(ses(T, 1, '本業', T, null));
    expect(punch(d, 'in', T + M)).toBeNull();
    expect(punchView(d, T + 30 * M)).toMatchObject({ state: '勤務中', worked: '0:30:00', line: '出 09:00', mainLabel: '退勤', off: false, breakLabel: '休憩' });
    d = go(d, 'break', T + 3 * H);
    expect(punchView(d, T + 3.5 * H)).toMatchObject({ state: '休憩中', worked: '3:00:00', breakLabel: '再開' });
    expect(breakOp(d)).toBe('resume');
    d = go(d, 'resume', T + 4 * H);
    d = go(d, 'out', T + 9 * H);
    expect(openSession(d)).toBeNull();
    expect(d.sessions).toEqual([ses(T, 1, '本業', T, T + 9 * H, [{ st: T + 3 * H, en: T + 4 * H }])]);
    expect(sessionSecs(d.sessions[0] as Session, T + 20 * H)).toBe(8 * 3600);
    expect(punchView(d, T + 10 * H)).toMatchObject({ state: '退勤済み', worked: '8:00:00', line: '前回 11/19(木) 09:00–18:00', sum: '今日 8:00　今月 8:00' });
    expect(punch(d, 'out', T + 10 * H)).toBeNull();
    expect(punch(d, 'break', T + 10 * H)).toBeNull();
  });

  it('退勤 during a break closes the break with the session', () => {
    const T = at(2026, 11, 19, 9, 0);
    const d = go(go(go(initialPunch(), 'in', T), 'break', T + H), 'out', T + 2 * H);
    expect(d.sessions[0]?.br).toEqual([{ st: T + H, en: T + 2 * H }]);
    expect(sessionSecs(d.sessions[0] as Session, T + 5 * H)).toBe(3600);
  });

  it('times stay in order when the clock goes back', () => {
    const T = at(2026, 11, 19, 9, 0);
    const r = punch(go(initialPunch(), 'in', T), 'out', T - H);
    expect(r?.t).toBe(T);
    expect(r?.data.sessions[0]?.en).toBe(T);
  });

  it('夜勤: one session across midnight, counted on the day of 出勤', () => {
    const st = at(2026, 11, 18, 22, 0);
    let d = go(initialPunch(), 'in', st);
    const night = at(2026, 11, 19, 2, 0);
    // On duty after midnight: the session time runs; today's (19th) total does not include it (出勤 was on the 18th).
    expect(punchView(d, night)).toMatchObject({ state: '勤務中', worked: '4:00:00', line: '出 11/18(水) 22:00', sum: '今日 0:00　今月 4:00' });
    d = go(d, 'out', at(2026, 11, 19, 6, 30));
    expect(d.sessions).toHaveLength(1);
    expect(span(d.sessions[0] as Session)).toBe('22:00–翌06:30');
    expect(totals(d, 1, at(2026, 11, 19, 12))).toEqual({ today: 0, month: 8.5 * 3600 });
    expect(totals(d, 1, at(2026, 11, 18, 23))).toEqual({ today: 8.5 * 3600, month: 8.5 * 3600 });
    expect(span(ses(1, 1, 'x', st, at(2026, 11, 21, 8, 0)))).toBe('22:00–11/21(土) 08:00');
  });

  it('月の境界: 月末の夜に出勤して翌月に退勤 → 出勤の月に入る', () => {
    const d = withSessions([
      ses(1, 1, '本業', at(2026, 11, 30, 22, 0), at(2026, 12, 1, 7, 0)),
      ses(2, 1, '本業', at(2026, 12, 1, 9, 0), at(2026, 12, 1, 12, 0)),
      ses(3, 1, '本業', at(2026, 10, 31, 23, 0), at(2026, 11, 1, 1, 0)),
    ]);
    expect(totals(d, 1, at(2026, 11, 30, 23, 0)).month).toBe((9 * 3600) * 1);
    expect(totals(d, 1, at(2026, 12, 1, 13, 0))).toEqual({ today: 3 * 3600, month: 3 * 3600 });
    expect(totals(d, 1, at(2026, 11, 15)).month).toBe(9 * 3600);
    expect(totals(d, 1, at(2026, 10, 31, 23, 30)).month).toBe(2 * 3600);
  });

  it('今日の合計: sessions of the selected type whose 出勤 is today, the running one included', () => {
    const T = at(2026, 11, 19, 15, 0);
    const d = withSessions([
      ses(1, 1, '本業', at(2026, 11, 19, 9), at(2026, 11, 19, 12)),
      ses(2, 2, '副業', at(2026, 11, 19, 12), at(2026, 11, 19, 13)),
      ses(3, 1, '本業', at(2026, 11, 18, 9), at(2026, 11, 18, 10)),
      ses(4, 1, '本業', at(2026, 11, 19, 14), null),
    ]);
    expect(totals(d, 1, T)).toEqual({ today: 4 * 3600, month: 5 * 3600 });
    expect(totals(d, 2, T)).toEqual({ today: 3600, month: 3600 });
  });

  it('day and month boundaries follow local time, also across DST (America/New_York)', () => {
    setTZ('America/New_York');
    // 2026-03-08 is 23 hours long, 2026-11-01 is 25 hours long.
    const [a0, a1] = dayRange(at(2026, 3, 8, 12));
    expect(a1 - a0).toBe(23 * H);
    expect(new Date(a1).getHours()).toBe(0);
    const [b0, b1] = dayRange(at(2026, 11, 1, 12));
    expect(b1 - b0).toBe(25 * H);
    const [m0, m1] = monthRange(at(2026, 3, 20));
    expect([new Date(m0).getDate(), new Date(m1).getMonth(), new Date(m1).getHours()]).toEqual([1, 3, 0]);
    // A session over the fall-back night lasts 9 real hours (wall clock 22:00–06:00).
    const s = ses(1, 1, '本業', at(2026, 10, 31, 22), at(2026, 11, 1, 6));
    expect(sessionSecs(s, 0)).toBe(9 * 3600);
    const d = withSessions([s, ses(2, 1, '本業', at(2026, 11, 1, 23, 30), at(2026, 11, 2, 0, 30))]);
    expect(totals(d, 1, at(2026, 11, 1, 23, 45))).toEqual({ today: 3600, month: 3600 });
    expect(totals(d, 1, at(2026, 10, 31, 23)).month).toBe(9 * 3600);
  });

  it('休憩 is limited to 20 per session', () => {
    const T = at(2026, 11, 19, 9);
    let d = go(initialPunch(), 'in', T);
    for (let i = 0; i < BREAK_MAX; i++) d = go(go(d, 'break', T + i * 2 * M + M), 'resume', T + i * 2 * M + 2 * M);
    expect(breakOp(d)).toBeNull();
    expect(punchView(d, T + H).off).toBe(true);
    expect(punch(d, 'break', T + H)).toBeNull();
    expect(mainOp(d)).toBe('out');
  });

  it('keeps the newest 400 sessions', () => {
    const many = Array.from({ length: SESSION_MAX }, (_v, i) => ses(i + 1, 1, '本業', i * H, i * H + M));
    const d = go(withSessions(many), 'in', SESSION_MAX * H);
    expect(d.sessions).toHaveLength(SESSION_MAX);
    expect(d.sessions[0]?.id).toBe(2);
    expect(openSession(d)?.st).toBe(SESSION_MAX * H);
  });

  it('段階表示 by size', () => {
    expect(punchTier({ w: 1, h: 1 })).toEqual({ chips: false, break: false, lines: false, list: '' });
    expect(punchTier({ w: 2, h: 1 })).toEqual({ chips: false, break: true, lines: false, list: '' });
    expect(punchTier({ w: 2, h: 2 })).toEqual({ chips: true, break: true, lines: true, list: '' });
    expect(punchTier({ w: 2, h: 3 }).list).toBe('below');
    expect(punchTier({ w: 3, h: 2 }).list).toBe('side');
    expect(punchTier({ w: 4, h: 3 }).list).toBe('side');
  });

  it('recent sessions: newest first, all types, a deleted type keeps its name', () => {
    const d = withSessions([
      ses(1, 9, '前の仕事', at(2026, 11, 18, 22), at(2026, 11, 19, 6)),
      ses(2, 1, '本業', at(2026, 11, 19, 9), null),
    ]);
    expect(recentRows(d, at(2026, 11, 19, 10))).toEqual([
      { id: 2, day: '11/19(木)', n: '本業', span: '09:00–', len: '1:00', open: true },
      { id: 1, day: '11/18(水)', n: '前の仕事', span: '22:00–翌06:00', len: '8:00', open: false },
    ]);
  });
});

describe('punch: 業務の種類', () => {
  it('種類の初期値は 本業・副業, 既定は前回選んだ種類', () => {
    expect(initialPunch()).toEqual({ types: [{ id: 1, n: '本業' }, { id: 2, n: '副業' }], last: 1, sessions: [] });
    const T = at(2026, 11, 19, 9);
    const d = selectType(initialPunch(), 2);
    expect(d.last).toBe(2);
    expect(curType(d)).toEqual({ id: 2, n: '副業' });
    // 退勤 does not change the choice: the next 出勤 uses 副業 again.
    const back = go(go(go(d, 'in', T), 'out', T + H), 'in', T + 2 * H);
    expect(back.sessions.map(s => s.n)).toEqual(['副業', '副業']);
    expect(punchView(back, T + 3 * H).sum).toBe('今日 2:00　今月 2:00');
    expect(selectType(d, 99)).toBe(d);
  });

  it('switching the chip while on duty changes the open session’s type', () => {
    const T = at(2026, 11, 19, 9);
    const d = selectType(go(initialPunch(), 'in', T), 2);
    expect(openSession(d)).toMatchObject({ ty: 2, n: '副業' });
    expect(d.last).toBe(2);
  });

  it('adds 「種類N」 and selects it; up to 8; not while on duty', () => {
    const a = addType(initialPunch());
    expect(a?.types.at(-1)).toEqual({ id: 3, n: '種類3' });
    expect(a?.last).toBe(3);
    let d: PunchData = initialPunch();
    for (let i = 2; i < TYPE_MAX; i++) d = addType(d) ?? d;
    expect(d.types).toHaveLength(TYPE_MAX);
    expect(addType(d)).toBeNull();
    expect(addType(go(initialPunch(), 'in', 1000))).toBeNull();
    // A type ID is never reused: a deleted type's sessions do not join a new one.
    const gone = removeType(withSessions([ses(1, 2, '副業', 0, 10)]), 2) as PunchData;
    expect(addType(gone)?.types.at(-1)?.id).toBe(3);
  });

  it('rename: trimmed, at most 16 characters, its sessions follow; empty is refused', () => {
    const d = withSessions([ses(1, 2, '副業', 0, 10), ses(2, 1, '本業', 20, 30)]);
    const r = renameType(d, 2, '  ライター業務  ');
    expect(r?.types[1]).toEqual({ id: 2, n: 'ライター業務' });
    expect(r?.sessions.map(s => s.n)).toEqual(['ライター業務', '本業']);
    expect(renameType(d, 2, 'あ'.repeat(30))?.types[1]?.n).toHaveLength(16);
    expect(renameType(d, 2, '   ')).toBeNull();
    expect(renameType(d, 7, 'x')).toBeNull();
  });

  it('remove: sessions keep the type name; not the last type, not the open session’s type; 元に戻す puts it back', () => {
    const d = withSessions([ses(1, 2, '副業', 0, 10)], { last: 2 });
    const r = removeType(d, 2) as PunchData;
    expect(r.types).toEqual([{ id: 1, n: '本業' }]);
    expect(r.last).toBe(1);
    expect(r.sessions).toEqual(d.sessions);
    expect(canRemoveType(r, 1)).toBe(false);
    expect(removeType(r, 1)).toBeNull();
    const onDuty = go(selectType(initialPunch(), 2), 'in', 1000);
    expect(canRemoveType(onDuty, 2)).toBe(false);
    expect(canRemoveType(onDuty, 1)).toBe(true);
    // Undo: back at its place and selected again; an edit made since (rename of 本業) stays.
    const later = renameType(r, 1, '会社') as PunchData;
    expect(restoreType(later, { id: 2, n: '副業' }, 1, true)).toEqual({ ...later, types: [{ id: 1, n: '会社' }, { id: 2, n: '副業' }], last: 2 });
    expect(restoreType(d, { id: 2, n: '副業' }, 1, true)).toBe(d);
  });
});

describe('punch: タイムログへの記録と元に戻す', () => {
  const T = at(2026, 11, 19, 10, 24);

  it('出勤 writes 「出勤（本業）」 to the time log (setting on), and not when off', () => {
    const t: PunchTargets = { punch: initialPunch(), logs: initialLogs(T) };
    const r = stampPunch(t, 'in', T, true);
    expect(r?.next.punch.sessions).toEqual([ses(T, 1, '本業', T, null)]);
    expect(r?.next.logs?.logs.at(-1)).toMatchObject({ t: T, x: '出勤（本業）' });
    expect(r?.receipt.text).toBe('出勤（本業）');
    expect(stampPunch(t, 'in', T, false)?.next.logs).toBe(t.logs);
    expect(stampPunch({ punch: initialPunch(), logs: null }, 'in', T, true)?.next.logs).toBeNull();
    expect(stampPunch(t, 'out', T, true)).toBeNull();
    expect(punchText('resume', '副業')).toBe('休憩終了（副業）');
    // 退勤 uses the open session's type name.
    const on = r?.next as PunchTargets;
    const out = stampPunch({ ...on, punch: selectType(on.punch, 2) }, 'out', T + H, true);
    expect(out?.next.logs?.logs.at(-1)?.x).toBe('退勤（副業）');
  });

  it('元に戻す (出勤) takes back only that session and its log row; later edits stay; a log row pushed out comes back', () => {
    const full: LogItem[] = Array.from({ length: LOG_MAX }, (_v, i) => ({ id: i + 1, t: T - (LOG_MAX - i) * 1000, x: 'r' + String(i + 1) }));
    const t0: PunchTargets = { punch: initialPunch(), logs: { logs: full } };
    const r = stampPunch(t0, 'in', T, true);
    if (!r) throw new Error('no punch');
    expect(r.receipt.dropped.map(x => x.id)).toEqual([1]);
    // Another edit afterwards: a log row typed in the time log, and a rename of the type.
    const logs = [...(r.next.logs?.logs ?? []).slice(1), { id: T + 5000, t: T + 5000, x: '会議' }];
    const later: PunchTargets = { punch: renameType(r.next.punch, 2, '副業A') as PunchData, logs: { logs } };
    const back = undoPunch(later, r.receipt);
    expect(back.punch.sessions).toEqual([]);
    expect(back.punch.types[1]?.n).toBe('副業A');
    expect(back.logs?.logs.some(x => x.x.startsWith('出勤'))).toBe(false);
    expect(back.logs?.logs.some(x => x.x === '会議')).toBe(true);
    expect(undoPunch(r.next, r.receipt)).toEqual(t0);
  });

  it('元に戻す (退勤・休憩・再開) changes back only that punch', () => {
    const p0 = go(initialPunch(), 'in', T);
    const out = stampPunch({ punch: go(p0, 'break', T + H), logs: null }, 'out', T + 2 * H, false);
    if (!out) throw new Error('no punch');
    const reopened = undoPunch(out.next, out.receipt).punch;
    expect(openSession(reopened)?.br).toEqual([{ st: T + H, en: null }]);
    expect(punchView(reopened, T + 3 * H).state).toBe('休憩中');
    // 退勤 then 出勤 again: undoing the 退勤 would make two sessions on duty, so nothing changes.
    const again = go(out.next.punch, 'in', T + 3 * H);
    expect(undoPunch({ punch: again, logs: null }, out.receipt).punch).toBe(again);
    const br = stampPunch({ punch: p0, logs: null }, 'break', T + H, false);
    if (!br) throw new Error('no punch');
    expect(undoPunch(br.next, br.receipt).punch).toEqual(p0);
    const res = stampPunch(br.next, 'resume', T + 2 * H, false);
    if (!res) throw new Error('no punch');
    expect(undoPunch(res.next, res.receipt).punch).toEqual(br.next.punch);
    expect(unpunch(p0, 'in', 999, T, false)).toBe(p0);
  });

  it('元に戻す (出勤) puts back a session the 400 limit pushed out', () => {
    const many = Array.from({ length: SESSION_MAX }, (_v, i) => ses(i + 1, 1, '本業', i * H, i * H + M));
    const t0: PunchTargets = { punch: withSessions(many), logs: null };
    const r = stampPunch(t0, 'in', SESSION_MAX * H, false);
    if (!r) throw new Error('no punch');
    expect(r.receipt.droppedSessions.map(s => s.id)).toEqual([1]);
    expect(undoPunch(r.next, r.receipt)).toEqual(t0);
  });
});

describe('punch: 記録 v2', () => {
  const T = at(2026, 11, 19, 10);

  it('version 2; initial; the round trip keeps the record', () => {
    expect(punchData.version).toBe(2);
    const d = withSessions([ses(1, 1, '本業', T, T + H, [{ st: T + M, en: T + 2 * M }]), ses(2, 2, '副業', T + 2 * H, null)], { last: 2 });
    const saved = JSON.parse(JSON.stringify(punchData.toSaved?.(d, () => undefined))) as unknown;
    expect(punchData.sanitize(saved, T)).toEqual(d);
    expect(punchData.initial(T)).toEqual(initialPunch());
  });

  it('sanitize: unknown fields, broken rows and duplicates are dropped; missing parts get defaults', () => {
    const raw = {
      types: [{ id: 1, n: ' 本業 ', color: 'red' }, { id: 1, n: '重複' }, { id: 0, n: 'x' }, { id: 2.5, n: 'x' }, { id: 3, n: '   ' }, { id: 4, n: '副業' }],
      last: 9,
      sessions: [
        { id: 5, ty: 1, n: '本業', st: T, en: T + H, br: [{ st: T + M, en: T + 2 * M, x: 1 }], editing: true },
        { id: 5, ty: 1, n: '重複', st: T, en: T + H, br: [] },
        { id: 6, ty: 1, n: '本業', st: T, en: T - 1, br: [] },
        { id: 7, ty: 'a', n: '本業', st: T, en: null, br: [] },
        { id: 8, ty: 9, n: '', st: T, en: T + 1, br: [] },
        { id: 9, ty: 4, st: T - H, en: T - 1 },
      ],
      running: true,
    };
    expect(sanitizePunch(raw)).toEqual({
      types: [{ id: 1, n: '本業' }, { id: 4, n: '副業' }],
      last: 1,
      sessions: [ses(9, 4, '副業', T - H, T - 1), ses(5, 1, '本業', T, T + H, [{ st: T + M, en: T + 2 * M }])],
    });
    expect(sanitizePunch({})).toEqual(initialPunch());
    expect(sanitizePunch({ types: [] })).toEqual(initialPunch());
    expect(sanitizePunch({ types: 'x' })).toBeNull();
    expect(sanitizePunch({ sessions: {} })).toBeNull();
    expect(sanitizePunch([])).toBeNull();
    expect(sanitizePunch(null)).toBeNull();
  });

  it('sanitize: breaks inside the session and in order; only one session on duty (the latest)', () => {
    const s = sanitizePunch({
      sessions: [
        { id: 1, ty: 1, n: '本業', st: T, en: T + 5 * H, br: [{ st: T - M, en: T }, { st: T + H, en: T + 2 * H }, { st: T + 90 * M, en: T + 3 * H }, { st: T + 4 * H, en: null }, { st: T + 6 * H, en: null }] },
        { id: 2, ty: 1, n: '本業', st: T + 6 * H, en: null, br: [{ st: T + 7 * H, en: null }, { st: T + 8 * H, en: null }] },
        { id: 3, ty: 1, n: '本業', st: T + 9 * H, en: null, br: [] },
      ],
    });
    expect(s?.sessions).toEqual([
      ses(1, 1, '本業', T, T + 5 * H, [{ st: T + H, en: T + 2 * H }, { st: T + 4 * H, en: T + 5 * H }]),
      ses(3, 1, '本業', T + 9 * H, null),
    ]);
    const many = Array.from({ length: SESSION_MAX + 5 }, (_v, i) => ses(i + 1, 1, '本業', i * H, i * H + M));
    expect(sanitizePunch({ sessions: many })?.sessions[0]?.id).toBe(6);
    const longName = sanitizePunch({ types: [{ id: 1, n: 'あ'.repeat(40) }] });
    expect(longName?.types[0]?.n).toHaveLength(16);
  });

  it('v1 → v2: 出勤と退勤の組をセッションに（種類は既定の1つ目）', () => {
    const st = (id: number, k: string, t: number): { id: number; k: string; t: number } => ({ id, k, t });
    const v1 = { stamps: [
      st(1, 'resume', T - 30 * H), st(2, 'out', T - 29 * H), // cut by the v1 limit (200): before the first 出勤, dropped
      st(3, 'in', T - 26 * H), st(4, 'break', T - 23 * H), st(5, 'resume', T - 22 * H), st(6, 'out', T - 17 * H),
      st(7, 'in', T - 3 * H), st(8, 'break', T - H),
    ] };
    const raw = punchData.migrate?.(v1, 1);
    const d = punchData.sanitize(raw, T);
    expect(d).toEqual({
      types: [{ id: 1, n: '本業' }, { id: 2, n: '副業' }],
      last: 1,
      sessions: [
        ses(3, 1, '本業', T - 26 * H, T - 17 * H, [{ st: T - 23 * H, en: T - 22 * H }]),
        ses(7, 1, '本業', T - 3 * H, null, [{ st: T - H, en: null }]),
      ],
    });
    expect(punchView(d as PunchData, T).state).toBe('休憩中');
    // 退勤 during a break closes the break.
    expect(migrateV1({ stamps: [st(1, 'in', 0), st(2, 'break', 10), st(3, 'out', 20)] })?.sessions[0]?.br).toEqual([{ st: 10, en: 20 }]);
    expect(migrateV1({ stamps: [] })).toEqual(initialPunch());
    // Broken items are dropped as the v1 sanitize did.
    expect(migrateV1({ stamps: [st(1, 'in', 0), st(1, 'out', 5), st(2, 'lunch', 6), st(3, 'out', 10)], running: true })?.sessions).toEqual([ses(1, 1, '本業', 0, 10)]);
  });

  it('v1 → v2 fails (null: the section is kept) when the stamps cannot be paired', () => {
    const st = (id: number, k: string, t: number): { id: number; k: string; t: number } => ({ id, k, t });
    expect(punchData.migrate?.({ stamps: [st(1, 'in', 0), st(2, 'in', 10)] }, 1)).toBeNull();
    expect(migrateV1({ stamps: [st(1, 'in', 0), st(2, 'out', 10), st(3, 'break', 20)] })).toBeNull();
    expect(migrateV1({ stamps: [st(1, 'in', 0), st(2, 'resume', 10)] })).toBeNull();
    expect(migrateV1({ stamps: [st(1, 'in', 0), st(2, 'break', 10), st(3, 'break', 20)] })).toBeNull();
    expect(migrateV1({ stamps: [st(1, 'in', 10), st(2, 'out', 5)] })).toBeNull();
    expect(migrateV1({ stamps: {} })).toBeNull();
    expect(migrateV1('x')).toBeNull();
    expect(punchData.migrate?.({ stamps: [] }, 3)).toBeNull();
  });
});
