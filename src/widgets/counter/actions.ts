/** カウンターの操作のうち、トーストを伴うもの（部品とテストで同じもの）. */
import type { Dashboard } from '../../app/store/store';
import type { CounterData } from './data';
import { removeRow, removedText, undoRemove } from './counter';

/** 行を削除して「元に戻す」付きのトーストを出す。戻すのは消した行だけ（ほかの行の変更は残す）. */
export function counterRemove(d: Dashboard, id: string, itemId: number): void {
  const cur = d.dataOf<CounterData>(id);
  const r = removeRow(cur.items, itemId);
  const removed = r.removed;
  if (!removed) return;
  d.setData<CounterData>(id, { ...cur, items: r.items });
  d.toast(removedText(removed.row), 'info', {
    label: '元に戻す',
    fn: () => { const now = d.dataOf<CounterData>(id); d.setData<CounterData>(id, { ...now, items: undoRemove(now.items, removed) }); },
  });
}
