/**
 * 打刻の記録 (区画 `w:punch` の data, prototype `punch`): 出勤・休憩・再開・退勤の時刻の列（古い順）.
 * プロトタイプは件数の上限を持たないが、記録が際限なく増えないよう新しい200件を残す（およそ50日分。勤務時間はプロトタイプと同じく
 * 残っている打刻の合計で出す）。行に ID を持たせ、1回の打刻をその行だけ「元に戻す」で消せるようにする.
 */
import type { WidgetDataDef } from '../../app/store/store';
import { isNum, isObj } from '../shared/guards';

export type PunchKind = 'in' | 'break' | 'resume' | 'out';
export type Stamp = { id: number; k: PunchKind; t: number };
export type PunchData = { stamps: Stamp[] };

export const PUNCH_MAX = 200;
const KINDS: readonly PunchKind[] = ['in', 'break', 'resume', 'out'];

function pickStamp(v: unknown): Stamp | null {
  if (!isObj(v) || !isNum(v.id) || !isNum(v.t) || v.t < 0 || !KINDS.includes(v.k as PunchKind)) return null;
  return { id: v.id, k: v.k as PunchKind, t: v.t };
}

export const punchData: WidgetDataDef<PunchData> = {
  version: 1,
  initial: () => ({ stamps: [] }),
  sanitize: raw => {
    if (!isObj(raw) || !Array.isArray(raw.stamps)) return null;
    const seen = new Set<number>();
    const stamps: Stamp[] = [];
    for (const v of raw.stamps as unknown[]) {
      const s = pickStamp(v);
      if (!s || seen.has(s.id)) continue;
      seen.add(s.id);
      stamps.push(s);
    }
    return { stamps: stamps.slice(-PUNCH_MAX) };
  },
};
