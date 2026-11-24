/**
 * 表示中かどうか (仕様書 3章「段階表示」、実装ガイド 8章「見えていないときの処理」, review #7).
 * 更新・取得・ポーリングは、その配置が今見えているときだけ行う。未配置・表示中でない画面のウィジェットは基本の段も更新しない。
 *
 * 見えている = 次のどれか。
 *  - 前面表示（`ui.big`）で開いている。置かずに使う（一時利用、`ui.temp`）も前面表示で開く。
 *  - ボードに置かれていて（未配置でない）、その配置の画面（全画面ならその画面）が今の画面。
 * タブが隠れている間（`document.visibilityState`）の停止はここでは見ない（P3。使う側で `visibilitychange` を併せて見る）。
 * reactive な値だけから計算するので、`computed` / `watch` の中で呼べば画面の切り替えに追従する。
 */
import type { Dashboard } from './store';

export function isShown(d: Dashboard, placementId: string): boolean {
  const u = d.ui;
  const off = !!d.g.off[placementId];
  // Front display: a placed widget, or one used without placing (一時利用 sets both `temp` and `big`).
  if (u.big === placementId && (!off || u.temp === placementId)) return true;
  if (off) return false;
  const pos = d.layout.value.pos[placementId];
  return !!pos && pos.page === d.page;
}
