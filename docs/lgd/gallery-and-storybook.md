# Storybook と Design Pattern Gallery

作成: 2026-11-23。担当: UI/UX 実装層（`.storybook/**`、`src/gallery/**`、`gallery.html`）。

## 1. 役割分担

| | Storybook | Design Pattern Gallery |
| --- | --- | --- |
| 何のため | 部品1つずつの**状態と操作**を確かめる（Controls で値を変える、押して動きを見る） | 部品シート（`design/claude-design/Parts.dc.html`）と**同じ並び**で見本を並べ、原本と見比べる |
| 単位 | 部品・ウィジェットごとのストーリー | 章（1〜12）。各見本は左ライト・右ダーク |
| 描き方 | 本物の Vue 部品だけ | 本物の Vue 部品と、プロトタイプのクラスを付けた素の要素（部品がまだ無いもの） |
| 開き方 | `npm run storybook` → http://localhost:6006 | `npm run gallery` → http://localhost:4184/gallery.html |
| 固める | `npm run build-storybook`（`storybook-static/`、git には入れない） | 本番ビルド（`npm run build` の `index.html`）には入らない |

どちらもメモリ上の `Dashboard`（`src/gallery/dash.ts` の `makeDash`）を使い、時刻は再現度テストと同じ
**2026-11-19 10:24:36 JST** に固定している。時計は端末のタイムゾーンで描くので、JST 以外の端末では時と日付がずれる
（スクリーンショットは Playwright の `timezoneId: 'Asia/Tokyo'` で撮る）。

見た目はプロトタイプのクラスと `src/app/styles/dashboard.css` で決まる。トークンは `.dash` の中でしか効かないので、
どちらも必ず `.dash` の中に描く。

## 2. Storybook

- 設定: `.storybook/main.ts`（`@storybook/vue3-vite`、ストーリーは `src/**/*.stories.ts`、docgen は `vue-component-meta`、
  自動ドキュメントは `@storybook/addon-docs`）、
  `.storybook/preview.ts`（フォントと `dashboard.css` を読み込み、共通のデコレーター `withDashboard` を付ける）。
- 共通のデコレーター（`src/gallery/storybook.ts` → `src/gallery/StoryShell.vue`）がストーリーごとに Dashboard を作って
  `provideDash` し、`.dash[data-theme]` と壁紙（`.amb`）で包む。編集モードのときは `.dash.edit` になる。
- ツールバーの「テーマ」: 両方並べる（既定、左ライト・右ダーク）／ライト／ダーク。
- 入れ物の形は `parameters.lgd.layout` で選ぶ:
  - `grid` … ウィジェット用。1マス 166×153px・すき間 14px（1440×900 の画面と同じ）のマス目。`grid: [横, 縦]`。
    位置は本物のレイアウト計算から来るので、`setup` で `solo(d, id, [横, 縦])` を呼び、そのウィジェットだけを左上に置く。
  - `bar` … 下部バーやトーストのように `.dash` の端に絶対配置される部品。`height`（と `width`）の箱。
    箱は `contain: layout` なので、`position: fixed` の部品（ダイアログ・一時利用の帯・暗幕）も箱の中に収まる。
  - `stage` … 部品をそのまま並べる。
- `parameters.lgd.bare: true` は入れ物で包まず、Dashboard を `provideDash` するだけ（`DashboardRoot` 全体のように自分で `.dash` を描くもの。
  Storybook の `layout: 'fullscreen'` と組で使う）。テーマは全体設定 `gs.theme` に入れる（両方並べるときは「自動」）。
- v-model の部品は `useArgs()`（`storybook/preview-api`）で押した結果を Controls に返している（例: `SwitchToggle.stories.ts`）。
- `parameters.lgd.setup(d, args)` は args が変わるたびに呼び直す（Controls の値がそのまま映る）。何度呼んでも同じ結果になるように書く。
- トーストを本物のタイマーで消したいときは `parameters.lgd.timers: true`（既定はタイマーなしで止まった見本）。

### ストーリーの足し方

1. `src/gallery/stories/<Name>.stories.ts` を作る（今はほかの担当のフォルダに書かないため、ここにまとめている。
   まとめ役が部品の隣へ移す可能性あり。`src/**/*.stories.ts` ならどこでも読み込まれる）。
2. CSF3 で `tags: ['autodocs']`、`title` は `Parts/…`・`Shell/…`・`Widgets/…` の英字（ストーリーの ID になる）。
   説明（JSDoc）とストーリーの `name` は日本語で、部品シートの何章のどの項目かを書く。
3. ウィジェットは `parameters: { lgd: widgetLgd('<id>', (d, a) => { d.setCfg('<id>', '<key>', a.<key>); }) }` とし、
   args に `w`・`h`（マス数）・`edit` と設定の項目を置く（例: `src/gallery/stories/WeatherWidget.stories.ts`）。
4. `npx vue-tsc --noEmit -p tsconfig.app.json`、`npx eslint src/gallery .storybook`、`npm run build-storybook` を通す。

いまあるストーリー（27部品・112ストーリー、各部品に autodocs のページ）:

| 分類 | ストーリー |
| --- | --- |
| Parts | `LineIcon`、`SegChoice`（3択・2択・テーマ）、`SwitchToggle`（オフ・オン・無効）、`RangeInput`（品質・ガラスの透明感）、`NumStepper`（通常・最小・単位つき・5分刻み）、`FieldRow`（スイッチ・行の並び）、`SizeGrid`（選んだ範囲・固定中・スマホの2列・全画面）、`CollapseSection`（開いた節・閉じた節）、`SelectButton`（閉じている・開いている・押して選ぶ） |
| Shell | `WidgetFrame`（通常・人前では隠す・接続の点・s-load/s-stale/s-empty/s-err）、`BottomNav`（通常・2画面目・編集モード・画面が多いとき・最初の案内）、`ToastStack`（info/ok/warn・元に戻す付き・進行中・3つ・オフラインの帯・試す）、`Sheets`（全体の設定・操作ヒント・端末をつなぐ・ウィジェット一覧・ウィジェットを追加・ウィジェットの設定（TODO・時計）・スマホ）、`MenuLayer`（その他メニュー（TODO・メモ）・選択メニュー（場所・13個以上で絞り込み・幅520px未満は下から））、`DialogLayer`（確認・お知らせ・試す）、`TourCard`（1・2・5手順目）、`TempBar`（メモ・ボード2つ）、`TopBars`（受け渡しの知らせ・新しい版・2本重なる）、`DashboardRoot`（ホーム・編集モード・編集モードでウィジェットの設定・設定を開いたとき・最初の案内） |
| Widgets | `ClockWidget`（2×1・1×1・4×3・秒なし・12時間・編集中）、`ClockFullScreen`、`WeatherWidget`（5状態）、`RainWidget`、`SearchWidget`、`TodoWidget`、`LinksWidget`、`MemoWidget` |

`Shell/Sheets` は `SheetsHost`・`ToastStack`・`OverlaysHost` を一緒に置いているので、シートの中の選択メニュー・ダイアログ・置かずに使う、もそのまま動く。

### 注意

- 自動ドキュメントのページ（`tags: ['autodocs']`）は `@storybook/addon-docs@10.6.8`（devDependencies）で出る。説明はストーリーの JSDoc、
  props と events の表は `vue-component-meta` が型から作る。総称型の部品（`SegChoice`）は Meta の型に合わないので `ConcreteComponent<Args>` にして渡している。
- Vite 8（rolldown）との組み合わせは、`storybook dev` も `storybook build` も追加の設定なしで動いた
  （`@storybook/vue3-vite@10.6.8` の peer は `vite ^5 || ^6 || ^7 || ^8`）。build の「500 kB を超える塊」の警告は Storybook 本体の分で、無視してよい。
- 既定の docgen（vue-docgen-api）は 10.x で非推奨の警告が出るため、`vue-component-meta`（`tsconfig.app.json` を読む）にしている。
- `storybook dev` の最初の数回の読み込みで、Vite が依存を最適化し直してページが一度だけ読み直されることがある。自動で撮るときは build したものを配信して撮ると安定する。
- `.storybook/*.ts` の型検査は `.storybook/tsconfig.json`（`npm run typecheck:storybook`）。`tsconfig.app.json` は変えていない。

## 3. Design Pattern Gallery

- 入口: `gallery.html` → `src/gallery/main.ts` → `src/gallery/GalleryApp.vue`。CSS は `dashboard.css` と、部品シートだけの見本用 CSS
  `src/gallery/gallery.css`（`Parts.dc.html` の `<style>` 687–952 行をそのまま写したもの。手で変えない）と、本物の部品を見本の台に
  置くための追加 `src/gallery/gallery-live.css`（重なる層の部品を台の中に置く・暗幕を隠す・部品の中の要素に状態のまねを付ける・11章の縮小・
  ギャラリーの見出しの CSS が部品の中の見出しに効かないようにする）。
- 上部の切替は部品シートと同じ: テーマ（並べる／ライト／ダーク）・動き（ふつう／減らす）・速さ（等倍／1/4）。動きと速さは
  `.rmo` と `--sf` を付けるだけで、効くのは 10章（「再生」の動き）。本体の CSS の `prefers-reduced-motion` は切り替わらない。
- 章ごとにファイルを分けている（`src/gallery/chapters/ChNN*.vue`）。共通の部品は `src/gallery/parts/`:
  `PatternSection`（`.ps-pt` の見出し・クラス名・使う場面）、`ThemeStages`（左ライト・右ダークで同じ中身を2回描く）、
  `DashScope`（見本ごとに別の Dashboard を渡す）、`WidgetSnap`（ウィジェット1つを部品シートと同じ大きさの `.snapf` に描く。
  `src/widgets/index.ts` の `WIDGETS` に無いものは点線の枠）、`StateCell`（3章のマス）、`ScreenSnap`（11章: 本物の `DashboardRoot` を
  1440×900 / 390×844 で描いて `transform: scale` で縮める。iframe は使わない）、`KindTag`（見出しの横の印）。
- `src/gallery/proto.ts` は原本 `Parts.dc.html` を `?raw` で読み、DOMParser で見本のマークアップを取り出す。12章の P2 ウィジェット
  （翻訳・スクリプト・画像変換・受け渡し・日の出）は写しを作らずにこれで描く（原本が変われば見本も変わる）。
- 各項目の見出しの横の印: **Vue 部品**（本物）／**一部 Vue 部品**（本物と素の要素が混ざる）／**クラスだけ**（プロトタイプのクラスを付けた素の要素。
  多くは P2 のウィジェットに属する部品）。
- 見本の部品は押すと動く（本物の操作が走る）。ダイアログ・メニューは押すと閉じるので、もう一度見るにはページを読み直す。

### 章ごとの状態（2026-11-23）

| 章 | 状態 | 本物（Vue 部品） | クラスだけ |
| --- | --- | --- | --- |
| 1 共通の決まり | 済 | — | 表をそのまま |
| 2 基礎 | 済 | アイコン一覧（`LineIcon`） | 色トークン・文字の段・面の段・角丸・影（トークンを塗った箱） |
| 3 状態の比較 | 済 | 右端の列の要素 | 13部品×7状態の表（状態はクラスで写す） |
| 4 ボタン | 済 | アイコン（`LineIcon`） | `.chip` `.chip.sm` `.btn` `.nb` `.abb` `.bk`（ボタンの部品コンポーネントはまだ無い） |
| 5 選ぶ・入れる | 済 | 選択の並び（`SegChoice`）・スイッチ（`SwitchToggle`・`FieldRow`）・スライダー（`RangeInput`）・大きさのマス（`SizeGrid`）・選択メニュー（`SelectButton`＋`MenuLayer`）・数のステッパー（`NumStepper`） | 入力欄・切替チップ・ウィジェットを探す（本物は `AddSheet` の中）・チェック・補足とエラー・日付と時刻 |
| 6 知らせる・待つ | 済 | トースト・オフラインの帯（`ToastStack`）・知らせの帯（`TopBars`）・ダイアログ（`DialogLayer`）・最初の案内（`TourCard`）・接続の点（`WidgetFrame`） | 編集中の帯・待つ間の表示・印・空の表示・ツールチップ・許可のお願い・net: dl / own・ウィジェット内の知らせ |
| 7 面と枠 | 済 | 枠・下部バー・画面が多いとき（`WidgetFrame`・`BottomNav`）。枠には状態の覆い4つとオフラインの印を足した | シート・置かずに使う帯・全画面・固定の印 |
| 8 そのほかの部品 | 済 | その他メニュー（`MenuLayer`）・折りたたみの節（`CollapseSection`） | ドロップ受け・ファイル行・コード欄（P2d）・時間の帯（P2c）・一覧の行（本物は `AddSheet` の中）・帯のあふれ・件数のバッジ・キーの表示 |
| 9 ウィジェットの表示 | 済（時計・天気・TODO・メモ） | 本物のウィジェット | ポモドーロ（P2a）とスクリプト（P2d）は点線の枠 |
| 10 動きとフィードバック | 済 | スイッチ（`SwitchToggle`） | ほかの12項目（「再生」は原本の `play()` を移したもの。動き・速さの切替が効く） |
| 11 画面とテーマ | 済 | 3場面×デスクトップ・スマホ×ライト・ダーク（`DashboardRoot` を縮小）。いつもの画面には受け渡しの知らせと未読2件、メニューは TODO のその他メニューと「場所」の選択メニュー | 違いの一覧（表） |
| 12 空・処理中・失敗・復旧 | 済 | 天気の5状態（`setWeatherState`）・TODO の空 | 翻訳・スクリプト・画像変換・受け渡し・日の出（原本のマークアップ、`proto.ts`） |

### 部品ができたら

章のファイルの中で、素の `<button class="chip">` などをその部品に置き換え、`PatternSection` の `kind` を `vue`（一部なら `mix`）にする。
P2 のウィジェットができたら、12章（`Ch12Flows.vue`）の `FLOWS` のその段に `real`（ウィジェットの ID・マス数・状態を入れる `prepare`）を足すと、
原本のマークアップの代わりに本物が出る。9章は `WIDGETS` に入れば自動で本物になる。

## 4. 原本との見比べ

`Parts.dc.html` は、それと `support.js`（プロトタイプの実行環境）を同じ一時フォルダに置いて静的に配信すれば開ける。
同じ幅（1440px）・同じ章の要素を Playwright で撮り、画素の差を比べた結果（2026-11-23）:

| 章 | 差のある画素 | メモ |
| --- | --- | --- |
| 1・2・3・4 | 0.00〜0.05% | ほぼ一致（文字の描画の差だけ） |
| 5 | 項目ごとに 0.00〜0.03%（補足とエラー 1.4%） | 章全体は説明（`pnote`）を足した分だけ高い。大きさのマスは本物のすき間が 4px（原本の見本の `.szg` は 6px）。選択メニューの中身は本物の選択肢（東京・大阪…。原本の見本はロンドン・ニューヨーク…） |
| 6 | 項目ごとに 0.2〜4.5%（多くは1pxずれ） | トーストの「知らせ」の印は本物のベル（原本の見本は丸に i）。最初の案内は本物の2手順目の文（原本より長い）。ダイアログは見出しの上の線と余白が無い（原本の見本では `.ds h2` が効いている。原本側の崩れ） |
| 7 | 高さが違う | 枠の見本に状態4つとオフライン、下部バーに2画面目と編集モードを足したため。下部バーは本物の部品なので ‹ › が入る（原本のシートの見本には無い） |
| 8 | 項目ごとに 0.00〜3.7% | その他メニューは本物（ホバーの塗りなし）。折りたたみの節は本物の矢印が 20px（原本の見本は 18px） |
| 9 | 1.33% | 時計・天気・TODO・メモは一致。差はまだ無いポモドーロとスクリプト |
| 10 | 0.08% | ほぼ一致 |
| 11 | 比べられない | 原本は古い版から撮った静止画（webp）。本物はメモの位置などが今の版になる。受け渡しの知らせの文は表示テストの見本（「iPhoneから文：…」） |
| 12 | 0.50% | 天気の空と失敗は、原本の見本では文が左上に寄っている（原本側の崩れ）。本物は中央 |

Playwright の既定の `chromium.launch()` は同梱の版と合わないので、`/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` を
`executablePath` に指定して撮っている。
