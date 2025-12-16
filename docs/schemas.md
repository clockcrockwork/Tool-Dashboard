# Widget Board & Tool Schema Specification

**`docs/schemas.md`**

## 0. スキーマ分割の基本思想（最重要）

本プロジェクトでは、スキーマを以下の4層に分離する。

1. **Widget Board Schema**
   → 配置・サイズ・表示制御（ツール非依存）
2. **Tool Common Schema**
   → ツールとして共通に扱うための最小情報
3. **Tool Metadata / Info Schema**
   → UI表示・検索・説明用の静的情報
4. **Tool Extension Schema**
   → 各ツール固有の設定・状態

> 原則：
>
> * 上位レイヤーは下位レイヤーを「知らない」
> * Widget Board はツールの中身を一切知らない
> * ツールは Board の存在を前提にしない

---

## 1️⃣ Widget Board Schema（配置・レイアウト専用）

### 目的

* 自由配置・リサイズ・表示切替・ページ切替
* ツールの中身に依存しない
* 将来同期・共有しても破綻しない

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

### Dashboard Page

```ts
type DashboardPage = {
  dashboardId: string;
  name: string;

  layouts: Record<Breakpoint, WidgetLayoutItem[]>;
};
```

### Dashboard State（保存単位）

```ts
type DashboardState = {
  version: number;
  activeDashboardId: string;
  pages: DashboardPage[];
};
```

#### ルール

* layout は **instanceId 基準**
* 衝突解決ロジックは Board 側の責務
* ツール設定・状態は含めない

---

## 2️⃣ Tool Common Schema（ツール共通・実行単位）

### 目的

* 「ツールをツールとして扱う」ための最小情報
* Widget / Standalone の両方で共通

```ts
type ToolKind = string; // "clock", "timer", etc.
```

### Widget Instance（配置される“実体”）

```ts
type WidgetInstance = {
  instanceId: string;   // UUID
  kind: ToolKind;       // tool identifier
  isVisible: boolean;

  settings?: ToolSettings; // Tool Extension Schema
};
```

#### ルール

* 同じ kind を複数置ける前提
* settings は **ツール側で解釈**
* Board は settings の中身を一切見ない

---

## 3️⃣ Tool Metadata / Info Schema（表示・検索・説明用）

### 目的

* ダッシュボード一覧
* 検索
* ヘルプ表示
* public repo での可読性

```ts
type ToolMetadata = {
  kind: ToolKind;

  title: string;
  description: string;

  tags: string[]; // "time", "utility", etc.
  category?: string;

  version: string;
  status: "stable" | "beta" | "experimental";

  standalone: boolean; // 単体ページあり
  widget: boolean;     // Widget対応

  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
};
```

#### ルール

* 実行状態・設定値は含めない
* 静的データとして扱う（JSON / TS）

---

## 4️⃣ Tool Extension Schema（ツール固有の設定・状態）

### 目的

* 各ツールが自由に拡張できる領域
* Board / 他ツールに影響しない

### ベース型

```ts
type ToolSettings = {
  version: number;
};
```

### Clock Tool Example

```ts
type ClockToolSettings = ToolSettings & {
  version: 1;

  format: "12h" | "24h";
  showSeconds: boolean;

  timeServerUrl?: string; // optional
};
```

#### ルール

* 必ず version を持つ
* 設定が壊れても安全に初期化できること
* ネットワーク設定は optional

---

## 5️⃣ 環境変数・UI設定との関係

### 優先順位

```
UI Settings (localStorage)
> PUBLIC_* Environment Variables
> Tool Defaults
```

### Clock の場合

```ts
effectiveTimeServerUrl =
  uiSetting.timeServerUrl
  ?? PUBLIC_TIME_SERVER_URL
  ?? undefined;
```

#### 原則

* UI設定は公開情報のみ
* Secret はスキーマに含めない

---

## 6️⃣ スキーマ進化ルール（重要）

* **破壊的変更は禁止**
* version を上げて migrate する
* migrate 失敗時は安全に reset

```ts
type MigrationResult<T> =
  | { ok: true; value: T }
  | { ok: false; fallback: T };
```

---

## 7️⃣ 将来拡張に対する耐性

この分離により、以下が可能になる：

* Dashboard レイアウト同期（Convex）
* Tool settings 同期（任意）
* Widget 配置の共有 / export
* Tool 単体配布
* Board 非依存ツール追加

---

## まとめ（設計として重要な点）

* **Widget Board は配置だけを見る**
* **Tool は設定とロジックだけを見る**
* **Metadata は人間とUIのため**
* **Extension Schema はツール作者の自由領域**

---

# 更新履歴

- 2025-12-16： 初版作成