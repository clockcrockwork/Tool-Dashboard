import { describe, expect, it } from 'vitest';
import { PUNCH_MAX, punchData, type Stamp } from './data';
import { breakKind, mainKind, punchView, workedSecs } from './punch';
import { stampPunch, undoPunch, type PunchTargets } from './transfer';
import { LOG_MAX, initialLogs, type LogItem } from '../timelog/data';

const T = new Date(2026, 10, 19, 10, 24, 36).getTime();
const H = 3_600_000;
const st = (k: Stamp['k'], t: number, id = t): Stamp => ({ id, k, t });

describe('punch', () => {
  it('before the first stamp: 未出勤 0:00:00 打刻なし, main 出勤, break disabled', () => {
    expect(punchView([], T)).toEqual({ state: '未出勤', worked: '0:00:00', line: '打刻なし', mainLabel: '出勤', mainCls: 'on', off: true, breakLabel: '休憩' });
    expect(mainKind([])).toBe('in');
    expect(breakKind([])).toBeNull();
  });
  it('worked time from the stamps, breaks excluded, running while on duty', () => {
    const s = [st('in', T - 3 * H), st('break', T - 2 * H), st('resume', T - H)];
    expect(workedSecs(s, T)).toBe(2 * 3600);
    const v = punchView(s, T + 1500);
    expect(v.state).toBe('勤務中');
    expect(v.worked).toBe('2:00:01');
    expect(v.line).toBe('出 07:24　休 08:24　戻 09:24');
    expect(mainKind(s)).toBe('out');
    expect(breakKind(s)).toBe('break');
    expect(punchView([...s.slice(0, 2)], T).state).toBe('休憩中');
    expect(breakKind(s.slice(0, 2))).toBe('resume');
    expect(punchView([...s, st('out', T)], T + H).state).toBe('退勤済み');
    expect(punchView([...s, st('out', T)], T + H).worked).toBe('2:00:00');
  });
  it('出勤 also writes 「出勤」 to the time log (setting on), and not when off', () => {
    const t: PunchTargets = { punch: { stamps: [] }, logs: initialLogs(T) };
    const { next } = stampPunch(t, 'in', T, true);
    expect(next.punch.stamps).toEqual([{ id: T, k: 'in', t: T }]);
    expect(next.logs?.logs.at(-1)).toMatchObject({ t: T, x: '出勤' });
    expect(stampPunch(t, 'in', T, false).next.logs).toBe(t.logs);
    expect(stampPunch({ punch: { stamps: [] }, logs: null }, 'in', T, true).next.logs).toBeNull();
  });
  it('元に戻す takes back only that stamp and its log row; later edits stay; a log row pushed out comes back', () => {
    const full: LogItem[] = Array.from({ length: LOG_MAX }, (_v, i) => ({ id: i + 1, t: T - (LOG_MAX - i) * 1000, x: 'r' + String(i + 1) }));
    const t0: PunchTargets = { punch: { stamps: [] }, logs: { logs: full } };
    const { next, receipt } = stampPunch(t0, 'in', T, true);
    expect(receipt.dropped.map(x => x.id)).toEqual([1]);
    // Another edit afterwards: a log row typed in the time log and a break stamp.
    const later = stampPunch({ ...next, logs: { logs: [...(next.logs?.logs ?? []).slice(1), { id: T + 5000, t: T + 5000, x: '会議' }] } }, 'break', T + 6000, false).next;
    const back = undoPunch(later, receipt);
    expect(back.punch.stamps.map(x => x.k)).toEqual(['break']);
    expect(back.logs?.logs.some(x => x.x === '出勤')).toBe(false);
    expect(back.logs?.logs.some(x => x.x === '会議')).toBe(true);
    expect(undoPunch(next, receipt)).toEqual(t0);
  });
  it('record: kinds checked, duplicates and unknown fields dropped, newest 200 kept', () => {
    expect(punchData.sanitize({ stamps: [{ id: 1, k: 'in', t: T, x: 1 }, { id: 1, k: 'out', t: T }, { id: 2, k: 'lunch', t: T }], running: true }, T))
      .toEqual({ stamps: [{ id: 1, k: 'in', t: T }] });
    const many = Array.from({ length: PUNCH_MAX + 10 }, (_v, i) => st(i % 2 ? 'out' : 'in', T + i, i + 1));
    expect(punchData.sanitize({ stamps: many }, T)?.stamps).toHaveLength(PUNCH_MAX);
    expect(punchData.sanitize({ stamps: {} }, T)).toBeNull();
    expect(punchData.initial(T)).toEqual({ stamps: [] });
  });
});
