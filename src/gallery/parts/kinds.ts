/** 見本の描き方の印（見出しの横のタグ）。PatternSection と、ps-pt を使わない章（10〜12）で共通に使う。 */
export type PatternKind = 'vue' | 'mix' | 'markup' | 'todo';
export const KIND_LABEL: Record<PatternKind, string> = { vue: 'Vue 部品', mix: '一部 Vue 部品', markup: 'クラスだけ', todo: 'P1 で追加' };
export const KIND_CLS: Record<PatternKind, string> = { vue: 'fx', mix: 'fx', markup: 'ex', todo: 'nw' };
