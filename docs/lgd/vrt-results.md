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

## 2026-11-27 P2a 継続（実行の寿命・共通の通知・打刻の作り直し。ブランチ `feat/lgd-p2a-time`）

本実装はコード `70c198e`（`61042e7` まで `src/` は README だけの変更）を `npm run build` → `vite preview`（127.0.0.1:4198）で撮影。Chromium は `chromium_headless_shell` 157.0.8103.78（基準画像と同じ）。

結果: **64 / 64 合格**（17 シナリオ）。

**打刻を覆い隠して比べる**: 打刻は利用者の決定で作り直し（`p2a-followup.md` 4章）、プロトタイプと比べられないので、`p2a-board`・`p2a-board-2`・`p2a-punch-in` で打刻（`.w[data-w="punch"]`）を両対象とも覆った（`vrt/scenarios.ts` の `mask`、仕組みは `vrt.md`「覆い隠す範囲」）。基準画像はプロトタイプから覆って撮り直した（p2a-board desktop ×2、p2a-board-2 mobile ×2、p2a-punch-in ×4 の8枚。p2a-board mobile は打刻が画面の外なのでバイト単位で同じ）。撮り直した8枚は、前の基準画像と比べて変わった画素がすべて覆った範囲の中（範囲の外は0画素）。打刻の新しい見た目は Storybook の `PunchWidget` と e2e `e2e/punch.spec.ts` で確かめる（再現度の合否には入らない）。

| シナリオ | SSIM の最小 | 差分率の最大 | 判定 | メモ |
| --- | --- | --- | --- | --- |
| 共通 12 シナリオ（48 枚） | 0.9770（dialog desktop light） | 0.84%（同） | 合格 | 前回（11-24）と同じ値。help mobile は 0.9998・0.03% |
| p2a-board | 1.0000 | 0.00% | 合格 | 打刻を覆う |
| p2a-board-2 | 1.0000 | 0.00% | 合格 | 打刻を覆う（覆う前の同日の実行では SSIM 0.858 で不合格。p2a-punch-in mobile も 0.858） |
| p2a-board-3 | 1.0000 | 0.00% | 合格 | |
| p2a-pomo-settings | 0.9826（desktop light） | 0.36%（同） | 合格 | 差はシートの末尾に増えた共通の通知の一文「ダッシュボードを開いている間だけ知らせます」（`p2a-followup.md` 3章、実装ガイド 7.2）。mobile は 0.9999 |
| p2a-punch-in | 0.9979（desktop dark） | 0.01% | 合格 | 打刻を覆う。desktop に残る差はタイムログの末尾の行の「（本業）」だけ（下） |

- **p2a-punch-in desktop のタイムログの行**: 本実装は「10:24 出勤（本業）」（行の文に業務の種類を入れる決定、4章の4）、プロトタイプは「10:24 出勤」。差分画像の赤い画素 light 151・dark 165 のうち 133・143 がこの行の「（本業）」にあり、残り 18・22 はガラスのぼかしの丸めの散らばった1〜2画素の点（ほかの画面と同じぶれ）。合格ライン内なので覆わずに比べ、利用者の決定による既知の差として扱う。
- **help mobile の不合格（SSIM 0.93）の切り分け — 結論: 環境（撮影に使った Chromium の版）。コードの変更ではない。基準画像は撮り直さない。**
  - PR #22（`.worktrees/lgd` の `c59b9ba`）と p2a（`70c198e`）をそれぞれ `vite build` して別々に `vite preview` し、同じハーネス・同じ Chromium で `help` を撮った。

    | 撮った Chromium | c59b9ba | 70c198e | c59b9ba と 70c198e の画像どうし |
    | --- | --- | --- | --- |
    | `chromium_headless_shell` 157.0.8103.78（基準と同じ） | mobile 0.9998・0.02〜0.03%、合格 | 同じ値、合格 | SSIM 1.0000・0.00%（4枚とも） |
    | Chrome for Testing 153.0.8010.12（`/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`） | mobile 0.9295 / 0.9299、**不合格** | 同じ値、**不合格** | SSIM 1.0000・0.00%（3枚はバイト単位で同じ） |

  - 同じコードを 157 と 153 で撮った画像どうしは mobile SSIM 0.930・差分率 2.3〜2.4%（desktop 0.985・1.1%）。差分画像では差が `kbd`（`ui-monospace, SFMono-Regular, Menlo, monospace`）の `Esc`・`Ctrl`・`⌘`・`/`・`E` のキーの枠と、`⌘` の枠の幅で折り返しがずれた2つ目のヒントより下の行に集まり、元の不合格の差分画像と同じ形。
  - 再現の条件: e2e 用の `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` を付けたまま `npm run vrt` を回すと、ハーネスがその Chromium（153）で撮っていた。p2a の前回の記録（11-24、64/64 合格）は 157 で撮った。
  - 対処（テスト実施層、`vrt/**`）: 再現度テストは `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` を読まない（使うときは `VRT_CHROMIUM_EXECUTABLE_PATH`）。基準画像と違う版で撮ると警告し、`summary.json` の `environment.browser` とレポートに版を記録する。今回の 64 枚は `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` を付けたシェルで回し、157 で撮られたことを確かめた。UI/UX 層の修正は不要。

**機能・データのゲート**（再現度とは別）: `npm run check` 通過（lint・型・単体 37 ファイル 368 件・契約 4 ファイル 29 件）。`npm run build` 通過。e2e（Chromium 153、desktop-chromium・mobile-chromium）61 件合格・5 件は既存の条件付きスキップ・失敗 0。うち打刻の e2e `e2e/punch.spec.ts` 6 件 × 2 = 12 件（(a) 種類の選択が再読み込みで残る、(b) 種類の追加・名前・削除と元に戻すで元の位置、(c) v1 の移行で dv:2 に／組にできない v1 はロックして保存 bytes を変えない、(d) 夜勤は出勤した日・月に入る、月末の夜勤は翌月に入らない）。WebKit（Playwright）・実機 Safari は未確認。

## 2026-11-27 P2b 予定と記録（ブランチ `feat/lgd-p2b-records`）

結果: **84 / 84 合格**（既存 64 ＋ P2b 20）。P2b の6シナリオ（`p2b-board`・`p2b-board-2`・`p2b-board-3`・`p2b-counter-delete`・`p2b-habit-settings`・`p2b-sketch-full`）はすべて SSIM 1.0000・差分率 0.00%。全体の最小は従来どおり dialog（乱数の QR）と、メモの初期本文の変更による desktop の差（`deferred.md`）。撮影の Chromium は 157（基準と同じ）。
