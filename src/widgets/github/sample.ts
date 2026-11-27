/** 見本データ（プロトタイプ Main.dc.html の GitHub PR の4行。マークアップに直接書かれている）. P4 で `adapter.ts` の取得に差し替える. */
import type { Pr } from './github';

export const SAMPLE_PRS: readonly Pr[] = [
  { n: 128, t: 'ページング修正', st: 'Open' },
  { n: 127, t: 'ダークモード対応', st: 'Review' },
  { n: 126, t: 'トースト通知追加', st: 'Draft' },
  { n: 124, t: '依存関係更新', st: 'Merged' },
];
