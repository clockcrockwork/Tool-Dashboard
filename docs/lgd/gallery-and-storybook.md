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

- 設定: `.storybook/main.ts`（`@storybook/vue3-vite`、ストーリーは `src/**/*.stories.ts`、docgen は `vue-component-meta`）、
  `.storybook/preview.ts`（フォントと `dashboard.css` を読み込み、共通のデコレーター `withDashboard` を付ける）。
- 共通のデコレーター（`src/gallery/storybook.ts` → `src/gallery/StoryShell.vue`）がストーリーごとに Dashboard を作って
  `provideDash` し、`.dash[data-theme]` と壁紙（`.amb`）で包む。編集モードのときは `.dash.edit` になる。
- ツールバーの「テーマ」: 両方並べる（既定、左ライト・右ダーク）／ライト／ダーク。
- 入れ物の形は `parameters.lgd.layout` で選ぶ:
  - `grid` … ウィジェット用。1マス 166×153px・すき間 14px（1440×900 の画面と同じ）のマス目。`grid: [横, 縦]`。
    位置は本物のレイアウト計算から来るので、`setup` で `solo(d, id, [横, 縦])` を呼び、そのウィジェットだけを左上に置く。
  - `bar` … 下部バーやトーストのように `.dash` の端に絶対配置される部品。`height`（と `width`）の箱。
  - `stage` … 部品をそのまま並べる。
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

いまあるストーリー: `Parts/LineIcon`、`Shell/WidgetFrame`（通常・人前では隠す・接続の点・s-load/s-stale/s-empty/s-err）、
`Shell/BottomNav`（通常・2画面目・編集モード・画面が多いとき・最初の案内）、`Shell/ToastStack`（info/ok/warn・元に戻す付き・
進行中・3つ・オフラインの帯・試す）、`Widgets/ClockWidget`（2×1・1×1・4×3・秒なし・12時間・編集中）、`Widgets/ClockFullScreen`、
`Widgets/WeatherWidget`（5状態）、`Widgets/RainWidget`、`Widgets/SearchWidget`、`Widgets/TodoWidget`、`Widgets/LinksWidget`、`Widgets/MemoWidget`。

### 注意

- `tags: ['autodocs']` は付けてあるが、Storybook 10 では自動ドキュメントのページに `@storybook/addon-docs` が要る。
  まだ入れていないので、今はドキュメントのページは出ない（Controls と説明の推定は動く）。
- Vite 8（rolldown）との組み合わせは、`storybook dev` も `storybook build` も追加の設定なしで動いた
  （`@storybook/vue3-vite@10.6.8` の peer は `vite ^5 || ^6 || ^7 || ^8`）。build の「500 kB を超える塊」の警告は Storybook 本体の分で、無視してよい。
- 既定の docgen（vue-docgen-api）は 10.x で非推奨の警告が出るため、`vue-component-meta`（`tsconfig.app.json` を読む）にしている。
- `storybook dev` の最初の数回の読み込みで、Vite が依存を最適化し直してページが一度だけ読み直されることがある。自動で撮るときは build したものを配信して撮ると安定する。
- `.storybook/*.ts` の型検査は `.storybook/tsconfig.json`（`npm run typecheck:storybook`）。`tsconfig.app.json` は変えていない。

## 3. Design Pattern Gallery

- 入口: `gallery.html` → `src/gallery/main.ts` → `src/gallery/GalleryApp.vue`。CSS は `dashboard.css` と、部品シートだけの見本用 CSS
  `src/gallery/gallery.css`（`Parts.dc.html` の `<style>` 687–952 行をそのまま写したもの。手で変えない）。
- 上部の切替は部品シートと同じ: テーマ（並べる／ライト／ダーク）・動き（ふつう／減らす）・速さ（等倍／1/4）。動きと速さは
  `.rmo` と `--sf` を付けるだけで、効くのは 10章（まだ無い）。本体の CSS の `prefers-reduced-motion` は切り替わらない。
- 章ごとにファイルを分けている（`src/gallery/chapters/ChNN*.vue`）。共通の部品は `src/gallery/parts/`:
  `PatternSection`（`.ps-pt` の見出し・クラス名・使う場面）、`ThemeStages`（左ライト・右ダークで同じ中身を2回描く）、
  `DashScope`（見本ごとに別の Dashboard を渡す）、`WidgetSnap`（ウィジェット1つを部品シートと同じ大きさの `.snapf` に描く。
  `src/widgets/index.ts` の `WIDGETS` に無いものは点線の枠）、`StateCell`（3章のマス）、`ChapterTodo`（まだ見本の無い章）。
- 各項目の見出しの横の印: **Vue 部品**（本物）／**クラスだけ**（プロトタイプのクラスを付けた素の要素）／**P1 で追加**（まだ無い）。

### 章ごとの状態（2026-11-23）

| 章 | 状態 | 中身 |
| --- | --- | --- |
| 1 共通の決まり | 済 | 表をそのまま |
| 2 基礎 | 済 | 色トークン・文字の段・面の段・角丸・影（トークンを塗った箱）、アイコン一覧は本物の `LineIcon` |
| 3 状態の比較 | 済 | 13部品×7状態の表（状態はクラスで写す。右端は本物の要素） |
| 4 ボタン | 済（クラスだけ） | `.chip` `.chip.sm` `.btn` `.nb` `.abb` `.bk`。アイコンは `LineIcon` |
| 5 選ぶ・入れる | P1 で追加 | 見出しのみ |
| 6 知らせる・待つ | P1 で追加 | 見出しのみ（トーストは Storybook にある） |
| 7 面と枠 | 済 | 枠・下部バー・画面が多いときは本物（`WidgetFrame`・`BottomNav`）。枠には状態の覆い4つとオフラインの印を足した。シート・置かずに使う帯・全画面・固定の印はクラスだけ |
| 8 そのほかの部品 | P1 で追加 | 見出しのみ |
| 9 ウィジェットの表示 | 済（時計・天気・TODO・メモ） | 本物のウィジェット。ポモドーロ（P2a）とスクリプト（P2d）は点線の枠 |
| 10〜12 | P1 で追加 | 見出しのみ |

### 部品ができたら

章のファイルの中で、素の `<button class="chip">` などをその部品に置き換え、`PatternSection` の `kind` を `vue` にする。
まだ見本の無い章（`ChapterTodo` を使っている章）は、`Ch04Buttons.vue` / `Ch07Surfaces.vue` と同じ形
（`PatternSection` ＋ `ThemeStages`、内容は `Parts.dc.html` の該当箇所から写す）に置き換える。

## 4. 原本との見比べ

`Parts.dc.html` は、それと `support.js`（プロトタイプの実行環境）を同じ一時フォルダに置いて静的に配信すれば開ける。
同じ幅（1440px）・同じ章の要素を Playwright で撮り、画素の差を比べた結果（2026-11-23）:

| 章 | 差のある画素 | メモ |
| --- | --- | --- |
| 1・2・3・4 | 0.01〜0.05% | ほぼ一致（文字の描画の差だけ） |
| 7 | 高さが違う | 枠の見本に状態4つとオフライン、下部バーに2画面目と編集モードを足したため。下部バーは本物の部品なので ‹ › が入る（原本のシートの見本には無い） |
| 9 | 1.56% | 時計・天気・TODO・メモは一致。差はまだ無いポモドーロとスクリプト |

Playwright の既定の `chromium.launch()` は同梱の版と合わないので、`/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` を
`executablePath` に指定して撮っている。
