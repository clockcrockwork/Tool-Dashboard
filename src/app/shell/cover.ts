/**
 * 中身ごと置き換える知らせ (仕様書 3章「ウィジェット内の知らせ」「ウィジェット全体が使えない」: 印・見出し・説明・操作2つまで).
 * The frame (`WidgetFrame`) draws it in `.pmw .perm`, the same shape as the permission request (実装ガイド 4章「通信と許可の出し方」),
 * so tools never build their own. In 1×1 it is not shown; the content stays faded and a toast says it (`notices.ts`).
 */
import { IC } from '../parts/icons';

export type CoverAct = Readonly<{ label: string; fn: () => void }>;

export type WidgetCover = Readonly<{
  /** Path of the line icon. */
  icon: string;
  title: string;
  text: string;
  /** Primary action (`.chip.pri`) and an alternative (`.chip.ghost`). */
  ok?: CoverAct;
  alt?: CoverAct;
  /** Something is refused or failed (`.warnx`: the icon in --a2, toast as a warning). */
  warn?: boolean;
}>;

/** 未実装の種類 (review #9): placed or used without placing, it shows this instead of an empty face. */
export const PENDING_COVER: WidgetCover = {
  icon: IC.soon,
  title: '準備中です',
  text: 'このウィジェットは次の版で使えるようになります',
};
