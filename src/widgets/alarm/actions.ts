/**
 * アラームの操作（部品とテストで同じものを使う）. スイッチのオン・オフは記録（`w:<配置ID>` の data）に保存し、
 * 見張りは runner.ts がその変化で立て直す。オンにしたとき、通知の許否がまだなら共通の許可のお願いを出す
 * （明示の操作に結びつける。断られても・閉じてもアラームはオンのまま鳴る）.
 */
import type { Dashboard } from '../../app/store/store';
import { askNotify } from '../../app/runtime/notify';
import { ALARM_ASK, alarmTimes } from './alarm';
import type { AlarmData } from './data';

export function switchAlarm(d: Dashboard, id: string, i: number): void {
  const cur = d.dataOf<AlarmData | undefined>(id)?.on ?? [false, false];
  const on: [boolean, boolean] = [!!cur[0], !!cur[1]];
  on[i] = !on[i];
  d.setData<AlarmData>(id, { on });
  d.toast((alarmTimes(k => d.cfgOf(id, k))[i] ?? '') + (on[i] ? ' オン' : ' オフ'), 'info');
  if (on[i]) askNotify(d, id, ALARM_ASK);
}
