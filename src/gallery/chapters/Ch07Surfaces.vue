<script setup lang="ts">
/**
 * 7章 面と枠。部品シート #surf を写したもの。
 * ウィジェットの枠（WidgetFrame）と下部バー（BottomNav）は本物の Vue 部品で描く。
 * シート・置かずに使う帯・全画面ウィジェット・固定の印は、まだプロトタイプのクラスを付けた素の要素。
 */
import Icon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import PendingWidget from '../../app/shell/PendingWidget.vue';
import BottomNav from '../../app/shell/BottomNav.vue';
import { GIC } from '../icons';
import { boards, solo, type DashSetup } from '../dash';
import DashScope from '../parts/DashScope.vue';
import PatternSection from '../parts/PatternSection.vue';
import ThemeStages from '../parts/ThemeStages.vue';
import { setNotifyAsk } from '../../app/runtime/notify';
import { ALARM_ASK } from '../../widgets/alarm/alarm';
import { setRecAsk } from '../../widgets/recorder/status';

/** 1マス 170×150px の見本の箱に、そのウィジェットだけを置いた Dashboard。 */
const only = (id: string, more?: DashSetup): DashSetup => d => { solo(d, id, [1, 1]); more?.(d); };
const veil: DashSetup = d => { d.g.gs.veil = true; d.setCfg('memo', 'veil', true); };
const offline: DashSetup = d => { d.ui.online = false; };
/** 人前では隠すが優先: 失敗の状態でも覆いを作らない（review #6）。 */
const veilErr: DashSetup = d => { d.g.gs.veil = true; d.setCfg('weather', 'veil', true); };
const STATES = [
  ['s-load', '読み込み', '', '', ''],
  ['s-stale', '更新中', '', '', ''],
  ['s-empty', '空', 'まだ何もありません', '接続する', ''],
  ['s-err', '失敗', '取得できませんでした', 'もう一度', '最終更新 09:42'],
] as const;
/** 許可のお願い（共通の許可のお願いが `perm` の種類の枠に出す。仕様書 4章「許可のお願い」）. 通知は共通の通知から. */
const askAlarm: DashSetup = d => { setNotifyAsk(d, 'alarm', 'ask', ALARM_ASK); };
const noAlarm: DashSetup = d => { setNotifyAsk(d, 'alarm', 'no', ALARM_ASK); };
/** マイク（録音）: 共通の許可のお願い（`askPerm(d, id, 'mic', …)`）。文は録音が渡す（保存すると言わない）. */
const askMic: DashSetup = d => { setRecAsk(d, 'recorder', 'ask'); };
const noMic: DashSetup = d => { setRecAsk(d, 'recorder', 'no'); };
const navNormal: DashSetup = d => { boards(d, 4); };
const navSecond: DashSetup = d => { boards(d, 4); d.ui.page = 1; };
const navEdit: DashSetup = d => { boards(d, 4); d.ui.edit = true; };
const navMany: DashSetup = d => { boards(d, 12); d.ui.page = 2; };
</script>

<template>
  <section id="surf" class="ch"><h2>7. 面と枠</h2>
    <PatternSection id="s-w" title="ウィジェットの枠" code=".w" kind="vue">
      <template #use>ガラスの面。中身は14pxの余白の内側に置く。見える見出しは持たない。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><DashScope :prepare="only('clock')"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="clock"><div class="in"><div class="num" style="font-size: 2.2rem; font-weight: 200">10:24</div></div></WidgetFrame></div></div></DashScope></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('todo')"><div class="snapf edit" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="todo"><div class="in"><span class="cap">TODO</span></div></WidgetFrame></div><div class="selring wxr" /></div></DashScope></div><figcaption>編集中・選択</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('memo', veil)"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="memo"><div class="in"><span>メモの中身</span></div></WidgetFrame></div></div></DashScope></div><figcaption>人前では隠す</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('rss')"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="rss"><div class="in"><span class="cap">RSS</span></div></WidgetFrame></div></div></DashScope></div><figcaption>未接続の印</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('rss', offline)"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="rss"><div class="in"><span class="cap">RSS</span></div></WidgetFrame></div></div></DashScope></div><figcaption>オフラインの印</figcaption></figure>
        <figure v-for="st in STATES" :key="st[0]" class="smp"><div class="box"><DashScope :prepare="only('weather')"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="weather" :state-class="st[0]" :st-msg="st[2]" :st-act="st[3]" :st-sub="st[4]"><div class="in"><div class="num" style="font-size: 2.2rem; font-weight: 200">18°</div></div></WidgetFrame></div></div></DashScope></div><figcaption>{{ st[1] }}（{{ st[0] }}）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('weather', veilErr)"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><WidgetFrame id="weather" state-class="s-err" st-msg="取得できませんでした" st-act="もう一度" st-sub="最終更新 09:42"><div class="in"><div class="num" style="font-size: 2.2rem; font-weight: 200">18°</div></div></WidgetFrame></div></div></DashScope></div><figcaption>隠す＋失敗（覆いを出さない）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('alarm')"><div class="snapf" style="width: 344px; height: 150px"><div class="snapi"><PendingWidget id="alarm" /></div></div></DashScope></div><figcaption>準備中（未実装の種類）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('alarm')"><div class="snapf" style="width: 170px; height: 150px"><div class="snapi"><PendingWidget id="alarm" /></div></div></DashScope></div><figcaption>準備中（1×1: 薄く残してトースト）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('alarm', askAlarm)"><div class="snapf" style="width: 344px; height: 150px"><div class="snapi"><WidgetFrame id="alarm"><div class="in" /></WidgetFrame></div></div></DashScope></div><figcaption>許可のお願い（通知。共通の通知が出す）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('alarm', noAlarm)"><div class="snapf" style="width: 344px; height: 150px"><div class="snapi"><WidgetFrame id="alarm"><div class="in" /></WidgetFrame></div></div></DashScope></div><figcaption>許可のお願い（断られたとき）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('recorder', askMic)"><div class="snapf" style="width: 344px; height: 150px"><div class="snapi"><WidgetFrame id="recorder"><div class="in" /></WidgetFrame></div></div></DashScope></div><figcaption>許可のお願い（マイク。共通の許可のお願いが出す）</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="only('recorder', noMic)"><div class="snapf" style="width: 344px; height: 150px"><div class="snapi"><WidgetFrame id="recorder"><div class="in" /></WidgetFrame></div></div></DashScope></div><figcaption>許可のお願い（マイク・断られたとき）</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd>枠は <code>role="group"</code> で、見えない見出し（登録名）で名付ける。</dd></div><div><dt>大きさ</dt><dd>1マス 170×150px（標準の密度）を基準に、横1〜4、縦1〜3。</dd></div><div><dt>状態</dt><dd>オフラインの印と、状態の覆い（読み込み・更新中・空・失敗）は部品シートの 12章 の見本を、枠の部品だけで並べたもの。</dd></div></dl>
    </PatternSection>
    <PatternSection id="s-sheet" title="シート" code=".sheet" kind="markup">
      <template #use>設定、一覧、追加、操作ヒント。見出しの行、節の見出し、設定の行でできている。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="sheet shx"><div class="sh"><button class="bk"><Icon :d="IC.back" />設定</button><span class="st">表示</span><button class="nb"><Icon :d="IC.close" /></button></div><div class="sl">外観</div><div class="fld"><span>ダーク</span><button class="sw on " role="switch" aria-checked="true"><span class="tr"><span class="kn" /></span></button></div><div class="fld"><span>ガラスの透明感</span><input class="rg" type="range" value="60"></div><div class="sl">データ</div><div style="display: flex; gap: 8px; flex-wrap: wrap"><button class="chip">書き出し（コピー）</button><button class="chip">ファイルに保存</button></div></div></div><figcaption>構成</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>置き場所</dt><dd>PCは右（設定で左）、スマホは下。ウィジェットの設定だけは暗幕を敷かず、ほかのウィジェットを押せる。</dd></div><div><dt>動き</dt><dd>下から10pxと不透明度で、0.25秒（<code>--dur-4</code>）ease-out で出る。</dd></div><div><dt>背後</dt><dd>暗幕を敷くシートでは背後に <code>inert</code>。閉じたら開いたボタンへフォーカスを戻す。</dd></div></dl>
    </PatternSection>
    <PatternSection id="s-nav" title="下部バーと画面の点" code=".nav / .dot" kind="vue">
      <template #use>ホームへ、画面の切替、一覧・編集・設定。これ以上ボタンを足さない。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><DashScope :prepare="navNormal"><BottomNav /></DashScope></div><figcaption>下部バー（ホーム）</figcaption></figure>
        <figure class="smp wd"><div class="box"><DashScope :prepare="navSecond"><BottomNav /></DashScope></div><figcaption>2画面目</figcaption></figure>
        <figure class="smp wd"><div class="box edit"><DashScope :prepare="navEdit"><BottomNav /></DashScope></div><figcaption>編集モード</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>ホーム</dt><dd>左端の ⌂ と <kbd>Home</kbd> キーで、どのボードからも1手で戻る。ホームでは押せない。</dd></div><div><dt>点</dt><dd>今の画面は横長、画面いっぱいにしたウィジェット（時計・スケッチ）は中抜き。押せる領域は 24×44px。</dd></div><div><dt>読み上げ</dt><dd>画面を送ったら「ボード 2、3 / 6」。2画面以上にまたがるボードは、ツールチップで「ボード 1-2」、読み上げで「ボード 1の2」。</dd></div></dl>
    </PatternSection>
    <PatternSection id="s-tmp" title="置かずに使う帯" code=".tmpbar" kind="markup">
      <template #use>置かずに開いているときだけ、下に出る。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="tmpbar open toast" style="position: relative; left: auto; bottom: auto; translate: none; padding: 0 4px 0 18px"><span class="tx">置かずに使っています</span><button class="chip pri">このボードに追加</button><button class="chip" style="background: none">閉じる</button></div></div><figcaption>帯</figcaption></figure>
      </ThemeStages>
    </PatternSection>
    <PatternSection id="s-fsw" title="全画面ウィジェット" code=".fsw" kind="markup">
      <template #use>大きさを「全画面」にしたウィジェットの共通の形。ツールが変わっても、場所と役割は変えない。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="fswx"><div class="fsw-bg" style="background: radial-gradient(60% 70% at 30% 40%, var(--g2), transparent 70%), radial-gradient(50% 60% at 75% 60%, var(--g4), transparent 70%)" /><div class="fsw-main" style="padding: 24px 8px 30px; gap: 8px"><div class="num" style="font-size: 44px; font-weight: 200; line-height: .9">09:41</div><div style="width: 90px; height: 2px; border-radius: 2px; background: var(--fill2)" /><span class="chip sm" style="pointer-events: none">11.20 金</span></div><div class="fsw-act" style="top: 8px; right: 8px"><button class="btn" style="width: 32px; height: 32px"><Icon :d="GIC.pause" /></button></div></div></div><figcaption>時計（中身・背景・右上の操作）</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="fswx"><svg class="fsw-surf" aria-hidden="true" /><Icon class="fsw-hint" :d="IC.pen" style="width: 28px; height: 28px" /><div class="bbar fsw-bar" style="bottom: 8px; height: 36px"><button class="abb on" style="width: 32px; height: 32px"><span style="display: block; width: 6px; height: 6px; border-radius: 9px; background: currentColor" /></button><button class="abb" style="width: 32px; height: 32px"><Icon :d="IC.undo" /></button><button class="abb" style="width: 32px; height: 32px"><Icon :d="GIC.trash" /></button></div></div></div><figcaption>スケッチ（面・下の帯・空の案内）</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>外枠 .fsw</dt><dd>面（ガラス）を持たない。<code>data-w</code> はツールのID、名前はツールの名前のまま。編集中は点線の枠、中身は押せない。</dd></div><div><dt>背景 .fsw-bg</dt><dd>任意。画面の端まで。動くものは表示中だけ動かし、右上に止めるボタン。動きを減らす設定では止める。</dd></div><div><dt>中身 .fsw-main</dt><dd>切り欠き＋64px と下部バーの分を空けて中央に。大きさは <code>cqw</code> <code>cqh</code>。</dd></div><div><dt>面 .fsw-surf</dt><dd>描く・なぞるツールだけ。画面いっぱいに敷き、指の横移動で画面を送らない。</dd></div><div><dt>右上 .fsw-act</dt><dd>1〜2個の丸ボタン。通信するツールの接続の点もここ。</dd></div><div><dt>下の帯 .fsw-bar</dt><dd>入力補助の帯。下部バーのすぐ上に浮かせる。</dd></div><div><dt>空の案内 .fsw-hint</dt><dd>まだ何もないときだけ、アイコン1つ。文字は出さない。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-wmk" title="編集中の固定の印" code=".wmk" kind="markup">
      <template #use>編集中に、位置を固定・大きさを固定・人前では隠すにしたウィジェットの右上に出す。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><div class="w wx"><div class="wmk"><Icon :d="IC.pin" :size="14" /><Icon :d="IC.lock" :size="14" /><Icon :d="IC.eyeOff" :size="14" /></div><div class="in"><span class="cap">TODO</span></div></div></div><figcaption>印</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>出すとき</dt><dd>編集中だけ。ふだんは出さない。</dd></div><div><dt>読み上げ</dt><dd>印は見た目だけ。状態は設定パネルのスイッチと、その他メニューのチェックで伝える。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-pager" title="画面が多いときの表示" code=".pgc" kind="vue">
      <template #use>画面の点は7つまで。8画面以上（または点が入りきらない幅）では点の代わりに「3 / 12」と進み具合の線を出し、押すと一覧を開く。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><DashScope :prepare="navMany"><BottomNav /></DashScope></div><figcaption>8画面以上</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>操作</dt><dd>左右の送りは今と同じ（スワイプ、矢印、数字キー）。押すと一覧を開き、ボードの並びに移る。</dd></div><div><dt>読み上げ</dt><dd>「ボード 3、3 / 12」。</dd></div></dl>
    </PatternSection>
  </section>
</template>
