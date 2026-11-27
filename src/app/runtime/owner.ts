/**
 * 担当のタブ（実装ガイド 7.3「タブやウィンドウを何枚も開いたとき」）. 同時に1つだけ動けばよいもの（アラームの音と通知、
 * 受け渡しの受信と既読、AIモデルの読み込み、中継サーバーへの接続）は、P3 で Web Locks API を使って担当のタブを1枚に決め、
 * 閉じたら別のタブが引き継ぐ。
 *
 * ここはその取り決めだけ。P2 では今のタブが常に担当（`THIS_TAB`）。P3 で `navigator.locks.request('lgd:<task>', …)` を
 * 持ち続ける実装に差し替える（`owns` は同期で答え、担当が変わったら `onChange` で知らせる）。担当でないタブも判定と表示は
 * 続け、知らせ（音・通知）だけを出さない。
 */
export type OwnerLock = Readonly<{
  /** This tab is in charge of `task` (`'alarm'` …) now. */
  owns: (task: string) => boolean;
  /** Called when the tab in charge changes (P3). Returns the cleanup. */
  onChange: (fn: () => void) => () => void;
}>;

/** P2: a single tab is assumed (two tabs both ring; recorded in the P3 plan). */
export const THIS_TAB: OwnerLock = {
  owns: () => true,
  onChange: () => () => {},
};
