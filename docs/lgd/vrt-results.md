# 再現度テストの結果

合格ライン: 1画面ごとに SSIM ≥ 0.95 かつ 差分画素率 ≤ 5%（[開発フロー](./development-flow.md) 5章）。比較対象はプロトタイプ現行版から作った基準画像（`vrt/baselines/`）。本実装は `npm run build` の成果物を `vite preview` で配信して撮影（dev サーバーの HMR によるぶれを避けるため）。

## 2026-11-23 P0＋P1（土台・シート・重なる層・最初の7個）

結果: **48 / 48 合格**（12シナリオ × desktop・mobile × light・dark）。

| シナリオ | SSIM の最小 | 差分率の最大 | 判定 | メモ |
| --- | --- | --- | --- | --- |
| home-tour | 0.9999 | 0.00% | 合格 | |
| home | 0.9999 | 0.01% | 合格 | 開いた直後の検索欄のフォーカス枠を含む |
| menu | 0.9999 | 0.01% | 合格 | |
| settings | 0.9984 | 0.02% | 合格 | |
| index | 1.0000 | 0.00% | 合格 | |
| add | 0.9999 | 0.00% | 合格 | |
| edit | 0.9999 | 0.01% | 合格 | |
| widget-settings | 0.9999 | 0.01% | 合格 | |
| help | 0.9998 | 0.03% | 合格 | |
| dialog | 0.9785 | 0.81% | 合格 | 暗幕の下のペアリングコードと QR は乱数で作るため、プロトタイプと値が違う（仕組みは同じ） |
| toast | 0.9999 | 0.01% | 合格 | |
| fullscreen-clock | 0.9999 | 0.00% | 合格 | |

参考（合否に使わない）: `design/claude-design/gallery/` の古い版の12枚とプロトタイプ現行版の差は `vrt/baselines/gallery-reference.json`（SSIM 0.78〜0.99）。

## 2026-11-24 レビュー対応後（`64cf35e`）

結果: **48 / 48 合格**。最小は dialog desktop light（SSIM 0.9770・差分率 0.84%。乱数のペアリングコードと QR）。メモの初期本文を「# メモ」に変えたため（`deferred.md`）、メモが写る desktop の画面（home・home-tour・menu・settings・index・add・edit・widget-settings・help・toast）に SSIM 0.996〜0.998・差分率 0.05〜0.07% の差が出た。差はメモの1行目と提案の帯だけ（差分画像で確認）。mobile は 0.9998 以上。

## 2026-11-24 P2a 時間（ブランチ `feat/lgd-p2a-time`）

結果: **64 / 64 合格**（既存 48 ＋ P2a 16）。P2a の5シナリオ（`p2a-board`・`p2a-board-2`・`p2a-board-3`・`p2a-pomo-settings`・`p2a-punch-in`）はすべて SSIM 0.9999 以上・差分率 0.01% 以下。`p2a-punch-in` は本実装の打刻のトーストが「元に戻す」付き（10 秒）なので、待ちの上限を 15 秒にした（`vrt/scenarios.ts`）。
