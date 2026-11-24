/** メモの記録 (区画 `w:memo` の data): 本文と、行ごとの提案の結果（追加した／追加しない。行の文面で覚える）. */
import type { WidgetDataDef } from '../../app/store/store';
import { isObj, isStr } from '../shared/guards';

export type SugResult = 'add' | 'skip';
export type MemoData = { text: string; done: Record<string, SugResult> };

export const MEMO_INITIAL = '# メモ\n- [ ] 牛乳を買う\n明日 14:00 打ち合わせ\n週報は**金曜**まで';
export const MEMO_MAX = 100_000;
const DONE_MAX = 500;

export const memoData: WidgetDataDef<MemoData> = {
  version: 1,
  initial: () => ({ text: MEMO_INITIAL, done: {} }),
  sanitize: raw => {
    if (!isObj(raw) || !isStr(raw.text)) return null;
    const done: Record<string, SugResult> = {};
    if (isObj(raw.done)) {
      for (const [k, v] of Object.entries(raw.done).slice(-DONE_MAX)) if (v === 'add' || v === 'skip') done[k] = v;
    }
    return { text: raw.text.slice(0, MEMO_MAX), done };
  },
};
