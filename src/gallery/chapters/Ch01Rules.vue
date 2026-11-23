<script setup lang="ts">
/** 1章 すべての部品に共通する決まり。部品シート #rules の表をそのまま写したもの（見本なし）。 */
</script>

<template>
  <section id="rules" class="ch"><h2>1. すべての部品に共通する決まり</h2>
    <p class="lead2">各部品の見本は、左がライト、右がダークです（上の「テーマ」で片方だけにできます）。</p>
    <h3 class="h3">ウィジェットの設計の原則</h3>
    <div class="tw"><table>
      <thead><tr><th>原則</th><th>決まり</th></tr></thead>
      <tbody>
        <tr><td><b>やりたいことは2〜3手</b></td><td>押す・入れる・選ぶを1手と数える（読む・スクロールは数えない）。主な操作はウィジェットの表面に置き、それ以外は右クリック・長押しのメニューへ。前回の値と既定値で1手目を省く。</td></tr>
        <tr><td>例外は+1手まで</td><td>初回だけの準備（端末をつなぐ、許可、AIの準備）と、取り消せない操作の確認。途中でやめても元の画面に戻れること。</td></tr>
        <tr><td>戻るのは1手</td><td>失敗や「使えない」状態からは、知らせのボタン1つで次へ進める（ウィジェット内の知らせ）。</td></tr>
        <tr><td><b>言葉は必要最低限</b></td><td>知らせは1文、25字が目安。何が起きたかだけを書き、どうするかはボタンの名前で伝える（「〜してください」を文で書かない）。謝らない。</td></tr>
        <tr><td>同じことを2回言わない</td><td>見出しと説明、ボタンと横の文が同じ内容なら片方を消す。印や数で分かることは文にしない。</td></tr>
        <tr><td>名前をそろえる</td><td>操作の名前と結果の知らせは同じ言葉（「保存」→「保存しました」）。同じものは画面が変わっても同じ名前。ボタンは動詞で2〜6字。繰り返すときは「もう一度」（条件を変えるなら「JPEGでもう一度」）。</td></tr>
        <tr><td>長い説明は操作ヒントへ</td><td>使い方の説明は「操作ヒント」と最初の案内にまとめ、ウィジェットの中には書かない。この2つは説明を求められる場なので、文の長さの目安は当てはめない。安心のための一言（「端末の外に送りません」）だけはウィジェットに残す。</td></tr>
      </tbody></table></div>
    <h3 class="h3">主な操作の手数</h3>
    <div class="tw"><table>
      <thead><tr><th>やりたいこと</th><th>手順</th><th>手数</th></tr></thead>
      <tbody>
        <tr><td>タイマーを始める</td><td>▶</td><td>1</td></tr>
        <tr><td>翻訳する</td><td>文を入れる → 翻訳</td><td>2</td></tr>
        <tr><td>スクリプトを実行する</td><td>スクリプトを選ぶ → 実行</td><td>2</td></tr>
        <tr><td>画像を変換して保存する</td><td>落とす → 保存</td><td>2</td></tr>
        <tr><td>ウィジェットの設定を変える</td><td>右クリック・長押し → 設定 → 変える</td><td>3</td></tr>
        <tr><td>ウィジェットの大きさを変える</td><td>編集 → ウィジェットを選ぶ → 大きさ</td><td>3</td></tr>
        <tr><td>失敗から戻る</td><td>知らせのボタン</td><td>1</td></tr>
        <tr><td>ホームへ戻る</td><td>⌂（<kbd>Home</kbd>）</td><td>1</td></tr>
        <tr><td>探して置く</td><td>一覧の検索に入力 → ＋</td><td>2</td></tr>
        <tr><td>時計やスケッチを全画面にする</td><td>編集 → ウィジェットを選ぶ → 全画面</td><td>3</td></tr>
        <tr><td>端末をつなぐ（初回）</td><td>設定 → 端末をつなぐ → コードを入れる → 確かめる</td><td>4（例外）</td></tr>
      </tbody></table></div>
    <h3 class="h3">部品の状態</h3>
    <div class="tw"><table>
      <thead><tr><th>状態</th><th>見た目</th><th>決まり</th></tr></thead>
      <tbody>
        <tr><td>通常</td><td>各部品の基本の見た目</td><td>—</td></tr>
        <tr><td>ホバー</td><td>塗りを1段濃く（<code>--fill</code> → <code>--fill2</code>、塗り無し → <code>--fill</code>）</td><td>マウスのある端末だけ（<code>@media (hover: hover)</code>）。タッチ端末で押したあとに残らないようにする</td></tr>
        <tr><td>押下</td><td>0.96倍に縮む（0.1秒）</td><td>押せるもの全部（チップ・アイコンボタン・帯のボタン・選択の並び・戻る・一覧の名前・大きさのマス）。動きを減らす設定では縮めない</td></tr>
        <tr><td>フォーカス</td><td>2px の <code>--a1</code> の輪郭、2px 外側</td><td>キーボードで来たときだけ（<code>:focus-visible</code>）。ガラスの上でも輪郭は不透明</td></tr>
        <tr><td>選択中</td><td>文字色で塗る（<code>.on</code>）。主な操作は <code>--a1</code></td><td><code>aria-pressed</code> か <code>aria-checked</code> と必ず組にする</td></tr>
        <tr><td>無効</td><td>不透明度0.4、ホバーと押下なし</td><td>すべての押せる部品で同じ。なぜ押せないかを近くに書けるときは書く</td></tr>
        <tr><td>押せる領域</td><td>高さは3つ：<code>--bh-s</code> 36px（帯や行の中）・<code>--bh</code> 44px（ふつう）・<code>--bh-r</code> 48px（行全体）。行の中の補助の印は24×24px以上</td><td>ボタン要素そのものを押せる大きさにし、見た目の点や丸は中に描く</td></tr>
      </tbody></table></div>
    <h3 class="h3">動きの決まり（トークン）</h3>
    <div class="tw"><table>
      <thead><tr><th>トークン</th><th>値</th><th>使う場所</th></tr></thead>
      <tbody>
        <tr><td><code>--dur-1</code></td><td>100ms</td><td>押した反応</td></tr>
        <tr><td><code>--dur-2</code></td><td>150ms</td><td>ホバーと色の変化</td></tr>
        <tr><td><code>--dur-3</code></td><td>200ms</td><td>小さな出入り（トースト、メニュー、スイッチのつまみ、画面の点）</td></tr>
        <tr><td><code>--dur-4</code></td><td>250ms</td><td>大きな面と量の変化（シート、ダイアログ、進み具合、グラフの棒）</td></tr>
        <tr><td><code>--ease</code></td><td><code>cubic-bezier(.2,.9,.3,1)</code></td><td>出るときの標準</td></tr>
        <tr><td><code>--ease-out</code></td><td><code>ease-out</code></td><td>消えるとき、進捗</td></tr>
      </tbody></table></div>
    <p class="pnote">動きは既定で止めておき、<code>prefers-reduced-motion: no-preference</code> のときだけ付けます。止めたときは、移動と拡大を使わず、必要なら0.12秒以内の不透明度の変化だけにします。繰り返しの動き（読み込みの帯、スケルトン、スピナー）は止め、文字で状態を伝えます。</p>
    <h3 class="h3">重なりの順（z-index）</h3>
    <div class="tw"><table>
      <thead><tr><th>層</th><th>値</th><th>もの</th></tr></thead>
      <tbody>
        <tr><td>ボード</td><td>0〜2</td><td>ウィジェット、選択の輪、状態の覆い</td></tr>
        <tr><td>知らせの帯・下部バー</td><td>7</td><td>受け取り・新しい版の帯、編集中の帯、下部バー</td></tr>
        <tr><td>シート・案内</td><td>8〜9</td><td>設定、一覧、追加、操作ヒント、最初の案内</td></tr>
        <tr><td>前面表示</td><td>21〜22</td><td>大きく表示したウィジェット、置かずに使う帯</td></tr>
        <tr><td>トースト</td><td>40</td><td>知らせ</td></tr>
        <tr><td>読み込みの帯</td><td>45</td><td>画面上端の細い帯</td></tr>
        <tr><td>ツールチップ</td><td>50</td><td>名前の吹き出し</td></tr>
        <tr><td>ダイアログ</td><td>59〜60</td><td>暗幕と確認</td></tr>
      </tbody></table></div>
  </section>
</template>
