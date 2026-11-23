---
name: lgd-vrt
description: リキッドグラス・ダッシュボードの再現度テスト（プロトタイプと本実装のスクリーンショット比較）を回す手順。基準画像の生成、比較、レポートの読み方、合格ライン（SSIM ≥ 0.95 かつ差分画素率 ≤ 5%）。見た目を変える変更の前後に使う。
---

# 再現度テストを回す

詳しい仕組みは `docs/lgd/vrt.md`。

1. **基準画像**（プロトタイプから。シナリオを足した時・プロトタイプを取り込み直した時だけ）
   - プロトタイプのランタイム（`support.js`）はリポジトリに含めない。ローカルにあるパスを `PROTOTYPE_RUNTIME` に入れる。
   - `npm run vrt:baseline`（`-- --only <scenario>` で絞り込み）。出力は `vrt/baselines/<scenario>__<desktop|mobile>__<light|dark>.png`（コミットする）。
2. **比較**: `npm run vrt`。本実装の dev サーバーを起動して同じシナリオを撮り、`vrt/actual/`・`vrt/diff/`・`vrt/report/index.html`・`vrt/report/summary.json` を出す。未達があれば終了コード 1。
3. **読む**: `vrt/report/index.html` で基準・実装・差分を並べて見る。差分の赤い所が原因の場所。
4. **判定**: 判定層（`lgd-vrt-judge`）が合否と原因を `docs/lgd/vrt-results.md` に書く。
5. **直す → 2 に戻る**。合格するまで繰り返す。

時刻は 2026-11-19 10:24:36（Asia/Tokyo）固定。`design/claude-design/gallery/` の12枚は古い版なので参考値（合否に使わない）。
