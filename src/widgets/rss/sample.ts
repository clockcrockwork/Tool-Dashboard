/** 見本データ（プロトタイプ `renderVals()` の `feedSrc` と `ago`）. P4 で `adapter.ts` の実際の取得に差し替える. */
export const SAMPLE_FEEDS: readonly Readonly<{ name: string; items: readonly string[] }>[] = [
  { name: 'Dev', items: ['View Transitions 実践メモ', 'CSS anchor positioning 入門', 'Node.js キュー設計の基本', 'SQLite をエッジで使う'] },
  { name: 'Design', items: ['ガラス表現と可読性', '余白のリズムを整える', 'ダークモードの配色設計', 'モーションは控えめに'] },
  { name: 'Tools', items: ['ターミナル環境を見直す', 'ショートカット再入門', 'ノート術の比較', '自動化の小さな一歩'] },
];
/** 行の右の経過（見本は4行とも同じ並び）. */
export const SAMPLE_AGO: readonly string[] = ['2h', '5h', '昨日', '2日前'];
