# Widget schema v0 — 時計・天気・スクリプトの記述例

状態: **設計例 / 製品の読込み形式ではない**。共通の意味は [v0 設計案](./widget-schema-v0.md)、確認手順は [照合表](./widget-schema-v0-checklist.md)。JSON は会話・設計レビュー用のデータ表記であり、手書き JSON Schema や新しい runtime renderer の採用を意味しない。

以下の `presentation`、source の形、追加の component ID、action ID は**提案**。現行 `UtilityDefinition` の実装に全項目が存在するわけではない。製品実装では既存 TypeScript / Zod の正本に接続する。新しいサイズは仮の例示値で、実画面の最小寸法ではない。寸法は Shell を除いた内容領域の CSS px。

> **改訂（2026-11-23）:** 下の例は v0 の記法のまま残す。デザインとの照合（[設計案 §0](./widget-schema-v0.md#0-デザインとの照合による改訂2026-11-23)）により、`ui.standalone` によるページ単一表示（R1・R12）、CSS px のサイズ（R2）、`compact` / `detailed` のバリアント（R5）は使わない。実際の登録は `src/app/registry/registry.ts` の形（例: 時計は `{ n: '時計', pg: true, s: [2, 1], min: [1, 1], max: [4, 3], multi: true, f: [秒を表示, 12時間表示] }`、天気は `{ s: [2, 1], min: [1, 1], net: 'data', perm: ['geo'] }` に段階表示「基本／3時間ごと（縦2以上）／週間（縦2以上かつ横3以上、または縦3以上）」）。データソースと状態の考え方（§3 天気の後半、§4 スクリプト）はそのまま有効。
>
> **改訂（2026-11-24、PR #22 レビュー 8）:** ブラウザの画面とデータは `design/` と `docs/lgd/` の資料が正本（[設計案の「正本と適用範囲」](./widget-schema-v0.md)）。下の時計の「配置・設定・表示の対応例」の placement / instance / view / `standalone:clock` は使わない（R6・R7・R12）。今の形は、種類 ID `clock` と配置 ID（最初の1個は `clock`、2個目は `clock#2`）。区画 `w:clock` と `w:clock#2` がそれぞれ設定と記録を持ち、既定では共有しない。全画面は `pgW['clock#2']` のように置いた1個ごとに選ぶ。置かずに使うときは、置いたときと同じ区画を使う。複数置く UI は P3。

## 1. 共通の読み方

- `kind` と対応画面は既存 catalog に接続する。MCP 公開はこの表示例から決まらない。
- `parts` は既存の五種。`partIds` はこの宣言内の部品を参照する。部品の実体や処理コードは JSON に入れない。
- `widgetPolicy` はサイズ変更の能力・内容領域の制約。実際のロックと表示は placement に属する。
- `variants` は上から最初の一致、最後の `when: "default"` は compact。`layoutId` は開発側の first-party 配置プリセットで、任意の CSS や部品ツリーではない。
- `requiredPartIds` は各バリアントにある部品。条件付き操作の実行可否は controller が決め、参照があることと「常時 enabled」は別。
- `dataSources` の登録先と `actionId` の処理は後続実装で定義する。欠落参照を無視して成功扱いにしない。

## 2. 時計 — ローカル完結・両対応

時計は操作用の架空 Operation を作らず、ローカル時刻と保存済みタイムゾーンを投影する。現行 config の `value` はタイムゾーン文字列のため、例でも別の保存キーを増やさない。

```json
{
  "kind": "clock",
  "ui": { "widget": true, "standalone": true, "mcpApp": false },
  "presentation": {
    "templateId": "clock.default",
    "widgetPolicy": {
      "resizable": true,
      "minSizeCssPx": { "width": 160, "height": 100 },
      "preferredSizeCssPx": { "width": 320, "height": 180 }
    },
    "parts": [
      { "id": "clock.face", "kind": "custom", "region": "result", "componentId": "clock.face" },
      { "id": "clock.feedback", "kind": "feedback", "region": "status" }
    ],
    "requiredPartIds": ["clock.face", "clock.feedback"],
    "variants": [
      {
        "id": "detailed",
        "when": { "minWidthCssPx": 320, "minHeightCssPx": 180 },
        "layoutId": "clock.time-date-zone",
        "partIds": ["clock.face", "clock.feedback"]
      },
      {
        "id": "compact",
        "when": "default",
        "layoutId": "clock.time-only",
        "partIds": ["clock.face", "clock.feedback"]
      }
    ]
  },
  "dataSources": []
}
```

`clock.face` は追加候補の custom view 参照。compact は時刻、detailed は日付・タイムゾーンも表示する案。必要な設定ボタンは共通 Shell が提供する。ページ表示でも幅が狭ければ compact になる。

### 配置・設定・表示の対応例

ID は説明用の記号であり、そのまま UUID 検証へ渡す値ではない。（改訂 R6: v0 の経緯。今の ID の形は冒頭の改訂注記。）

| 表示場所 | 配置 | 設定キー | 編集 view |
| --- | --- | --- | --- |
| ボードの時計 A | placement-A → instance-A | instance:instance-A、value = Asia/Tokyo | view-A |
| 別配置で A と設定を共有 | placement-B → instance-A | 同じ config | view-B。draft は A と独立 |
| 別の時計 C | placement-C → instance-C | instance:instance-C、value = UTC | view-C |
| A をページ本文全域で開く | 元の instance-A を参照 | A の設定を維持 | 既存 view を継続するなら draft も維持 |
| 単独の時計を直接開く | placement は不要 | standalone:clock | 独立した view |

配置 A を非表示にしても B の時刻表示・設定は消えない。時計の描画 tick は再計算の契機で、毎秒 config を保存しない。view 破棄では tick 購読を解放し、再表示は現在時刻から投影する。

## 3. 天気 — 接続先と状態を分離

天気の地域・単位は config。要求はそれらから生成して検証する。API サービスは未選定のため `weather.provider-pending` は**未登録であることを表す設計上の仮参照**。この例をロードして通信できるという意味ではない。

```json
{
  "kind": "weather",
  "ui": { "widget": true, "standalone": true, "mcpApp": false },
  "presentation": {
    "templateId": "weather.default",
    "widgetPolicy": {
      "resizable": true,
      "minSizeCssPx": { "width": 240, "height": 160 },
      "preferredSizeCssPx": { "width": 480, "height": 320 }
    },
    "parts": [
      { "id": "weather.summary", "kind": "custom", "region": "result", "componentId": "weather.summary" },
      { "id": "weather.forecast", "kind": "custom", "region": "result", "componentId": "weather.forecast" },
      { "id": "weather.refresh", "kind": "action", "region": "controls", "actionId": "refresh" },
      { "id": "weather.feedback", "kind": "feedback", "region": "status" }
    ],
    "requiredPartIds": ["weather.summary", "weather.refresh", "weather.feedback"],
    "variants": [
      {
        "id": "detailed",
        "when": { "minWidthCssPx": 480, "minHeightCssPx": 320 },
        "layoutId": "weather.summary-forecast",
        "partIds": ["weather.summary", "weather.forecast", "weather.refresh", "weather.feedback"]
      },
      {
        "id": "compact",
        "when": "default",
        "layoutId": "weather.summary",
        "partIds": ["weather.summary", "weather.refresh", "weather.feedback"]
      }
    ]
  },
  "dataSources": [
    {
      "sourceId": "forecast",
      "adapterId": "weather.provider-pending",
      "cache": "session",
      "staleAfterMs": 900000
    }
  ]
}
```

15分の鮮度は説明用の仮値。API の更新間隔や用途に合わせて決める。`summary` と `forecast` は同じ検証済み成功スナップショットを使い、表示が増えただけで別の通信を始めない。`refresh` は controller の intent で、MCP Operation の新規公開を意味しない。

### 同じ要求 key の状態遷移

| 順番 | 入力・イベント | 期待する状態と表示 |
| --- | --- | --- |
| W1 | キャッシュなしで表示 | 初回 loading。まだ empty ではない |
| W2 | 有効な予報を正常取得 | データと取得時刻を表示。取得 error はなし |
| W3 | 仮の鮮度期限を過ぎる | データは残して stale を示す |
| W4 | 再取得中 | データは残して refreshing を示す |
| W5 | timeout | データ＋stale＋更新失敗。正常な空とは扱わない |
| W6 | 接続ヒントが offline になる | W5 の情報に接続ヒントを追加。再試行とローカル設定は使える |
| W7 | 再試行が成功 | 新しい値・時刻へ更新し、前回の取得失敗を解除 |
| W8 | 正常な空応答を取得 | その key の古いデータを置換して empty。古い予報を最新値として残さない |

追加の分岐: キャッシュなし＋初回失敗、キャッシュなし＋offline、不正な応答をそれぞれ確認する。新しい地域へ切り替えた後に旧地域の要求が完了しても反映しない。同じ API でも地域・単位・利用者が違えばキャッシュを分ける。同じ key の共有キャッシュも旧要求で上書きしない。認証付きアダプターを採用する場合は、同じ利用者の権限失効でもキャッシュを表示対象から外し、遅い応答の再格納を拒否することを確認する。

再読み込み後のオフラインキャッシュはこの例では約束しない。ブラウザを閉じた後も予報を残したい場合は、期限・容量・消去・プライバシーを含む永続キャッシュを別途追加する。

## 4. スクリプト — 表示契約と実行基盤を分ける

入力・スクリプト編集値は view の draft、結果とログは実行結果の投影。サンプルでは custom の実行パネルが typed ViewModel を受け取る。パネル内の入力イベントも typed intent として controller に渡し、任意 JS のイベントハンドラーを取り込まない。

```json
{
  "kind": "script",
  "ui": { "widget": true, "standalone": true, "mcpApp": false },
  "presentation": {
    "templateId": "script.default",
    "widgetPolicy": {
      "resizable": true,
      "minSizeCssPx": { "width": 280, "height": 240 },
      "preferredSizeCssPx": { "width": 640, "height": 480 }
    },
    "parts": [
      { "id": "script.editor", "kind": "custom", "region": "input", "componentId": "script.editor" },
      { "id": "script.run", "kind": "action", "region": "controls", "actionId": "run" },
      { "id": "script.stop", "kind": "action", "region": "controls", "actionId": "stop" },
      { "id": "script.output", "kind": "custom", "region": "result", "componentId": "script.output" },
      { "id": "script.feedback", "kind": "feedback", "region": "status" }
    ],
    "requiredPartIds": ["script.editor", "script.run", "script.stop", "script.output", "script.feedback"],
    "variants": [
      {
        "id": "detailed",
        "when": { "minWidthCssPx": 640, "minHeightCssPx": 480 },
        "layoutId": "script.two-pane",
        "partIds": ["script.editor", "script.run", "script.stop", "script.output", "script.feedback"]
      },
      {
        "id": "compact",
        "when": "default",
        "layoutId": "script.stacked",
        "partIds": ["script.editor", "script.run", "script.stop", "script.output", "script.feedback"]
      }
    ]
  },
  "dataSources": []
}
```

この例の `dataSources: []` はウィジェットの表示用取得がないことを表す。ゲストコードのネットワーク遮断を証明するものではない。

| 操作・状態 | 期待する UI 契約 |
| --- | --- |
| 入力中 | 未完成のコード・入力を保持。まだ実行しない |
| Run | 入力 snapshot を検証し、新しい invocationId で実行。連打で多重起動しない |
| running | Run を無効、Stop を操作可能に。実行時間と bounded logs を表示 |
| 実行中にリサイズ | 同じ invocation のまま並び替える。コード・入力・出力を初期化しない |
| Stop | 停止要求中を示し、実際の停止確認後に停止済みへ。エラーと混同しない |
| 完了／例外 | 結果または安全なエラーを表示。ログ・出力の上限を適用 |
| 再実行 | 新しい invocation。古い応答で新しい結果を上書きしない |
| 離脱・非表示 | 未保存入力を守る離脱確認。離脱が確定したら専有実行を終了し、再表示で自動再実行しない |

UI プロトタイプでは実行基盤を stub にできる。その場合は **UI の検証のみ**と記録する。無限ループ、隔離、通信遮断、上限、Windows Chrome / iPhone Safari の実測は [#16](https://github.com/clockcrockwork/Tool-Dashboard/issues/16) のまま未完了とする。

## 5. 三例が共通で使うもの

| 共通項目 | 時計 | 天気 | スクリプト |
| --- | --- | --- | --- |
| Widget / Page Shell | 使用 | 使用 | 使用 |
| 寸法による構成選択 | 時刻／日付等 | 概要／予報 | 縦積み／二画面 |
| 独立ロック・表示 | placement が所有 | 同左 | 同左 |
| Feedback と設定導線 | 不正設定など | loading / empty / stale / error | 入力エラー／実行エラー／停止 |
| 外部データソース | 不要 | source 宣言＋adapter | この例では不要 |
| 明示的な処理 action | 不要 | refresh | run / stop |
| 破棄時の解放 | tick 購読 | view の購読・専有要求 | 専有する実行・ログ購読 |
| 実装状況 | 基本時計は既存。新構成は提案 | 未実装 | 未実装。方式は #16 |

このほかの tool-only / page-only は、対応フラグを一方だけ true にした構成例で拒否・選択規則を確認できる。試験のためだけに新しい製品ツールを増やさない。
