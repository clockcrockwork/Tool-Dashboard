<script setup lang="ts">
/**
 * 6章 知らせる・待つ。部品シート #feedback を写したもの。
 * 本物の部品: トースト・オフラインの帯（ToastStack）、知らせの帯（TopBars）、ダイアログ（DialogLayer）、
 * 最初の案内（TourCard）、接続の点（WidgetFrame）。見本ごとに別の Dashboard（DashScope）で状態を入れて描く。
 * 編集中の帯（DashboardRoot の中の素の要素）・待つ間の表示・印・空の表示・ツールチップ・許可のお願い・ウィジェット内の知らせはクラスだけ。
 */
import Icon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';
import ToastStack from '../../app/shell/ToastStack.vue';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import TopBars from '../../app/shell/overlays/TopBars.vue';
import DialogLayer from '../../app/shell/overlays/DialogLayer.vue';
import TourCard from '../../app/shell/overlays/TourCard.vue';
import { DIALOG_SAMPLES, showNotice } from '../../app/store/overlays';
import type { Toast } from '../../app/store/types';
import { VEILED_TOAST } from '../../app/runtime/notify';
import { GIC } from '../icons';
import { solo, type DashSetup } from '../dash';
import DashScope from '../parts/DashScope.vue';
import PatternSection from '../parts/PatternSection.vue';
import ThemeStages from '../parts/ThemeStages.vue';

const toast = (text: string, kind: Toast['kind'], act = false): DashSetup => d => {
  d.ui.toasts = [{ id: 1, text, kind, act: act ? { label: '元に戻す', fn: () => { d.undo(); } } : null }];
};
const TOASTS = [
  ['知らせ', toast('URLをコピーしました', 'info')],
  ['完了', toast('ファイルに保存しました', 'ok')],
  ['注意', toast('保存できませんでした', 'warn')],
  ['操作つき', toast('「メモ」を削除しました', 'info', true)],
  // 人前では隠している配置の知らせ（共通の通知、p2a-followup.md 2章）: どの種類でも同じ文で、名前・時刻・内容を出さない.
  ['伏せた通知', toast(VEILED_TOAST, 'info')],
] as const;
const upd: DashSetup = d => { d.ui.upd = true; };
const received: DashSetup = d => {
  showNotice(d, { d: GIC.image, text: 'iPhone から画像が届きました', al: '受け取る', act: () => { d.toast('受け取りました（見本）', 'ok'); }, t: d.now() });
};
const offline: DashSetup = d => { d.ui.toasts = []; d.ui.online = false; };
const confirmDlg: DashSetup = d => { d.ui.dlg = DIALOG_SAMPLES.confirm(d); };
const alertDlg: DashSetup = d => { d.ui.dlg = DIALOG_SAMPLES.alert(); };
const tour2: DashSetup = d => { d.ui.tour = 1; };
const net = (id: string, more?: DashSetup): DashSetup => d => { solo(d, id, [1, 1]); more?.(d); };
const goOffline: DashSetup = d => { d.ui.online = false; };
</script>

<template>
  <section id="feedback" class="ch"><h2>6. 知らせる・待つ</h2>
    <PatternSection id="n-toast" title="トースト" code=".toast" kind="vue">
      <template #use>操作の結果を短く知らせる。画面上部（設定で下部）に積む。</template>
      <ThemeStages>
        <figure v-for="t in TOASTS" :key="t[0]" class="smp"><div class="box"><DashScope :prepare="t[1]"><ToastStack /></DashScope></div><figcaption>{{ t[0] }}</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>時間</dt><dd>知らせは設定の秒数（既定3秒）、操作つきは10秒。ポインタやフォーカスが乗っている間は消さない。</dd></div><div><dt>読み上げ</dt><dd><code>role="status"</code> の入れ物に入れる。フォーカスは移さない。</dd></div><div><dt>動き</dt><dd>上から12pxと不透明度で、0.2秒（<code>--dur-3</code>）ease-out で出入りする。</dd></div></dl>
      <p class="pnote">本物の印は、知らせ＝ベル（文字色）・完了＝丸にチェック（<code>--a1</code>）・注意＝三角（<code>--a2</code>）。原本の見本の「知らせ」は丸に i（<code>--a1</code>）。</p>
    </PatternSection>
    <PatternSection id="n-bar" title="知らせの帯" code=".rcv" kind="vue">
      <template #use>利用者の判断が要る知らせ（受け取り確認、新しい版）。時間で消えない。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><DashScope :prepare="upd"><TopBars /></DashScope></div><figcaption>新しい版</figcaption></figure>
        <figure class="smp wd"><div class="box"><DashScope :prepare="received"><TopBars /></DashScope></div><figcaption>受け取り</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>重ね方</dt><dd>2本出るときは縦に重ねる。最初の案内の間は出さない。</dd></div><div><dt>読み上げ</dt><dd><code>role="status"</code>。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-pill" title="状態の帯" code=".epill / .offp" kind="mix">
      <template #use>今の状態を示すだけの帯。押せない。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><div class="epill open">編集中　ウィジェットをタップして設定</div></div><figcaption>編集中（クラスだけ）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="offline"><ToastStack /></DashScope></div><figcaption>オフライン</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>置き場所</dt><dd>画面上部。ウィジェットの領域の外に置き、フォーカスした要素を覆わない。</dd></div></dl>
      <p class="pnote">編集中の帯は <code>DashboardRoot</code> の中の素の要素で、本物の文言は「編集中：ウィジェットをタップすると設定できます」。オフラインの帯は本物（<code>ToastStack</code>）で、文言は「オフライン。前回の内容を表示しています」。</p>
    </PatternSection>
    <PatternSection id="n-wait" title="待つ間の表示" code=".skl / .sp / .prg / .pgb" kind="markup">
      <template #use>時間がかかるときの4種類。何をどれだけ待つかで使い分ける。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><div style="width: 220px; display: grid; gap: 8px"><div class="skl" style="height: 18px" /><div class="skl" style="height: 18px; width: 70%" /></div></div><figcaption>スケルトン（最初の読み込み）</figcaption></figure>
        <figure class="smp"><div class="box"><span class="sp" style="position: static; display: block" /></div><figcaption>スピナー（更新中）</figcaption></figure>
        <figure class="smp"><div class="box"><div style="width: 220px"><span class="prg" role="progressbar" aria-valuenow="64"><i style="scale: .64 1" /></span></div></div><figcaption>進捗バー（量が分かる）</figcaption></figure>
        <figure class="smp"><div class="box"><div class="pgbx"><div /></div></div><figcaption>読み込みの帯（ページ全体）</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>使い分け</dt><dd>中身の形が分かる最初の読み込み → スケルトン。前の内容を見せたまま新しくする → スピナー。量が分かる → 進捗バー。画面全体の切替 → 読み込みの帯。</dd></div><div><dt>動きを減らす</dt><dd>明滅、回転、横移動を止め、文字（「読み込み中」）で伝える。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-mark" title="印" code=".cdot / .dtag / .newdot" kind="markup">
      <template #use>状態を小さく添える。必ず読み上げ用の文字と組にする。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><span class="ps-mk"><span class="cdot" style="position: static" /></span></div><figcaption>未接続</figcaption></figure>
        <figure class="smp"><div class="box"><span class="ps-mk"><span class="cdot offl" style="position: static" /></span></div><figcaption>オフライン</figcaption></figure>
        <figure class="smp"><div class="box"><span>予定<span class="dtag">メモから</span></span></div><figcaption>タグ</figcaption></figure>
        <figure class="smp"><div class="box"><span style="display: inline-flex; align-items: center">日の出・日の入り<span class="newdot" /></span></div><figcaption>新しい</figcaption></figure>
      </ThemeStages>
    </PatternSection>
    <PatternSection id="n-empty" title="空の表示" code=".empt" kind="markup">
      <template #use>利用者が書きためるものが空のとき。何をすれば埋まるかを1行で。入口が同じ面に無ければボタンを1つ。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><p class="empt" style="margin: 0">上の欄に書いて Enter で追加します</p></div><figcaption>入口が同じ面にある</figcaption></figure>
        <figure class="smp"><div class="box"><div class="empt" style="margin: 0"><span>よく開くページを登録します</span><button class="chip sm">リンクを追加</button></div></div><figcaption>入口が別</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>置き場所</dt><dd>リストの位置の中央。</dd></div></dl>
      <p class="pnote">本物は TODO とクイックリンクのウィジェットの中にある（12章「TODO と 受け渡し」の最初の見本）。</p>
    </PatternSection>
    <PatternSection id="n-tip" title="ツールチップ" code=".tip" kind="markup">
      <template #use>アイコンだけのボタンの名前。マウスで0.55秒、タッチでは長押し。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><div class="tipx"><button class="nb is-hover" aria-label="設定"><Icon :d="IC.sliders" /></button><div class="tip open">設定</div></div></div><figcaption>表示</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>消し方</dt><dd><code>Esc</code> で消える。ツールチップの上にポインタを動かしても消えない（離れて0.25秒で消す）。</dd></div><div><dt>出さない</dt><dd>文字つきのボタン。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-dlg" title="ダイアログ" code=".dlg" kind="vue">
      <template #use>取り消せない操作の確認と、必ず読んでほしいお知らせ。それ以外はトーストか帯にする。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box g-foc-first"><DashScope :prepare="confirmDlg"><DialogLayer /></DashScope></div><figcaption>確認</figcaption></figure>
        <figure class="smp wd"><div class="box g-foc-first"><DashScope :prepare="alertDlg"><DialogLayer /></DashScope></div><figcaption>お知らせ</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>フォーカス</dt><dd>開いたら、取り消せない確認は「キャンセル」、お知らせは「閉じる」。閉じたら開いたボタンへ戻す。背後は <code>inert</code>。</dd></div><div><dt>キー</dt><dd><code>Esc</code> でキャンセル。</dd></div><div><dt>動き</dt><dd>不透明度 200ms。</dd></div></dl>
      <p class="pnote">押すと閉じる（本物の <code>dialogOk</code> / <code>dialogCancel</code>）。もう一度見るにはページを読み直す。Storybook の Shell/DialogLayer「試す」では開き直せます。</p>
    </PatternSection>
    <PatternSection id="n-tour" title="最初の案内" code=".tcard" kind="vue">
      <template #use>初回だけの5手順。対象のボタンを輪で示す。最後は環境ごとの「使い始めの準備」。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><DashScope :prepare="tour2"><TourCard /></DashScope></div><figcaption>手順</figcaption></figure>
      </ThemeStages>
      <p class="pnote">本物の2手順目の文は「「一覧」から目的のウィジェットへ移動できます。「ウィジェットを追加」には全部の道具が並び、置かずに使うこともできます。」（原本の見本は1文目だけ）。</p>
    </PatternSection>
    <PatternSection id="n-perm" title="許可のお願い" code=".perm" kind="markup">
      <template #use>現在地（日の出・日の入り）、マイク（録音）、通知（ポモドーロ）、クリップボード（スクリプト）。ブラウザの問い合わせを出す前に、なぜ要るかを説明する。断られたときの代わりの手段も出す。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="perm"><Icon :d="GIC.location" /><div><b>現在地を使いますか？</b><span>日の出・日の入りをこの場所で計算します。位置は端末の外に送りません。</span><div class="pa"><button class="chip pri">位置を使う</button><button class="chip" style="background: none">都市を選ぶ</button></div></div></div></div><figcaption>お願いする前</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="perm warnx"><Icon :d="GIC.mic" /><div><b>マイクを使えません</b><span>アドレスバー左のボタンで許可できます</span><div class="pa"><button class="chip">もう一度</button></div></div></div></div><figcaption>断られている</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>出す場所</dt><dd>そのウィジェットの中身の上に重ね、中身は隠す。トーストにしない。出たら最初のボタンにフォーカスを移す。</dd></div><div><dt>出すとき</dt><dd>現在地は場所に「現在地」を選んだとき。マイク・通知・クリップボードは、それを使う操作を初めて押したとき。</dd></div><div><dt>文言</dt><dd>何に使うか、どこに送らないか。断られたらブラウザでの直し方。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-net" title="通信と許可の出し方" code="登録の net / perm" kind="mix">
      <template #use>登録に <code>net</code> と <code>perm</code> があれば、ツールの中身に関係なく決まった場所に出す。ツールで別の出し方を作らない。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><DashScope :prepare="net('weather')"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="weather"><div class="in" style="flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 4px"><span class="cap">天気</span><div class="num" style="font-size: 1.6rem">21°</div></div></WidgetFrame></div></div></DashScope></div><figcaption>net: data（未接続）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="net('rss', goOffline)"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="rss"><div class="in" style="flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 4px"><span class="cap">RSS</span><span>前回の内容を表示中</span></div></WidgetFrame></div></div></DashScope></div><figcaption>net: data（オフライン）</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="w wx" style="width: 300px"><div class="in" style="justify-content: flex-start"><div style="display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 12px; border-radius: 14px; background: color-mix(in oklab, var(--a1) 14%, transparent)"><span class="cap" style="flex: 1">端末内で動くAIです。初回のみ約1.0GB</span><button class="chip sm pri">準備する</button></div></div></div></div><figcaption>net: dl（はじめてのダウンロード・クラスだけ）</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="w wx" style="width: 300px"><div class="in" style="justify-content: flex-end"><span class="cap" style="display: flex; align-items: center; gap: 6px"><Icon d="M3 6h12v9H3zM17 9h4v9h-4zM6 18h6" />2台とつながっています</span></div></div></div><figcaption>net: own（つながりが機能・クラスだけ）</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>net: data</dt><dd>接続の点を面の右上（全画面では <code>.fsw-act</code>）。未接続は輪、オフラインは <code>--a2</code> で塗る。点と組で読み上げ用の文。オフラインは前回の内容をそのまま出し、無ければ「失敗」の知らせ。</dd></div><div><dt>net: dl</dt><dd>面の上端に、大きさと「準備する」の帯。押すまで通信しない。</dd></div><div><dt>net: own</dt><dd>つながりの状態をツール自身の文で出す。接続の点は出さない。</dd></div><div><dt>perm</dt><dd>「許可のお願い」（上）を面の中身と置き換えて出す。1×1 はトースト。断られたら使える範囲で動かして理由を出す。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-note" title="ウィジェット内の知らせ" code=".note" kind="markup">
      <template #use>ウィジェットの中で続く状態の知らせ。形は1つ（印・文・操作1つ・色で重さ）にそろえ、置く場所だけを原因で決める。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><div class="note warn"><Icon :d="IC.toastWarn" /><div class="ntx"><span>クリップボードが空です</span></div><button class="jlb">手入力にする</button></div></div><figcaption>帯：注意</figcaption></figure>
        <figure class="smp"><div class="box"><div class="note info"><i class="nring" style="--p: 45" /><div class="ntx"><span>モデルを保存中 45%</span><span class="npb"><i style="width: 45%" /></span></div><button class="jlb">中止</button></div></div><figcaption>帯：待つ</figcaption></figure>
        <figure class="smp"><div class="box"><div class="note err"><Icon d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" /><div class="ntx"><span>RSS を読み込めませんでした</span></div><button class="jlb">もう一度</button></div></div><figcaption>帯：エラー</figcaption></figure>
        <figure class="smp"><div class="box"><div class="nbox"><div class="note warn nin"><Icon :d="IC.toastWarn" /><div class="ntx"><span>クリップボードが空です</span><span class="nsub">コピーしてから実行するか、手入力に切り替えます</span></div><button class="jlb">手入力にする</button></div></div></div><figcaption>欄の中</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="nwid"><div class="nfull"><Icon :d="GIC.location" /><b>現在地を使えません</b><p class="cap">ブラウザの位置情報が許可されていません</p><div class="pa"><button class="chip pri">都市を選ぶ</button><button class="chip">もう一度</button></div></div></div></div><figcaption>置き換え</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="toast"><Icon :d="IC.toastWarn" style="color: var(--a2)" /><span>天気：現在地を使えません</span><button class="chip" style="margin: -8px -12px -8px 4px; font-weight: 600; background: none">都市を選ぶ</button></div></div><figcaption>1×1 はトースト</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="tw"><table><thead><tr><th>原因</th><th>置く場所</th><th>大きさ</th><th>例</th></tr></thead><tbody><tr><td>入力が足りない・形が違う</td><td>その入力のすぐ下（入力欄の補足とエラー）</td><td>欄の中</td><td>アラームの時刻、税率</td></tr><tr><td>実行の結果が失敗した</td><td>結果の欄・一覧の行の中</td><td>欄の中</td><td>スクリプトの「クリップボードが空」、画像変換の「読めない形式」</td></tr><tr><td>ウィジェット全体が使えない</td><td>中身ごと置き換える</td><td>置き換え</td><td>現在地を使えない、未接続、許可が要る</td></tr><tr><td>使えるが、待つ・気をつける</td><td>操作の帯のすぐ上</td><td>帯</td><td>AIの準備中、古いデータを表示中</td></tr><tr><td>1×1 で入りきらない</td><td>トーストに出す（ウィジェット名を頭に付ける）</td><td>トースト</td><td>「天気：現在地を使えません」＋都市を選ぶ</td></tr></tbody></table></div></div><figcaption>置く場所の決まり</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="tw"><table><thead><tr><th>部品</th><th>置く場所</th></tr></thead><tbody><tr><td>状態の文（<code>.stm</code>、空・失敗）</td><td>置き換え</td></tr><tr><td>許可のお願い（<code>.pmw</code>）</td><td>置き換え（見出し・説明・操作2つまで）</td></tr><tr><td>AIの準備の帯（<code>.ais</code>）</td><td>帯（待つ）</td></tr><tr><td>スクリプトのログの行（<code>.jlg</code>）、画像変換の失敗の行（<code>.frow.err</code>）</td><td>欄の中</td></tr><tr><td>予定の提案（<code>.sug</code>）</td><td>知らせではなく提案なので、このまま</td></tr></tbody></table></div></div><figcaption>今の部品との対応</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>色</dt><dd>情報＝青、注意＝橙、エラー＝赤。色だけに頼らず、印の形も変える。</dd></div><div><dt>操作</dt><dd>1つだけ。置き換えは2つまで（主な操作＋もう一度）。</dd></div><div><dt>1×1</dt><dd>トーストは消えるので、ウィジェットは中身を薄くして残し、押すと同じトーストをもう一度出す。同じ状態のあいだは1回だけ出す。</dd></div><div><dt>読み上げ</dt><dd>注意とエラーは <code>role="alert"</code>、待つは <code>role="status"</code>。置き換えは見出しにフォーカスを移さない。</dd></div></dl>
    </PatternSection>
  </section>
</template>
