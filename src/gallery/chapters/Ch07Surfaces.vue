<script setup lang="ts">
/**
 * 7章 面と枠。部品シート #surf を写したもの。
 * ウィジェットの枠（WidgetFrame）と下部バー（BottomNav）は本物の Vue 部品で描く。
 * シート・置かずに使う帯・全画面ウィジェット・固定の印は、まだプロトタイプのクラスを付けた素の要素。
 */
import Icon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';
import { GIC } from '../icons';
import PatternSection from '../parts/PatternSection.vue';
import Stages from '../parts/Stages.vue';
</script>

<template>
  <section class="ch" id="surf"><h2>7. 面と枠</h2>
    <PatternSection id="s-w" title="ウィジェットの枠" code=".w" kind="markup">
      <template #use>ガラスの面。中身は14pxの余白の内側に置く。見える見出しは持たない。</template>
      <Stages>
        <figure class="smp"><div class="box"><div class="w wx"><div class="in"><div class="num" style="font-size: 2.2rem; font-weight: 200">10:24</div></div></div></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><div class="wx-wrap"><div class="w wx" style="outline: 2px dashed var(--fill2); outline-offset: -3px"><div class="in"><span class="cap">TODO</span></div></div><div class="selring wxr" /></div></div><figcaption>編集中・選択</figcaption></figure>
        <figure class="smp"><div class="box"><div class="w wx veil"><div class="in"><span>メモの中身</span></div><div class="veilc"><Icon :d="IC.eyeOff" /><button class="chip sm">表示する</button></div></div></div><figcaption>人前では隠す</figcaption></figure>
        <figure class="smp"><div class="box"><div class="w wx"><span class="cdot" /><div class="in"><span class="cap">RSS</span></div></div></div><figcaption>未接続の印</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>読み上げ</dt><dd>枠は <code>role="group"</code> で、見えない見出し（登録名）で名付ける。</dd></div><div><dt>大きさ</dt><dd>1マス 170×150px（標準の密度）を基準に、横1〜4、縦1〜3。</dd></div></dl>
    </PatternSection>
    <PatternSection id="s-sheet" title="シート" code=".sheet" kind="markup">
      <template #use>設定、一覧、追加、操作ヒント。見出しの行、節の見出し、設定の行でできている。</template>
      <Stages>
        <figure class="smp wd"><div class="box"><div class="sheet shx"><div class="sh"><button class="bk"><Icon :d="IC.back" />設定</button><span class="st">表示</span><button class="nb"><Icon :d="IC.close" /></button></div><div class="sl">外観</div><div class="fld"><span>ダーク</span><button class="sw on " role="switch" aria-checked="true"><span class="tr"><span class="kn" /></span></button></div><div class="fld"><span>ガラスの透明感</span><input class="rg" type="range" value="60"></div><div class="sl">データ</div><div style="display: flex; gap: 8px; flex-wrap: wrap"><button class="chip">書き出し（コピー）</button><button class="chip">ファイルに保存</button></div></div></div><figcaption>構成</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>置き場所</dt><dd>PCは右（設定で左）、スマホは下。ウィジェットの設定だけは暗幕を敷かず、ほかのウィジェットを押せる。</dd></div><div><dt>動き</dt><dd>下から10pxと不透明度で、0.25秒（<code>--dur-4</code>）ease-out で出る。</dd></div><div><dt>背後</dt><dd>暗幕を敷くシートでは背後に <code>inert</code>。閉じたら開いたボタンへフォーカスを戻す。</dd></div></dl>
    </PatternSection>
    <PatternSection id="s-nav" title="下部バーと画面の点" code=".nav / .dot" kind="markup">
      <template #use>ホームへ、画面の切替、一覧・編集・設定。これ以上ボタンを足さない。</template>
      <Stages>
        <figure class="smp wd"><div class="box"><nav class="nav navx"><button class="nb" disabled><Icon :d="IC.home" /></button><button class="nb"><Icon :d="IC.grid" /></button><div class="dots"><button class="dot on"><span /></button><button class="dot"><span /></button><button class="dot pg"><span /></button><button class="dot"><span /></button></div><button class="nb"><Icon :d="IC.pen" /></button><button class="nb"><Icon :d="IC.sliders" /></button></nav></div><figcaption>下部バー</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>ホーム</dt><dd>左端の ⌂ と <kbd>Home</kbd> キーで、どのボードからも1手で戻る。ホームでは押せない。</dd></div><div><dt>点</dt><dd>今の画面は横長、画面いっぱいにしたウィジェット（時計・スケッチ）は中抜き。押せる領域は 24×44px。</dd></div><div><dt>読み上げ</dt><dd>画面を送ったら「ボード 2、3 / 6」。2画面以上にまたがるボードは、ツールチップで「ボード 1-2」、読み上げで「ボード 1の2」。</dd></div></dl>
    </PatternSection>
    <PatternSection id="s-tmp" title="置かずに使う帯" code=".tmpbar" kind="markup">
      <template #use>置かずに開いているときだけ、下に出る。</template>
      <Stages>
        <figure class="smp wd"><div class="box"><div class="tmpbar open toast" style="position: relative; left: auto; bottom: auto; translate: none; padding: 0 4px 0 18px"><span class="tx">置かずに使っています</span><button class="chip pri">このボードに追加</button><button class="chip" style="background: none">閉じる</button></div></div><figcaption>帯</figcaption></figure>
      </Stages>
      
    </PatternSection>
    <PatternSection id="s-fsw" title="全画面ウィジェット" code=".fsw" kind="markup">
      <template #use>大きさを「全画面」にしたウィジェットの共通の形。ツールが変わっても、場所と役割は変えない。</template>
      <Stages>
        <figure class="smp wd"><div class="box"><div class="fswx"><div class="fsw-bg" style="background: radial-gradient(60% 70% at 30% 40%, var(--g2), transparent 70%), radial-gradient(50% 60% at 75% 60%, var(--g4), transparent 70%)" /><div class="fsw-main" style="padding: 24px 8px 30px; gap: 8px"><div class="num" style="font-size: 44px; font-weight: 200; line-height: .9">09:41</div><div style="width: 90px; height: 2px; border-radius: 2px; background: var(--fill2)" /><span class="chip sm" style="pointer-events: none">11.20 金</span></div><div class="fsw-act" style="top: 8px; right: 8px"><button class="btn" style="width: 32px; height: 32px"><Icon :d="GIC.pause" /></button></div></div></div><figcaption>時計（中身・背景・右上の操作）</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="fswx"><svg class="fsw-surf" aria-hidden="true" /><Icon class="fsw-hint" :d="IC.pen" style="width: 28px; height: 28px" /><div class="bbar fsw-bar" style="bottom: 8px; height: 36px"><button class="abb on" style="width: 32px; height: 32px"><span style="display: block; width: 6px; height: 6px; border-radius: 9px; background: currentColor" /></button><button class="abb" style="width: 32px; height: 32px"><Icon :d="IC.undo" /></button><button class="abb" style="width: 32px; height: 32px"><Icon :d="GIC.trash" /></button></div></div></div><figcaption>スケッチ（面・下の帯・空の案内）</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>外枠 .fsw</dt><dd>面（ガラス）を持たない。<code>data-w</code> はツールのID、名前はツールの名前のまま。編集中は点線の枠、中身は押せない。</dd></div><div><dt>背景 .fsw-bg</dt><dd>任意。画面の端まで。動くものは表示中だけ動かし、右上に止めるボタン。動きを減らす設定では止める。</dd></div><div><dt>中身 .fsw-main</dt><dd>切り欠き＋64px と下部バーの分を空けて中央に。大きさは <code>cqw</code> <code>cqh</code>。</dd></div><div><dt>面 .fsw-surf</dt><dd>描く・なぞるツールだけ。画面いっぱいに敷き、指の横移動で画面を送らない。</dd></div><div><dt>右上 .fsw-act</dt><dd>1〜2個の丸ボタン。通信するツールの接続の点もここ。</dd></div><div><dt>下の帯 .fsw-bar</dt><dd>入力補助の帯。下部バーのすぐ上に浮かせる。</dd></div><div><dt>空の案内 .fsw-hint</dt><dd>まだ何もないときだけ、アイコン1つ。文字は出さない。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-wmk" title="編集中の固定の印" code=".wmk" kind="markup">
      <template #use>編集中に、位置を固定・大きさを固定・人前では隠すにしたウィジェットの右上に出す。</template>
      <Stages>
        <figure class="smp"><div class="box"><div class="w wx"><div class="wmk"><Icon :d="IC.pin" :size="14" /><Icon :d="IC.lock" :size="14" /><Icon :d="IC.eyeOff" :size="14" /></div><div class="in"><span class="cap">TODO</span></div></div></div><figcaption>印</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>出すとき</dt><dd>編集中だけ。ふだんは出さない。</dd></div><div><dt>読み上げ</dt><dd>印は見た目だけ。状態は設定パネルのスイッチと、その他メニューのチェックで伝える。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-pager" title="画面が多いときの表示" code=".pgc" kind="markup">
      <template #use>画面の点は7つまで。8画面以上（または点が入りきらない幅）では点の代わりに「3 / 12」と進み具合の線を出し、押すと一覧を開く。</template>
      <Stages>
        <figure class="smp wd"><div class="box"><nav class="nav navx"><button class="nb"><Icon :d="IC.grid" /></button><button class="pgc"><b class="num">3</b><span class="num">/ 12</span><i class="pgm"><i style="width: 25%" /></i></button><button class="nb"><Icon :d="IC.pen" /></button><button class="nb"><Icon :d="IC.sliders" /></button></nav></div><figcaption>8画面以上</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>操作</dt><dd>左右の送りは今と同じ（スワイプ、矢印、数字キー）。押すと一覧を開き、ボードの並びに移る。</dd></div><div><dt>読み上げ</dt><dd>「ボード 3、3 / 12」。</dd></div></dl>
    </PatternSection>
  </section>
</template>
