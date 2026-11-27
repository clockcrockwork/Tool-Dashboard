/**
 * 名言 (quote) — 文字だけで伝える型（仕様書 3章: 左に大きな手がかり「「」、右に本文と補足）. プロトタイプのマークアップに書かれた
 * 1つの名言を出す（通信しない・記録を持たない・設定なし）。
 */
export type Quote = Readonly<{ text: string; by: string }>;
export const QUOTE: Quote = { text: '千里の道も一歩から', by: '老子' };
