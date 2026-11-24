# ウィジェットの記録: 保存しないもの・大きな記録・表示中だけ更新

P2 で記録を持つウィジェットを足すときの決まり（実装ガイド 6章・7.5・8章、仕様書 3章「段階表示」、review #7）。手順の全体はスキル `lgd-add-widget`。

## 保存しないもの

次のものは `cfg`・`data`（区画 `w:<配置ID>`）にも、非同期の記録の保存先（`src/app/store/records.ts`）にも入れない。書き出しにも出ない。

| 分類 | 例 |
| --- | --- |
| 画面の一時状態 | 開いているシート、今の画面、前面表示、再生中かどうか、プレビュー／編集の切り替え、カーソルやスクロールの位置 |
| 録音 | 録音した音声（録音） |
| 画像変換 | 変換する画像の一覧と画像（画像変換） |
| 現在地 | 取得した位置（日の出・日の入り、天気、傘） |
| スクリプトの結果 | 実行結果・出力（スクリプト） |
| 会話 | 「会話を保存」がオフのときの会話、生成途中の応答（AIチャット） |
| 鍵・認証情報 | API キー、トークン、ペアリングの鍵（受け渡し） |

書き方:

- 一時状態は部品の中の `ref`、または `src/widgets/<kind>/status.ts` の runtime（Dashboard ごとの `WeakMap`、天気が見本）に置く。`WidgetDataDef` の型に入れない。
- 記録と一緒に持つが保存しないものは `toSaved` で外す。`sanitize` は知らない項目を捨てるので、復元・読み込みでも入らない。

  ```ts
  export const chatData: WidgetDataDef<ChatData> = {
    version: 1,
    initial: () => ({ log: [], draft: null }),
    sanitize: raw => /* 知らない項目を捨てて組み立て直す */,
    // 会話保存オフなら空、生成途中の応答（draft）は常に外す
    toSaved: (d, cfg) => ({ log: cfg('keep') === false ? [] : d.log }),
  };
  ```

- テストを書く: 一時状態の項目を足した値を `sanitize` に通すと消えること、`toSaved` の結果に入らないこと（`src/widgets/saved.test.ts` に種類を足す）。

## 大きな記録

画像・会話・表・スクリプトのように大きくなる記録（受け渡し・AIチャット・表・スクリプト）は localStorage に入れず、`RecordStore`（`get`・`set`・`delete`・`keys(prefix)`、IndexedDB）に置く。キーは配置 ID で始める（`table#2:cells`）。同じキーへの書き込みは後勝ちで、失敗は Promise の reject と `onError` で届くので、黙らずに知らせる。書き出しへの含め方は各分類で決める。

## 表示中だけ更新

取得・更新・ポーリングは `isShown(d, 配置ID)`（`src/app/store/visibility.ts`）が真の間だけ行う。見本は天気（`weather/status.ts` の `useWeatherTiers`）: 出ている段だけ取りに行く、取ったデータは保持するが出ていない段は更新しない、表示されたときに古ければ取り直す、止めた後に届いた古い応答は捨てる、unmount で timer を止める。
