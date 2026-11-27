/**
 * アラームの記録 (区画 `w:alarm` の data): アラーム1・2のオン・オフ (prototype `alarms`、実装ガイド 6章「操作部品の最後の状態」).
 * 時刻はウィジェットの設定（`a1`・`a2`、`tm`）にあり、ここには持たない。鳴った・鳴っていないの記録は持たない（保存しない）.
 */
import type { WidgetDataDef } from '../../app/store/store';
import { isBool, isObj } from '../shared/guards';

export type AlarmData = { on: [boolean, boolean] };

export const alarmData: WidgetDataDef<AlarmData> = {
  version: 1,
  initial: () => ({ on: [true, false] }),
  sanitize: raw => {
    if (!isObj(raw) || !Array.isArray(raw.on)) return null;
    const on = raw.on as unknown[];
    // A broken entry falls back to off (a switch that does nothing unexpected), not to the sample default.
    return { on: [isBool(on[0]) ? on[0] : false, isBool(on[1]) ? on[1] : false] };
  },
};
