/**
 * 打刻と、そのタイムログへの記録（設定「タイムログにも記録」）と、その「元に戻す」(review #3).
 * タイムログの行の文は「出勤（本業）」のように業務の種類を入れる. 元に戻すは全体の写しを戻さず、**その打刻で変えたところだけ**を
 * 戻す（出勤ならそのセッション、休憩ならその休憩…と、タイムログに足したその行）。上限で落ちた行・セッションは戻す。
 * 打刻のあとに行われたほかの編集（タイムログへの記入、種類の編集）は残す.
 */
import type { LogItem, TimelogData } from '../timelog/data';
import { addLog, nextLogId, undoAddLog } from '../timelog/timelog';
import { SESSION_MAX, type PunchData, type Session } from './data';
import { OP_LABEL, curType, nextSessionId, onBreak, openSession, punch, unpunch, type PunchOp } from './punch';

/** The records one punch touches. `logs` is null when there is no time log record to write to. */
export type PunchTargets = { punch: PunchData; logs: TimelogData | null };
export type PunchReceipt = {
  op: PunchOp; sid: number; t: number; closedBreak: boolean; text: string;
  logId: number | null; dropped: LogItem[]; droppedSessions: Session[];
};

/** 「出勤（本業）」. */
export function punchText(op: PunchOp, typeName: string): string {
  return OP_LABEL[op] + (typeName ? '（' + typeName + '）' : '');
}

export function stampPunch(t: PunchTargets, op: PunchOp, now: number, toLog: boolean): { next: PunchTargets; receipt: PunchReceipt } | null {
  const before = openSession(t.punch);
  const sid = before ? before.id : nextSessionId(t.punch, now);
  const r = punch(t.punch, op, now, sid);
  if (!r) return null;
  const s = r.data.sessions.find(x => x.id === sid);
  const text = punchText(op, s?.n ?? curType(t.punch)?.n ?? '');
  const droppedSessions = t.punch.sessions.filter(x => !r.data.sessions.some(y => y.id === x.id));
  let logs = t.logs;
  let logId: number | null = null;
  let dropped: LogItem[] = [];
  if (toLog && t.logs) {
    logId = nextLogId(t.logs.logs, r.t);
    const next = addLog(t.logs.logs, text, r.t, logId);
    if (next) {
      dropped = t.logs.logs.filter(x => !next.some(y => y.id === x.id));
      logs = { logs: next };
    } else logId = null;
  }
  return {
    next: { punch: r.data, logs },
    receipt: { op, sid, t: r.t, closedBreak: op === 'out' && onBreak(before), text, logId, dropped, droppedSessions },
  };
}

export function undoPunch(t: PunchTargets, r: PunchReceipt): PunchTargets {
  let p = unpunch(t.punch, r.op, r.sid, r.t, r.closedBreak);
  if (r.op === 'in' && r.droppedSessions.length) {
    const back = r.droppedSessions.filter(x => !p.sessions.some(y => y.id === x.id));
    p = { ...p, sessions: [...back, ...p.sessions].slice(-SESSION_MAX) };
  }
  const logs = t.logs && r.logId !== null ? { logs: undoAddLog(t.logs.logs, r.logId, r.dropped) } : t.logs;
  return { punch: p, logs };
}
