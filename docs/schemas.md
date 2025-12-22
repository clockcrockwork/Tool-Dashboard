# Widget Board & Tool Schema Specification

**`docs/schemas.md`**

## 0. スキーマ分割の基本思想（最重要）

本プロジェクトでは、スキーマを以下の4層に分離する。

1. **Widget Board Schema**  
   → 配置・サイズ・表示制御（ツール非依存）
2. **Tool Common Schema**  
   → ツールとして共通に扱うための最小情報（配置される“実体”の型）
3. **Tool Metadata / Info Schema**  
   → UI表示・検索・説明用の静的情報
4. **Tool Extension Schema**  
   → 各ツール固有の設定（永続化対象）およびランタイム状態（原則永続化しない）

> 原則：
> - 上位レイヤーは下位レイヤーを「知らない」
> - Widget Board はツールの中身（設定の意味）を一切知らない
> - ツールは Board の存在を前提にしない（Standaloneで成立）

---

## 1️⃣ Widget Board Schema（配置・レイアウト専用）

### 目的
- 自由配置・リサイズ・表示切替・ページ切替
- ツールの中身に依存しない
- 将来同期・共有しても破綻しない

### Breakpoint
```ts
type Breakpoint = "lg" | "md" | "sm";
```

### Layout Item（グリッド情報）
```ts
type WidgetLayoutItem = {
  instanceId: string; // WidgetInstanceと紐づく
  x: number;
  y: number;
  w: number;
  h: number;
};
```

### Board Page（= 1枚のダッシュボード）
> NOTE: ここで「配置（layouts）」と「実体（instances）」の整合性を設計上担保する。

```ts
type WidgetBoardPage = {
  pageId: string;
  name: string;

  // Source of truth for existence of widgets on this page
  instances: WidgetInstance[];

  // Position/size only; references instances by instanceId
  layouts: Record<Breakpoint, WidgetLayoutItem[]>;
};
```

### Board State（保存単位）
```ts
type WidgetBoardState = {
  version: number;
  activePageId: string;
  pages: WidgetBoardPage[];

  // Board 全体で共通の外観設定
  globalSettings?: {
    backgroundType: "color" | "image" | "preset";
    backgroundValue: string; // color: hex/RGBA, image: URL or asset key, preset: preset name
    themePreset?: string; // UIテーマプリセット名
    accentColor?: string; // アクセントカラー（テーマプリセットを上書き）
  };
};
```

#### globalSettings の保存/適用優先順位
- 保存時：`globalSettings` を持たない旧バージョンは保存時に未設定のままとし、復元時にデフォルト外観（例：プレーン背景 + デフォルトテーマ）を適用する。
- 適用時の優先順位は以下とする：
  1. `globalSettings.themePreset` が存在する場合はプリセットを適用。
  2. `globalSettings.accentColor` が存在する場合、テーマプリセットのアクセントを上書き。
  3. `globalSettings.backgroundType` / `backgroundValue` を組み合わせて背景を決定。
- `globalSettings` が未設定の場合は、実装側のデフォルト背景・テーマを使用する（各ページやツールで個別設定がある場合はそちらが優先される）。

#### 参照整合性ルール（必須）
- `layouts[*].instanceId` は、同一 `WidgetBoardPage.instances[].instanceId` に存在しなければならない
- `instances` に存在するが layout に存在しない場合、Boardは「未配置」とみなし、追加時に自動配置してよい
- 復元時に不整合がある場合、Boardは安全に修復（不要layoutの削除、未配置の自動追加）する

#### Breakpoint欠損時の縮退ルール（必須）
- ある breakpoint の layout が未定義の場合、次の順で縮退生成する：  
  `sm <- md <- lg`
- 生成時は、列数に合わせて `w/x` を clamp し、衝突解決（auto-pack downward）を適用する

---

## 2️⃣ Tool Common Schema（ツール共通・実行単位）

### 目的
- 「ツールをツールとして扱う」ための最小情報
- Widget / Standalone の両方で共通

```ts
type ToolKind = string; // "clock", "timer", etc.
```

### Widget Instance（配置される“実体”）
```ts
type WidgetInstance = {
  instanceId: string; // UUID
  kind: ToolKind;

  isVisible: boolean;

  // Board-level control flags
  locked?: boolean; // default: false (ユーザー操作で移動・リサイズ可能)
  zIndex?: number; // default: 自動決定（layouts順・追加順に準拠）
  groupId?: string; // default: 未所属（グループ化されない）

  // Persisted user configuration only (Tool Extension Schema)
  config?: ToolConfig;
};
```

#### ルール
- 同じ kind を複数置ける前提
- Board は config の「意味」を解釈しない（単に保持・移送する）
- ランタイム状態（例：タイマー残り秒、UI一時値）は原則として永続化しない
  （必要なツールのみ、別途“明示的に”永続化戦略を定義する）

#### デフォルト挙動・マイグレーション（WidgetInstance）
- `locked` が未設定の場合は `false` とみなし、既存データは全て操作可能として扱う。
- `zIndex` が未設定の場合は layout 定義の並びや追加順による自動スタッキングを採用する（古いデータに値を埋めない）。
- `groupId` が未設定の場合はグループ非所属とし、グループ機能がない旧データはそのまま動作する。
- マイグレーションでは上記デフォルトを適用するのみで、値の自動付与や再計算は行わないこと。

---

## 3️⃣ Tool Metadata / Info Schema（表示・検索・説明用）

### 目的
- 一覧 / 検索 / ヘルプ表示
- public repo での可読性

```ts
type ToolMetadata = {
  kind: ToolKind;

  title: string;
  description: string;

  tags: string[];
  category?: string;

  version: string;
  status: "stable" | "beta" | "experimental";

  standalone: boolean;
  widget: boolean;

  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
};
```

#### ルール
- 実行状態・設定値は含めない
- 静的データとして扱う（JSON / TS）

---

## 4️⃣ Tool Extension Schema（ツール固有の設定・状態）

### 目的
- ツールごとの永続化対象（設定）を定義する
- Board / 他ツールに影響しない
- 破損しても安全に復旧できる

### 4.1 Persisted Config（原則：永続化対象）
```ts
type ToolConfig = {
  version: number;
};
```

### 4.2 Runtime State（原則：永続化しない）
```ts
type ToolRuntimeState = Record<string, unknown>;
```

> 原則：保存対象は Config のみ。Runtime State を永続化する場合は、そのツールの仕様書で理由と復旧戦略を明記する。

### Clock Tool Example（Config）
```ts
type ClockToolConfig = ToolConfig & {
  version: 1;

  format: "12h" | "24h";
  showSeconds: boolean;

  timeServerUrl?: string; // optional
};
```

---

## 5️⃣ Tool Registry（kind → 実装/metadata/config）

実装では必ず「kind → component」を引く Registry が必要になる。

```ts
type ToolRegistration = {
  kind: ToolKind;
  metadata: ToolMetadata;

  WidgetComponent: unknown;
  StandaloneComponent: unknown;

  defaultConfig: ToolConfig;
  migrateConfig: (input: unknown) => MigrationResult<ToolConfig>;
};
```

#### ルール
- すべての kind は registry に登録されていなければならない
- Board は registry を通して metadata / defaultConfig を参照する
- migrateConfig は “安全に復旧できる”こと（失敗時 fallback）を保証する

---

## 6️⃣ 環境変数・UI設定との関係

### 優先順位
```
UI Settings (localStorage)
> PUBLIC_* Environment Variables
> Tool Defaults
```

### Clock の場合（例）
```ts
effectiveTimeServerUrl =
  uiSetting.timeServerUrl
  ?? PUBLIC_TIME_SERVER_URL
  ?? undefined;
```

#### 原則
- UI設定は公開情報のみ
- Secret はスキーマに含めない

---

## 7️⃣ スキーマ進化ルール（重要）
- 破壊的変更は禁止（versionを上げる）
- migrate 失敗時は安全に reset / fallback

```ts
type MigrationResult<T> =
  | { ok: true; value: T }
  | { ok: false; fallback: T };
```

---

## 8️⃣ 将来拡張に対する耐性（方向性）
- Board layout の同期（Convex/Supabase）
- Tool config の同期（任意）
- Widget 配置の共有 / export
- Provider 有効化（例：`PUBLIC_SYNC_PROVIDER=none|supabase|convex`）

---

# 更新履歴
- 2025-12-16： 初版作成
- 2025-12-16： BoardPageにinstancesを追加、ID命名整理、Config/Runtime分離、Breakpoint縮退、Registry契約を追記
