# Widget schema v0 — 構成・配置・実行の設計案

作成日: 2026-11-19。状態: **WORKING DRAFT / 設計・照合用。実装 API・保存形式の確定ではない。**

確認した基準: `main` の `e20718e41bec25a63d5f0ffe93467f9a55fc55f8`。初回監査の `b0105d8` から追加された [Vue 継続の決定 #20](https://github.com/clockcrockwork/Tool-Dashboard/pull/20) も照合済み。今回の変更は文書のみ。新しい Claude Design の HTML は未提供であり、画面との適合・操作・性能は未検証。既存の `prototype.jsx` は過去の参考資料で、新しいプロトタイプの代用にはしない。

この文書の v0 は**設計案の版**。製品 v2、既存 Operation / Parts / config の版、IndexedDB の版、exportVersion とは別であり、いずれも変更しない。

関連: [定義例](./widget-schema-v0-examples.md)、[プロトタイプ照合・後続作業](./widget-schema-v0-checklist.md)。既存の正本は [四層契約](./four-layer-contracts-v2.md)、[ID・保存・実行契約](./tool-module-contract-v2.md)、[Parts と Shell](./design-system-and-parts-v2.md)、[検証・移行規約](./quality-gates-v2.md)。この案と衝突する場合は正本を維持し、衝突を設計判断へ戻す。

## 1. 今回の目的と方式

ページ本文を一つのツールで使う「ページウィジェット」、ボードへ置く「ツールウィジェット」、その両対応を表現する。共通のリサイズ・位置固定・サイズ固定・表示切替、パーツ構成、サイズ別の内容、通信先、空・失敗・オフライン、通知、処理の境界を決める。

| 方式 | 利点と負担 | 今回の扱い |
| --- | --- | --- |
| 全ツールを個別の画面実装に任せる | 特殊な画面を作りやすいが、共通設定と状態の照合がツールごとになる | カスタム View の選択肢として残す |
| 既存の型付き定義・Parts・Shell に構成メタデータを足す | 設定・処理を再利用し、必要な範囲だけ共通化できる | **v0 の推奨案**。承認済みの責務分離を既存構造に接続する |
| 任意の JSON で画面・処理を全部組み立てる | 自由度と引き換えに独自 UI 言語・実行系・移行が必要 | 現在の要件には採用しない |

前の会話の `widget.json` / `views/*.json` は説明例として扱う。既存方針に合わせ、**静的な構成は TypeScript、外部入力と保存値の検証は Zod、必要な JSON Schema は生成**する。別の手書き正本は作らない。Operation の外部スキーマは既存の `operationJsonSchema()` と対応語彙を使う。

## 2. 実物で確認した到達点

| 関心 | 現在の実装 | この案で追加する設計 |
| --- | --- | --- |
| 対応画面 | `UtilityDefinition.ui.widget / standalone / mcpApp`。時計・色変換は前二つが true | ページ単一表示の意味と、配置との対応 |
| 配置 | `Placement = placementId, instanceId, revision, position, width`。編集幅は 1 または 2 | ページ所属、独立ロック、表示設定、サイズ制約 |
| 設定 | `instance:<UUID>` / `standalone:<kind>` を別保存。設定に revision | 所有権を維持。配置へ設定本文を戻さない |
| 表示部品 | `field / action / result / feedback / custom` の型あり。現画面は専用フォーム | 登録済み部品を参照するテンプレート、コンテナ別構成 |
| 編集・実行 | 現 controller に draft、競合検出、実行順序、破棄処理あり | 共通 ViewModel への接続、データ取得状態・通知・寿命の整理 |
| データ保存先 | 現 `TargetRef` の実装は `local` / `data`。より広い config / remote は既存設計 | 通信アダプターと保存先を別の概念として扱う |
| 例 | 時計・色変換の UI。実際の独立画面は色変換 | 天気・スクリプトは新規の**設計例** |

確認元: [catalog](../src/core/catalog.ts)、[Parts](../src/core/parts.ts)、[ViewModel](../src/core/view-model.ts)、[repository](../src/web/local-repository.ts)、[controller](../src/web/tool-controller.ts)、[App](../src/App.vue)。型・カタログに対応があることと、全画面や状態が動作することは区別する。

## 3. スキーマが受け持つ範囲

| 所有者 | 宣言・保存するもの | 他の所有者への参照 |
| --- | --- | --- |
| Utility Definition | kind、対応画面、設定の検証、利用する構成・処理・データソース | 既存 catalog の一登録 |
| Presentation | templateId、部品 ID、配置プリセット、compact / detailed、必須要素 | 既存 Parts・Tokens、登録済み custom component |
| Board / Page / Placement | ページの構成、配置・サイズ・ロック・表示、選択した見た目 | placementId → instanceId。設定本文は持たない |
| Config / Data | ユーザー設定、必要な永続データ、それぞれの版・revision | instance の設定キー、明示的な targetRef |
| Controller / ViewModel | view ごとの draft、取得・実行状態、結果、派生表示、feedback | 設定・data の読み取り、型付き intent |
| Application service / Adapter | 通信、検証済み処理、購読、キャンセル、資源解放 | 許可された通信先・保存先・実行ポート |

`placementId`、`instanceId`、`viewId`、`targetRef` を統合しない。同じ instance を二つの配置で開いても、編集中の draft は **view ごと**に独立する。保存済み設定の共有は既存の revision と競合規則に従う。純粋な Operation は instance を必要としない。

## 4. ページ／ツール／両対応

| ユーザー上の意味 | 既存定義との対応 | ホストの責任 |
| --- | --- | --- |
| ツールウィジェット | `ui.widget: true` | ボードの複数配置、編集、移動・リサイズ |
| ページウィジェット | `ui.standalone: true` のページ向け View を使用 | ページ本文に単一ツール。ナビゲーション等の共通 Shell は外側 |
| 両対応 | 上記二つが true | 置く場所に応じて View を選ぶ。`both` という第三の実行モードは作らない |

**v0 の仮定:** 「全面単一」はアプリのページ本文を占有する意味。ブラウザの Fullscreen API を使う意味ではない。新しい HTML が別の意味を持つ場合は、この対応を調整する。

ダッシュボード内のページ構成は、次の排他的な形で表現できる。これは概念型であり、現行 DB にそのまま保存しない。

```ts
type PageContentV0 =
  | { kind: 'board'; placementIds: readonly string[] }
  | { kind: 'single'; placementId: string | null };
```

ページは一方だけを持つ。配置済みの `single` はちょうど一つの配置を参照し、参照先のツールがページ表示に対応していることを確認する。未配置は `placementId: null` で明示し、ホストが追加操作を表示する。通常の配置は一つのページに所属し、別ページで同じ設定を使う場合は別 placement から同じ instance を参照する。未配置の設定は従来どおり保持できる。

**ページ表示と設定の同一性は別。** ダッシュボードのページウィジェットは参照する instance の設定を使う。単独ツールを直接開く入口は既存の `standalone:<kind>` を使う。「配置したツールを拡大して開く」場合は元の instance を明示して引き継ぎ、独立画面の既定設定へ勝手に切り替えない。ページ／拡大表示でも既存 view を継続する場合は draft を保つ。

`single` の非表示は参照を残し、ホストが「このツールは非表示」と復帰操作を出す。空の画面になって戻せない状態を作らない。

**v0 の削除後規則:** 削除の三択いずれでも、そのページから配置を外す処理が確定したら同じローカル transaction で `single.placementId` を null にし、ページの ID・名前・種類は残す。参照切れやページの自動削除は作らない。別ページへの付け替えも、移動元を null にする変更と移動先への所属変更を一体で検証・保存する。各操作は関係する配置・ページ revision を再確認し、既存の config/data 削除規則は維持する。remote data の削除はローカル処理との分散 transaction を保証しない。import で参照切れを受け取った場合は不明な元データを保全して復旧案内を出し、正常な未配置状態と混同しない。

## 5. サイズ・固定・表示

定義の候補項目は `resizable`、`minSizeCssPx`、`preferredSizeCssPx`、任意の `maxSizeCssPx`。CSS px の寸法は**ウィジェット内容領域**を基準とする。Shell のヘッダー・枠・余白はホストが加算する。ボードの保存単位へ変換するのもホストで、Parts にグリッド座標を入れない。

配置には独立した `positionLocked`、`sizeLocked`、`visible` を持たせる案とする。未指定の初期値は順に false / false / true。旧データへの適用方法は移行で検証し、現行ストアへ未対応フィールドを直接追記しない。

| 操作 | 条件・規則 |
| --- | --- |
| 移動 | ボード編集モードで、ホストが対応し、`!positionLocked` |
| リサイズ | ボード編集モードで、ホストが対応し、`resizable && !sizeLocked` |
| 位置固定中のリサイズ | 基準位置を動かさない方向だけ許可。衝突する操作は拒否・制限し、他の固定配置を押し出さない |
| サイズ固定中の移動 | 許可。移動をサイズ固定に連動させない |
| 自動整列・他配置の移動 | ロックは保存レイアウトを変更する全経路で確認。固定配置の位置・サイズを巻き添え更新しない |
| 画面幅の変更 | 一時的な表示縮退は許可。ユーザーの保存レイアウトを書き換えず、必要ならスクロール等で操作可能性を保つ |
| ページ表示 | 本文領域のサイズに従う。ボード用の位置・サイズ操作を出さず、ボード用の保存値は保持する |
| 非表示 | 設定・データ・参照を保持。管理画面から再表示可能。削除の三択とは別操作 |

ボードの自由配置方式・行高・保存する高さ・列数は新 HTML との照合事項。現行の `position / width` を、例示の `x/y/w/h` に無検証で置換しない。本文が最小寸法に収まらないときも、必須のエラー・停止・確認・復帰操作へ到達できる表示を用意する。

## 6. パーツとテンプレート

テンプレートは**開発側で登録する構成**。同じ Parts を参照し、意味のある配置プリセットとバリアントを選ぶ。利用者向けの自由な部品エディターは今回の範囲に含めず、必要なら別に仕様化する。

- Parts の種類は既存の五種を再利用する。`Button / Text / Stack` 等の独立した第二スキーマを作らない。
- `field` は型付き draft key と change intent、`result` は型付きデータ key、`action` は登録済み actionId を参照する。文字列の式・関数本体・HTML は受け取らない。
- 複雑な時計盤・エディターは登録済み `custom` / 専用 View を使ってよい。全ツールをフォームへ押し込めない。
- templateId はツール内で一意。既定テンプレートを一つ持ち、パーツ ID はバリアント間で安定させる。欠落・重複参照は構成エラー。
- バリアントはまず既存の `compact / detailed` で表す。既定は compact。サイズ条件を明記した順で評価し、最初の一致を採用、未一致は既定へ戻る。具体的な閾値は各ツールのデザインで決める。
- 条件は画面全体でなく、ホストが割り当てた**内容領域の幅・高さ**。余白や並びだけなら CSS で変え、データや操作の構成が変わるときだけバリアント選択を使う。[MDN の container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) は実装候補の根拠であり、採用実装や高さの測定方式を固定しない。
- サイズ・テンプレート変更で controller、viewId、draft、実行 ID を再生成しない。非表示になる編集部品の値も controller に保持し、フォーカスを失う場合は対応する操作へ移す。
- 必須の validation / conflict / error、実行中の Stop、同意・破壊操作の確認は compact でも到達可能にする。サイズ変更・再描画は実行のトリガーにしない。

ユーザーが後で選べる見た目は、placement が `templateId` や許可した表示オプションだけを保存する。コード・部品ツリーのコピー・設定本文は保存しない。内部専用の型には不要な wire schema を作らず、保存や iframe 転送が始まる境界だけに検証と版を設ける。

未知のツール・テンプレート・将来版は元データを残した read-only placeholder にする。認識できない構成を既定値で上書き保存しない。

## 7. データソースと通信先

通信先は「URL を View に書く」形でなく、ツールが使う名前と実装を分ける。

| 項目 | 置き場所 | 天気の例 |
| --- | --- | --- |
| sourceId と adapterId の対応 | ツールの静的な source 定義 | `forecast` → 選定した天気アダプター |
| API の接続先・要求/応答の検証・認証参照 | first-party アダプター／ホストの通信設定 | 許可した接続先、timeout、キャンセル、応答の正規化 |
| ユーザーが選ぶ引数 | ツールの config | 地域・単位。入力を検証して要求へ変換 |
| 取得結果・取得時刻・再取得状態 | source のキャッシュと ViewModel | 前回の成功値、更新中、直近の更新失敗 |

外部 API のアダプターと、`targetRef.providerId` が表す**保存先**は別。天気 API を登録しても、設定が自動的に remote-enabled になったり MCP へ公開されたりしない。API キー・token はテンプレート、配置、通常の export に入れない。必要ならホスト側の資格情報参照を使用する。任意 URL を入力できる機能は、必要なツールで接続先の検証を別途決める。

初稿の天気例はセッション内キャッシュで十分とする**設計上の仮置き**。キーは adapter と版、source、正規化した引数、認証がある場合は利用者/接続の区別を含む。違う地域・単位・利用者の値を流用しない。認証値そのものをキーやログへ含めない。

設定の保存や要求の開始で要求世代を更新する。返答を反映する条件は、現在の view の寿命、要求世代、設定 revision / cache key が一致すること。同じ instance の別 view や新しい地域に、古い応答を上書きしない。共有キャッシュも key ごとの要求世代で書込みを保護し、同じ key の遅い旧要求が新しい成功値を上書きしない。共有リクエストは利用者を数え、最後の利用 view が離れたときだけ中断する。

認証が必要な source は、サインアウト・利用者変更・権限失効を検知したら該当キャッシュを表示対象から外し、接続/認可の世代も更新して古い応答の再格納を拒否する。同じ利用者 ID のまま権限が失効する場合も含む。再認証や設定の導線を出し、通信失敗時の stale 表示へ一律に流さない。

再取得は表示中の初回取得、明示的な更新、復帰時の鮮度判定を基本にする。周期取得は実際に必要な source にだけ追加し、間隔・backoff・上限を設定する。個別のデータソースが失敗した場合、成功している別ソースの値まで一律に隠さない。

永続キャッシュやアプリのオフライン起動は別の検証項目。現在 Service Worker のアプリ資産キャッシュは未実装であり、「前回データを表示できる」と「通信なしでアプリを起動できる」を同じ達成条件にしない。remote-enabled な保存先は既存契約どおり、オフライン時に draft を保っても暗黙の書込みキューは作らない。

## 8. 状態は組み合わせで表す

既存 `UiStatus = idle / working / ready / error` は実行の状態として維持する。`offline` や `empty` を同じ enum に追加して、全状態を排他的にしない。

| 独立した軸 | 値・意味 |
| --- | --- |
| 成功スナップショット | 未取得 / 正常な空 / 有効なデータ。成功の要求 key と取得時刻を持つ |
| 取得処理 | idle / working と invocationId。初回 loading と値を保持する refreshing はここから派生 |
| 最新の取得失敗 | なしか、安全な code / 表示メッセージ。通常の通信失敗では同じ key の閲覧可能な成功値を残す。認証・権限失効は表示停止を優先 |
| 鮮度 | fetchedAt と source の freshness policy から fresh / stale を計算。天気の観測・予報発表時刻は別のドメイン値 |
| 接続のヒント | unknown / online / offline。実際の API 到達可否や成功とは別 |
| 編集 | 既存の clean / dirty、baseRevision、外部更新・競合 |

**empty は検証済みの正常応答が空の場合だけ。** 不正な応答、timeout、未設定、未取得、権限不足を empty にしない。API ごとの空判定はアダプターが定義する。成功した空応答は、その要求 key の古いデータを置き換える。更新成功は直近の取得エラーを解除し、更新中はエラーを「前回の失敗」として扱う。

| 例 | 主表示 | 付加表示／操作 |
| --- | --- | --- |
| 未取得＋取得中 | loading | 処理を止められる場合の停止 |
| 正常応答が空 | empty | 対象や設定の説明、必要なら更新 |
| 未取得＋取得失敗 | データ取得エラー | 再試行、設定の確認 |
| 有効データ＋再取得中 | 前回データ | 更新中、最終成功時刻 |
| 古いデータ＋更新失敗＋offline | 前回データ | 古いこと・更新失敗・接続ヒントを併記 |
| 未取得＋offline | 保存済みデータなし | 設定と再試行の導線。空の予報とは表示しない |

`navigator.onLine` はヒントであり、API 到達性の証明でも操作禁止条件でもない。これだけで再試行やローカル機能を無効にしない。[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)

状態の見た目は共有 Feedback / Shell が既定を提供し、ツールは必要な文言・補助表示だけを足す。各ツールへ loading / error 等の空ファイルを大量生成しない。

## 9. 処理・スクリプト・通知・寿命

UI の `actionId` は typed intent。controller が必要に応じて application service と既存 Operation を呼ぶ。`operationId`、MCP の公開範囲、認証・許可は別に判定する。表示できることや `network: true` の宣言だけで権限を与えない。

スクリプトウィジェットは **入力 / Run / Stop / 再実行 / 結果 / logs / error / elapsed** を表現する。編集するスクリプトは専用の draft / 明示的に保存する tool data とし、テンプレートに埋めるイベントハンドラーや登録モジュールとして扱わない。実行は明示的な Run のみ。表示・リサイズ・import・再接続でコードを実行しない。

他のツールから Script Part として再利用する場合も、同じ typed intent と実行サービスの境界を使う。部品を配置したこと自体では通信・ストレージ等の権限を増やさない。

実際の実行方式・制限・隔離は既存 [#16](https://github.com/clockcrockwork/Tool-Dashboard/issues/16) で検証する。v0 の例は UI 状態のスタブを許容するが、安全な実行基盤が完成した証拠にはしない。Stop は処理の強制停止要求で、一時停止・再開を意味しない。停止が確認されてから停止済みを表示する。

| 契機 | controller / host の扱い |
| --- | --- |
| サイズ・配置・テーマ変更 | 同じ view の draft・結果・実行 ID を保つ。再実行しない |
| ページ離脱・非表示で view を破棄 | dirty draft の保存/破棄/離脱中止を明示し、無断で捨てない。実行中なら停止する旨も示す |
| 破棄が確定 | timer / observer / subscription を解放。専有する通信と処理を中断し、遅い応答を無効化 |
| 同じ source を他の view が利用 | 一方の破棄で共有取得・購読を全停止しない |
| 再表示 | committed config と有効なキャッシュから開始。実行コードを再開・再実行しない |

本案の時計・天気・スクリプトは view の寿命を基本とし、バックグラウンド実行は含めない。将来タイマー等が非表示でも仕事を継続する場合は、データモデルと独立した service の寿命をその機能で決める。キャンセルは、すでに完了した保存や外部の副作用を取り消した証拠にはならない。

利用者向け通知は最初はアプリ内。通常の更新失敗はウィジェット内 feedback、ユーザー操作の完了・重要な失敗はホストが必要に応じて通知する。イベントは source / view / invocation の識別、code、severity、通知の重複排除 key を持ち、再描画のたびに発火しない。定期更新失敗でトーストを連発しない。データ更新の購読イベントは再読込みシグナルであり、利用者向け通知や自動実行の要求とは別。OS 通知・Push は必要な機能で許可と非対応時の UX を別途設計する。

## 10. ファイル・テンプレートの持ち方

| 関心 | 既存／追加候補 | 作るタイミング |
| --- | --- | --- |
| ツール登録 | 現 `src/tools/<kind>/definition.ts` と catalog | 既存を拡張。第二の登録一覧を作らない |
| 設定 | 将来 `src/tools/<kind>/config.ts` | 現 repository 内の Zod を切り出す必要が出たとき。default・移行も同じ所有者 |
| 処理 | 現 `hex.ts` 等、必要なら `operations.ts` | 処理があるツールだけ |
| 構成 | 将来 `src/tools/<kind>/presentation.ts` | typed Parts と template/variant をまとめる必要が出たとき |
| UI | 現 `src/web/ToolView.vue`、必要に応じて tool 別 View | 専用 UI が必要なとき。UI の import は Web 側から行う |
| 通信 | host adapter と tool の source 宣言 | 最初の API 型ツールで実装・検証するとき |
| 状態例 | 実コンポーネントの Storybook stories | [#18](https://github.com/clockcrockwork/Tool-Dashboard/issues/18) に従って実コンポーネントと一緒に |

この表は全フォルダーに全ファイルを作る雛形ではない。短い定義は一ファイルでよい。`definition.ts` から UI component、重いエディターや実行系を eager import しない。Web の loader が宣言に対応する UI を必要時に読み、Operation を使う server bundle に UI を混ぜない。フレームワークは確定済みの **Vue 3 + Vite + TypeScript** に接続する。比較 [#17](https://github.com/clockcrockwork/Tool-Dashboard/issues/17) は not planned として終了しており、本案の前提条件へ戻さない。

「テンプレート」は三つを区別する。実行時に選ぶ**表示構成**は presentation、開発時に参考にする**追加手順**はこの文書と既存 dev 契約、見た目・操作の**見本**は Design Pattern Gallery / Storybook。ソースを三重に複製しない。

## 11. 検証と移行の境界

構造の検証、ID 参照の整合、画面の使いやすさは別の検証になる。

1. Zod: 外部入力・保存値の型、範囲、未知版。既存の正本を再利用し、JSON Schema が必要なら生成する。[Zod 公式](https://zod.dev/json-schema)
2. 構成チェック: 対応画面、single の最大一件と明示的な空状態、所属・参照先、重複 ID、型付き binding / action、サイズの min ≤ preferred ≤ max、バリアントの既定・優先順。
3. 操作確認: 同一設定を開く二つの draft、独立ロック、サイズ切替中の入力・実行、状態の組合せ、通知・資源解放。

現行 Placement は未知のキーを含むと更新・移動・削除を安全側で拒否する。新しいロックや表示設定を追加する実装は、repository・export/import・旧版復元を一緒に変更し、独立した保存形式の版と移行を決める。現 export は v3。v0 文書の追加だけで保存版を増やさない。

未知の config / template / kind / 将来版は原文を保持。自動 reset は行わない。削除の三択、共有データを巻き込まないこと、revision の再確認は既存契約に従う。旧 v1 import の非表示配置は保存済み config/raw として保全する現挙動であり、新しい `visible` と同一実装だったとは扱わない。

## 12. 今回の確定範囲と次の判断

**今回の成果物:** 既存構造へ接続した v0 設計案、時計・天気・スクリプトの記述例、HTML と実装を確認する受け入れ条件。

**照合後に詰める項目:** ページ単一表示の実際の導線、ボードの配置単位・高さ、各ツールの最小サイズと内容切替、編集 draft を守る離脱 UI、各 source の鮮度・キャッシュ期間。

**既存の別課題:** スクリプト実行方式 [#16](https://github.com/clockcrockwork/Tool-Dashboard/issues/16)、Vue の実コンポーネントの Storybook [#18](https://github.com/clockcrockwork/Tool-Dashboard/issues/18)。データ同期・第三者プラグイン・汎用ページビルダーはこの設計から自動的に実装範囲へ加えない。
