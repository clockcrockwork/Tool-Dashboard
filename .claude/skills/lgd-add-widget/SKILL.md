---
name: lgd-add-widget
description: リキッドグラス・ダッシュボードにウィジェットを1つ移植・追加する手順。プロトタイプの section data-w を Vue に移し、記録・単体テスト・Storybook・再現度テストのシナリオまで揃える。P2 のウィジェット移植や新しいウィジェットを足すときに使う。
---

# ウィジェットを1つ足す

前提: `docs/lgd/development-flow.md` を読んでいること。対象 `<id>` は `src/app/registry/registry.ts` に登録済み（新しい種類なら実装ガイド 4章「新しいウィジェットを足す手順」で登録から始める）。

1. **プロトタイプの範囲を探す**
   - マークアップ: `grep -n 'data-w="<id>"' design/claude-design/Main.dc.html`（`<section class="w ...">` から `</section>` まで）。
   - 値: スクリプトの `renderVals()` と `xVals()` で、テンプレートの `{{...}}` に使われている名前を grep する。初期データは `D()`、ウィジェット固有の操作はメソッド（`calc` `trRun` など）。
   - 仕様: 仕様書 3章「登録済みウィジェット」の行と、そのウィジェットの章。部品シート 9章・12章に見本があればそれも。
2. **ファイルを作る**（`src/widgets/<id>/`）
   - `<Name>Widget.vue`: `WidgetFrame` で包み、`.in` 以下はプロトタイプのマークアップをクラス名・aria-label・style を変えずに移す。`{{x}}` は computed に。
   - `<id>.ts`: 純粋な計算。`<id>.test.ts`: その単体テスト（境界値・空・失敗）。
   - `data.ts`: 記録があれば `WidgetDataDef`（version / initial（プロトタイプの初期値）/ sanitize / toSaved）。
   - `sample.ts` / `adapter.ts`: 外部の情報を使うなら見本データと差し替えの境界。
   - `<Name>Widget.stories.ts`: 通常・1×1・各状態（読み込み中・更新中・空・失敗・人前では隠す）。
3. **登録する**: `src/widgets/index.ts` の `WIDGETS`（必要なら `FULLSCREEN`）と `WIDGET_DATA`。
4. **確認表**（実装ガイド 4章）を1つずつ満たす。
5. **再現度テスト**: `vrt/scenarios` にそのウィジェットを置いた状態（seed で `off` から外す）・小型・状態のシナリオを足し、`npm run vrt:baseline -- --only <scenario>` → `npm run vrt -- --only <scenario>`。合格ライン（SSIM ≥ 0.95・差分率 ≤ 5%）未達なら差分画像を見て直す。
6. `npm run check` と `npm run build`。
7. Design Pattern Gallery（`src/gallery/`）の「9. ウィジェットの表示」に載せる。
