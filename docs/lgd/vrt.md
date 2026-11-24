# 再現度テスト（VRT）

Claude Design のプロトタイプ（正本 `design/claude-design/Main.dc.html`）と Vue の本実装を同じ状態で撮影し、画面ごとの「再現度」を数値で判定する。

## 合格ライン（ユーザー合意済み）

**1画面ごとに SSIM ≥ 0.95 かつ 差分画素率 ≤ 5%**

| 指標 | 計算方法 |
| --- | --- |
| SSIM | `ssim.js`（11px 窓、`weber` 実装、`downsample: 'original'` = 短辺 256px 相当に縮小してから計算する原典の方式） |
| 差分画素率 | `pixelmatch`（threshold 0.1、アンチエイリアスの画素は数えない `includeAA: false`）の差分画素数 ÷ 全画素数 |

- 2つとも満たして「合格」。画像の大きさが違うときは不合格。
- 撮影に失敗した画面・基準画像が無い画面も合格に数えない。1つでも合格でなければ `npm run vrt` は終了コード 1。
- ライトテーマの淡いガラス面は背景と色が近く、差分画素率だけでは差が出にくい（ウィジェットが1つしか無い画面でも 3% 程度）。SSIM の方が鋭く効くので、両方を見る。

## コマンド

```sh
# 基準画像（プロトタイプ）を作り直す。gallery との参考比較も更新する
npm run vrt:baseline
npm run vrt:baseline -- -s menu,settings -v mobile -t dark   # 絞り込み（このときは参考比較を省く）
npm run vrt:baseline -- --gallery-only                       # 参考比較だけ

# 本実装を撮って比べる（dev サーバーを 127.0.0.1:4174 で自動起動・終了）
npm run vrt
npm run vrt -- menu toast                     # シナリオ名は位置引数でも可
npm run vrt -- -v desktop -t light
npm run vrt -- --url http://127.0.0.1:4173/   # 起動済みのサーバー（vite preview など）を使う
npm run vrt -- --help
```

共通オプション: `-s/--scenario`（カンマ区切り・複数可）、`-v/--viewport desktop|mobile`、`-t/--theme light|dark`、`-j/--jobs`（並列数、既定 3）。

出力:

| 場所 | 中身 | git |
| --- | --- | --- |
| `vrt/baselines/<scenario>__<desktop\|mobile>__<light\|dark>.png` | 基準画像（プロトタイプ） | コミットする |
| `vrt/baselines/gallery-reference.json` | gallery との参考比較の数値 | コミットする |
| `vrt/actual/` | 本実装の画像 | 無視 |
| `vrt/diff/` | 差分画像（赤 = 違う画素、黄 = アンチエイリアス）。`diff/gallery/` は参考比較 | 無視 |
| `vrt/report/index.html` | 基準・実装・差分の3枚並び＋数値＋合否、参考比較の別表 | 無視 |
| `vrt/report/summary.json` | 同じ内容の JSON（CI やエージェントが読む用） | 無視 |
| `vrt/.cache/` | プロトタイプの一時配信フォルダ、gallery の png 版 | 無視 |

レポートは `vrt/report/index.html` をブラウザで開く（画像は `../baselines/` などを相対参照するので、`vrt/` ごと開くこと）。

## プロトタイプのランタイムの用意

`Main.dc.html` は同じフォルダの `support.js`（Claude Design の独自ランタイム）を読み込んで動く。ライセンス上 `support.js` はリポジトリに入れない。

- 環境変数 `PROTOTYPE_RUNTIME` に `support.js` のパスを指定する。未指定なら `vrt/lib/targets.ts` の `DEFAULT_RUNTIME`（作業環境のスクラッチパッド）を使う。
- `vrt:baseline` は `Main.dc.html`・`support.js`・`app-icon.svg` を `vrt/.cache/proto/` にコピーし、依存なしの静的サーバー（`vrt/lib/server.ts`）で配る。Google Fonts（Inter / Noto Sans JP）はネットワークから読むので、オンラインで実行する。
- 配信用コピーにだけ、本実装の `index.html` と同じ `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` を足している。プロトタイプには viewport メタが無く（Claude Design のプレビュー枠で表示する前提）、モバイルのエミュレーションで 980px 幅のレイアウトになってしまうため。`design/` のファイル自体は変更しない。
- ランタイムが無いと `vrt:baseline` だけが止まる。`npm run vrt`（比較）はコミット済みの基準画像を使うので、ランタイムが無くても動く。

## 撮影の条件（両対象で共通）

| 項目 | 値 |
| --- | --- |
| ブラウザ | Chromium（Playwright）。`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` があればそれ。Playwright 既定の版が入っていなければ `PLAYWRIGHT_BROWSERS_PATH`（既定 `/opt/pw-browsers`）の `chromium_headless_shell` などを探して使う（`playwright install` はしない） |
| desktop | 1440×900、deviceScaleFactor 1 |
| mobile | 390×844、deviceScaleFactor 1、`isMobile` + `hasTouch`、UA は Pixel 7（Android Chrome） |
| テーマ | Playwright の `colorScheme`（light / dark）で切り替え。アプリ側のテーマ設定は「自動」のまま |
| 時刻 | `2026-11-19T10:24:36+09:00` に固定（`page.clock.setFixedTime`）。タイムゾーン Asia/Tokyo、locale ja-JP |
| 乱数 | `Math.random` を決まった種の疑似乱数に差し替え（ペアリングコード・QR などを毎回同じにする） |
| 待ち合わせ | 下部バー `.nav .nbar` の表示 → `document.fonts.ready` → 手順 → シナリオの目印要素 → `document.fonts.ready` |
| 撮影 | `animations: 'disabled'`、`caret: 'hide'`。2回続けて同じ画像になるまで撮り直す（最大 6 回） |
| マウス | 撮影直前に desktop は左下隅 (0, 899) へ逃がす（hover・ツールチップの差を消す） |

時刻固定は `setFixedTime` を使う。`Date` / `Date.now()` だけが止まり、`setTimeout` / `setInterval` / `requestAnimationFrame` は実時間で動き続ける。そのため 0.7 秒の長押し判定やトーストの表示時間はそのまま働き、時計の秒（36）は進まない。`page.clock.install` + `pauseAt` だとタイマーまで止まり、描画の更新や長押しが進まなくなるので使わない。

## シナリオ

定義は `vrt/scenarios.ts`。基本は desktop / mobile × light / dark の4通り。共通の 12 シナリオ（48 枚）と P2a の 5 シナリオ（16 枚。うち `p2a-board-2`・`p2a-board-3` は mobile だけ）で、合わせて 17 シナリオ・64 枚。

| 名前 | 状態 | seed | 手順（共通セレクタ） | 撮影前の目印 |
| --- | --- | --- | --- | --- |
| `home-tour` | 初回起動、案内 1/5 | なし | なし | `.tcard.open[role="dialog"]` |
| `home` | 案内を見終えたホーム | `tourDone` | なし | — |
| `menu` | TODO のその他メニュー | `tourDone` | `.w[data-w="todo"]` を desktop は右クリック、mobile は 0.9 秒長押し | `.mnuw.open .mnu` |
| `settings` | 全体の設定 | `tourDone` | `.nav button[aria-label="全体の設定"]` | `.sheet.open[aria-label="全体の設定"]` |
| `index` | ウィジェット一覧 | `tourDone` | `.nav button[aria-label^="ウィジェット一覧"]` | `.sheet.open[aria-label="ウィジェット一覧"]` |
| `add` | ウィジェットを追加 | `tourDone` | 一覧 → シート内の「ウィジェットを追加」 | `.sheet.open[aria-label="ウィジェットを追加"]` |
| `edit` | 編集モード | `tourDone` | `.nav button[aria-label="ウィジェットを編集"]` | `.nav .ebar` |
| `widget-settings` | 編集中に TODO をタップ | `tourDone` | 編集 → `.w[data-w="todo"]` をクリック | `.sheet.open[aria-label="ウィジェットの設定"]` |
| `help` | 操作ヒント | `tourDone` | 全体の設定 → シート内の「操作ヒント」 | `.sheet.open[aria-label="操作ヒント"]` |
| `dialog` | 確認ダイアログ | `tourDone` | 全体の設定 → 「端末をつなぐ」→ 1台目（iPhone）の「解除」 | `.dlg.open[role="alertdialog"]` |
| `toast` | 元に戻す付きトースト | `tourDone` | `menu` の手順 → `[role="menuitem"]:has-text("ボードから外す")` | `.toasts .toast button` |
| `fullscreen-clock` | 時計の全画面ページ | `tourDone`, `pgW: {clock: true}` | 下部バーの点 `.nav .dot[aria-label="時計"]` | `.fsw[data-w="clock"]` |
| `p2a-board` | P2a（時間）の8種だけを置いたボード。mobile は1ページ目 | `P2A_BOARD` | なし | `.w[data-w="gantt"]` |
| `p2a-board-2` | 同じボードの2ページ目（**mobile のみ**）。ストップウォッチ・打刻 | `P2A_BOARD` | 下部バーの点 `.nav .dot[aria-label="ボード 1の2"]` → 1 秒待つ | `.w[data-w="stopwatch"]` |
| `p2a-board-3` | 同じボードの3ページ目（**mobile のみ**）。タイムログ | `P2A_BOARD` | 点 `.nav .dot[aria-label="ボード 1の3"]` → 1 秒待つ | `.w[data-w="timelog"]` |
| `p2a-pomo-settings` | 編集中にポモドーロをタップした「ウィジェットの設定」（集中する時間・完了を通知） | `P2A_BOARD` | 編集 → `.w[data-w="pomo"]` をクリック | `.sheet.open[aria-label="ウィジェットの設定"]` |
| `p2a-punch-in` | 打刻で出勤し、ストップウォッチを走らせた状態。タイムログの末尾に「10:24 出勤」が入る | `P2A_BOARD` | （mobile は点で2ページ目へ）→ `.w[data-w="punch"] button:has-text("出勤")` → `.w[data-w="stopwatch"] button[aria-label="スタート・ストップ"]` → トースト `.toasts .toast` が消える（detached）まで待つ | desktop `.w[data-w="timelog"]` / mobile `.w[data-w="punch"]` |

補足:

- `dialog`: プロトタイプの「初期状態に戻す」「ボードを削除」は確認ダイアログを出さずに「元に戻す」付きトーストで済ませる作りなので、本番にもある確認ダイアログとして「端末の接続解除」を使う（`削除の確認` ボタンは表示テスト用なので使わない）。
- `fullscreen-clock`: seed で全画面にした時計は最後のページになる。編集 → 時計 → 大きさ「全画面」→ 完了でも同じ状態になるが、手順が長いので seed を使う。
- P2a（分類「時間」）のシナリオは下の「P2a のシナリオ」を参照。
- 長押しは CDP の `Input.dispatchTouchEvent`（touchStart → 待つ → touchEnd）で行う。Playwright の `touchscreen` には押し続ける API が無いため。

### P2a のシナリオ（世界時計・アラーム・ポモドーロ・ストップウォッチ・カウントダウン・タイムログ・打刻・タイムスケジュール）

**seed `P2A_BOARD`**（`vrt/scenarios.ts`）: `tourDone: true`、`groups: [{id: 'g0'}]`、`order` は下の8種、`off: {}`、`place` は8種とも `g0`。

```
order = gantt, world, alarm, pomo, countdown, stopwatch, punch, timelog
```

- `order` と `off`（空でよい）を両方入れると、プロトタイプの `sane()`・本実装の `sanitizeGlobal()` とも **order に無い種類を「外す」にする**。8種だけが置かれ、ほかは外れる。
- `place` を明示するのは、世界時計・ストップウォッチ・カウントダウン（既定 `g2`）、タイムログ・打刻（既定 `g3`）の既定の置き場所が「ボード 1」以外だから。`groups` を入れないとプロトタイプは `place` を捨てる（`sane()`）ので、`groups` も入れる。
- 配置（並び順で上から詰める。両対象とも同じアルゴリズム）:

  | ビューポート | 格子 | 配置 |
  | --- | --- | --- |
  | desktop 1440×900 | 8列×5行 | 1行目 タイムスケジュール(4×1)・世界時計・アラーム / 2行目 ポモドーロ・カウントダウン・ストップウォッチ(2×2)・打刻(2×2) / 3〜5行目 タイムログ(2×3)。**1画面に8種すべて** |
  | mobile 390×844 | 2列×5行 | 1ページ目 タイムスケジュール(2×1 に縮む)・世界時計・アラーム・ポモドーロ・カウントダウン / 2ページ目 ストップウォッチ・打刻 / 3ページ目 タイムログ。下部バーに点が3つ（`ボード 1の1`〜`ボード 1の3`） |

- mobile は1画面に収まらないので、`p2a-board`（1ページ目）・`p2a-board-2`・`p2a-board-3` の3枚で8種を覆う。2・3ページ目は下部バーの点をタップしてスムーズスクロールさせ、1 秒待ってから撮る。desktop の2・3ページ目は無いので撮らない（`viewports: ['mobile']`）。
- タイムログの「入力補助の帯」（作業・会議・休憩・移動・完了）は設定「定型ボタンを表示」の既定がオンなので、どの P2a シナリオにも写る。

**時刻で変わるものを止める工夫**:

- 時刻は他と同じく `setFixedTime`（`Date.now()` だけ止まり、タイマーは実時間）。世界時計（東京 10:24 / ロンドン 01:24 / ニューヨーク 20:24）、タイムスケジュールの現在線、タイムログの見本の記録（07:24・08:49・09:59）と今日の位置、カウントダウン（年末まで 42 日）はこれで決まる。
- **ストップウォッチ**: 経過は `Date.now() - 開始時刻` で出すので、時刻固定のもとではスタートしても `00:00.0` のまま「走行中」（一時停止アイコン）の表示で止まる。100ms ごとの再描画があっても画素は変わらない。ラップは経過 0 だと記録されないので押さない。本実装も経過を `Date.now()`（`d.now()`）から出せば同じになる（`performance.now()` を使うと進んでしまう）。
- **ポモドーロ**: 残りは `setInterval` の1秒ごとに 1 ずつ減らす作り（時刻ではなく回数）なので、スタートすると撮影中に `24:59`、`24:58`… と進み、安定しない。そのためスタートした状態は撮らず、止まった `25:00` と設定シートだけを撮る。
- **打刻**: 出勤すると「出勤 10:24」のトースト（操作なし・3 秒）が出る。写り込みの有無が撮影のタイミングで変わらないよう、`waitFor` の `state: 'detached'` でトーストが消えるのを待ってから撮る（手順の時間制限 8 秒以内）。勤務時間は `0:00:00`、打刻の行は「出 10:24」のまま動かない。
- 2回続けて撮った基準画像の差（2026-11-24）: 16 枚中 10 枚がバイト単位で一致、残りも SSIM 0.9998 以上・差分画素率 0.012% 以下（ガラスのぼかしの丸め）。

**本実装との比較で気を付けること**:

- 本実装に P2a の8種が揃うまでは「準備中です」の札が出て不合格（`p2a-punch-in` は「出勤」ボタンが無いので撮影失敗）になるのが正しい。配置（格子の位置と大きさ）は seed の変換だけで既に一致している（2026-11-24 に確認）。
- 打刻の「出勤」はタイムログにも記録する（設定「タイムログにも記録」の既定オン）。`p2a-punch-in` の desktop はタイムログの末尾の「10:24 出勤」まで写るので、打刻とタイムログの連携が無いと差になる。
- アラーム・ポモドーロは通知の許可を使う種類だが、操作するまで許可の案内は出ない。

### seed（保存データ）

シナリオには対象に依存しない JSON を書き、localStorage への変換は `vrt/lib/targets.ts` の関数が行う。

| 対象 | キー | 変換 |
| --- | --- | --- |
| プロトタイプ | `lgdash.v1` | `protoStorage(seed)` |
| 本実装 | `lgd.v1:global` | `appStorage(seed)`。版 `v: 1` を足す。order / off / place / groups / tourDone / pgW は同じ名前・同じ意味（配置 ID = 種類 ID）なのでそのまま |

本実装の保存形式がプロトタイプと分かれてきたら（キーの分割、項目名の違いなど）、`appStorage` で変換する。ウィジェットごとの区画 `lgd.v1:w:<配置ID>` はまだ seed していない（どのシナリオも既定の記録・設定のまま）。seed はページの最初の読み込み時に一度だけ入る（`sessionStorage` の印で再読み込み時は入れない）。

## シナリオの足し方

1. `vrt/scenarios.ts` の `scenarios` に1件足す。

   ```ts
   {
     name: 'memo-big',                    // ファイル名になる（英小文字とハイフン）
     title: 'メモを大きく開いた状態',       // レポート用
     seed: { tourDone: true },            // なしなら null
     steps: [
       { do: 'click', sel: '.w[data-w="memo"] button[aria-label="大きく開く"]' },
       { do: 'waitFor', sel: '.w.big[data-w="memo"]' },
     ],
     ready: '.w.big[data-w="memo"]',      // 撮影直前に待つ要素
     // viewports: ['desktop'],            // 片方だけにするとき（skipNote に理由を書く）
   },
   ```

   手順の種類は `vrt/lib/types.ts` の `Step`: `click`（mobile はタップ）/ `menu`（desktop 右クリック・mobile 長押し）/ `rightClick` / `longPress` / `press` / `waitFor` / `wait` / `scrollIntoView` / `mouseAway`。`steps` を関数にするとビューポートで手順を変えられる。

2. セレクタは **プロトタイプと本実装で共通のもの**（クラス名・aria-label・ボタンの文言）だけを使う。よく使うものは `SEL` にまとめてある。
3. プロトタイプで手順が通ることを確かめて基準画像を作る: `npm run vrt:baseline -- -s memo-big`
4. 画像を目で確かめてから `vrt/baselines/` をコミットする。

## 判定方法

1. `npm run vrt` が本実装を撮り（`vrt/actual/`）、同名の基準画像と比べる。
2. 画面ごとに SSIM と差分画素率を出し、合格ラインで「合格 / 不合格」を付ける。撮れなかった画面は「撮影失敗」（dev サーバーが起動しない、手順のセレクタが見つからない等。理由はレポートと標準出力に出る）、基準画像が無ければ「基準なし」。
3. レポートの差分画像で、どこが違うかを見る。赤が違う画素。
4. ハーネス自体のぶれ: 同じプロトタイプを2回撮ると、48 枚中 30 枚以上がバイト単位で一致し、残りも差分画素率 0.02% 以下・SSIM 0.9998 以上（ガラスの `backdrop-filter` のぼかしの丸め）。合格ラインに比べて十分小さい。

## gallery との参考比較

`design/claude-design/gallery/*.webp`（12 枚）は少し古い版のスクリーンショット。`vrt:baseline` が Chromium で png に直し（`vrt/.cache/gallery/`）、プロトタイプ現行版の対応する状態と比べて `vrt/baselines/gallery-reference.json` に記録する。**合否判定には使わない**（古い版との差を記録するだけ）。

| gallery | 対応させた状態 |
| --- | --- |
| `d_main_*` / `m_main_*` | `home` |
| `d_menu_*` | `menu`（desktop の右クリック） |
| `d_sheet_*` / `m_sheet_*` | `settings` |
| `m_menu_*` | `menu`（mobile の長押し）で代用。gallery は下から出る「場所」の選択メニュー（東京・大阪…）で、現行版でこれを持つ「日の出・日の入り」は初期ボードに無いため |

記録した数値（2026-11-23）:

| gallery | SSIM | 差分率 |
| --- | --- | --- |
| d_main_l / d_main_d | 0.9520 / 0.9545 | 0.74% / 0.81% |
| d_menu_l / d_menu_d | 0.9136 / 0.9125 | 1.54% / 3.38% |
| d_sheet_l / d_sheet_d | 0.9847 / 0.9708 | 0.37% / 0.94% |
| m_main_l / m_main_d | 0.9417 / 0.9443 | 1.25% / 1.37% |
| m_menu_l / m_menu_d | 0.7774 / 0.7848 | 4.63% / 4.98% |
| m_sheet_l / m_sheet_d | 0.9936 / 0.9426 | 0.25% / 2.94% |

## 既知の差・注意

- **gallery と現行版の差**: gallery にはメモ欄の先頭の「メモ…」、上部の受け渡しの帯「iPhoneからURL…」、一覧ボタンの未読バッジ「1」がある。メニューを開いた位置も違う。現行版（基準画像）には無い。
- **desktop の検索欄のフォーカス枠**: プロトタイプは「開いたら検索欄に入力」（既定オン）で、desktop では起動時に検索欄へフォーカスが入り、枠が光る（`home` などの基準画像に写る）。案内が出ている間や、右クリックなどの操作の後は写らない。本実装も同じ動きにする。
- **`dialog` の背景**: 端末をつなぐシートの QR コード（ペアリングコードから作る）が暗幕の下にうっすら写る。プロトタイプは決まった乱数で毎回同じ QR になるが、本実装のコード生成が違えばこの部分は差になる。
- **dev サーバーと HMR**: `npm run vrt` は dev サーバーを使うので、撮影中にソースを書き換えるとページが再読み込みされ、その画面だけ結果がぶれる（メニューが閉じる等）。数値がおかしいときはもう一度その画面だけ回す（`npm run vrt -- -s menu -v mobile`）。安定させたいときは `npm run build && npm run preview` して `--url` で渡す。
- **ポート 4174 が使用中**: 何が応答しているか分からないので撮らずに「撮影失敗」にする。起動済みの本実装を使うなら `--url` を付ける。
- **Chromium の版**: 基準画像と比較は同じ Chromium で撮ること。版が変わるとフォントの描画やぼかしがわずかに変わる。基準画像は `chromium_headless_shell` 157.0.8103.78 で作った。
- **プロトタイプの癖**: 長押し判定は 0.7 秒（指が 12px 動くと取り消し）。トーストは操作付きなら 10 秒、それ以外は 3 秒で消える（撮影はその前に終わる）。モバイルでは初期ボードが2ページに分かれる。
