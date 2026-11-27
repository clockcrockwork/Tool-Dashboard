/** ハビットの操作（部品とテストで同じもの）. */
import type { Dashboard } from '../../app/store/store';
import { notify, type NotifySent } from '../../app/runtime/notify';
import type { HabitData } from './data';
import { achievedKey, achievedText, toggleHabit } from './habit';

/**
 * 項目を押す: 達成のオン・オフを切り替え、オンになったら「達成を通知」（共通の通知。設定のオフ・人前では隠すの伏せ方・重複は
 * 共通の仕組みが受け持つ）。返り値は通知の結果（オフにしたときは null）。
 */
export function habitTap(d: Dashboard, id: string, itemId: number): NotifySent | null {
  const cur = d.dataOf<HabitData>(id);
  const r = toggleHabit(cur.items, itemId);
  d.setData<HabitData>(id, { ...cur, items: r.items });
  return r.done ? notify(d, id, { key: achievedKey(id, r.done, d.now()), text: achievedText(r.done), kind: 'ok' }) : null;
}
