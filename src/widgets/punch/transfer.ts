/**
 * 打刻と、そのタイムログへの記録（設定「タイムログにも記録」）と、その「元に戻す」(review #3).
 * 元に戻すは全体の写しを戻さず、**その打刻で足した行の ID だけ**を消す（打刻の行と、タイムログに足した行）。タイムログの上限で
 * 落ちた行は戻す。打刻のあとに行われたほかの編集（別の打刻・タイムログへの記入）は残す.
 */
import type { LogItem, TimelogData } from '../timelog/data';
import { addLog, nextLogId, undoAddLog } from '../timelog/timelog';
import type { PunchData, PunchKind, Stamp } from './data';
import { PUNCH_LABEL, addStamp, nextStampId } from './punch';

/** The records one stamp touches. `logs` is null when there is no time log record to write to. */
export type PunchTargets = { punch: PunchData; logs: TimelogData | null };
export type PunchReceipt = { id: number; logId: number | null; dropped: LogItem[]; droppedStamps: Stamp[] };

export function stampPunch(t: PunchTargets, k: PunchKind, now: number, toLog: boolean): { next: PunchTargets; receipt: PunchReceipt } {
  const id = nextStampId(t.punch.stamps, now);
  const stamps = addStamp(t.punch.stamps, k, now, id);
  const droppedStamps = t.punch.stamps.filter(x => !stamps.some(y => y.id === x.id));
  let logs = t.logs;
  let logId: number | null = null;
  let dropped: LogItem[] = [];
  if (toLog && t.logs) {
    logId = nextLogId(t.logs.logs, now);
    const next = addLog(t.logs.logs, PUNCH_LABEL[k], now, logId);
    if (next) {
      dropped = t.logs.logs.filter(x => !next.some(y => y.id === x.id));
      logs = { logs: next };
    } else logId = null;
  }
  return { next: { punch: { stamps }, logs }, receipt: { id, logId, dropped, droppedStamps } };
}

export function undoPunch(t: PunchTargets, r: PunchReceipt): PunchTargets {
  const rest = t.punch.stamps.filter(x => x.id !== r.id);
  const back = r.droppedStamps.filter(x => !rest.some(y => y.id === x.id));
  const punch = { stamps: [...back, ...rest] };
  const logs = t.logs && r.logId !== null ? { logs: undoAddLog(t.logs.logs, r.logId, r.dropped) } : t.logs;
  return { punch, logs };
}
