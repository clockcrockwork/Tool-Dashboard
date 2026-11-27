/**
 * 今日は何の日の一時状態（保存しない）: 取った内容（表示中だけ取得・更新。`../rss/source.ts`）.
 * 取るものは日付（`todayKey`）で、表示中に日付が変わったら取り直す。届くまでは前の日の日付と内容を組で出す（古い内容）。
 * 登録の `states` は古い内容（`old`）だけなので、読み込み中・失敗などの覆いは出ない。
 */
import { REGISTRY } from '../../app/registry/registry';
import { externalSource } from '../rss/source';
import { sampleDay, sampleToday } from './adapter';

const every = REGISTRY.today?.refresh?.every;
/** Freshness from the registry `refresh` (null until P4). A new day is fetched anyway (the key changes). */
export const TODAY_REFRESH_MS: number | null = typeof every === 'number' ? every * 1000 : null;

export const todaySource = externalSource<string | null>({ initial: sampleDay, adapter: () => sampleToday(), refreshMs: TODAY_REFRESH_MS });
