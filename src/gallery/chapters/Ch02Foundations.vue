<script setup lang="ts">
/**
 * 2章 基礎（色・文字・面の段・角丸・影・アイコン）。部品シート #found を写したもの。
 * 見本はトークンを直接塗った箱（.tok .typ .rad .shd .ps-lvl）と、本物の線のアイコン（LineIcon）。
 */
import Icon from '../../app/parts/LineIcon.vue';
import { ICON_SAMPLES } from '../icons';
import PatternSection from '../parts/PatternSection.vue';
import ThemeStages from '../parts/ThemeStages.vue';
</script>

<template>
  <section id="found" class="ch"><h2>2. 基礎</h2>
    <PatternSection id="f-color" title="色" kind="markup">
      <template #use>色は役割の名前で使い、値を直接書かない。ライトとダークの値は <code>light-dark()</code> で1つのトークンに持つ。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="toks"><div class="tok"><i style="background: var(--bg)" /><b>--bg</b><span>地</span></div><div class="tok"><i style="background: var(--text)" /><b>--text</b><span>文字</span></div><div class="tok"><i style="background: var(--mut)" /><b>--mut</b><span>補助の文字</span></div><div class="tok"><i style="background: var(--line)" /><b>--line</b><span>輪郭</span></div><div class="tok"><i style="background: var(--fill)" /><b>--fill</b><span>部品の塗り</span></div><div class="tok"><i style="background: var(--fill2)" /><b>--fill2</b><span>濃い塗り</span></div><div class="tok"><i style="background: var(--a1)" /><b>--a1</b><span>アクセント</span></div><div class="tok"><i style="background: var(--a2)" /><b>--a2</b><span>第2のアクセント</span></div><div class="tok"><i style="background: var(--on-a)" /><b>--on-a</b><span>アクセントの上の文字</span></div><div class="tok"><i style="background: var(--bad)" /><b>--bad</b><span>危険・エラー</span></div><div class="tok"><i style="background: var(--hol)" /><b>--hol</b><span>祝日</span></div><div class="tok"><i style="background: var(--c1)" /><b>--c1</b><span>グラフ1</span></div><div class="tok"><i style="background: var(--c2)" /><b>--c2</b><span>グラフ2</span></div><div class="tok"><i style="background: var(--w1)" /><b>--w1</b><span>壁紙1</span></div><div class="tok"><i style="background: var(--w2)" /><b>--w2</b><span>壁紙2</span></div><div class="tok"><i style="background: var(--w3)" /><b>--w3</b><span>壁紙3</span></div><div class="tok"><i style="background: var(--w4)" /><b>--w4</b><span>壁紙4</span></div><div class="tok"><i style="background: var(--sun-d)" /><b>--sun-d</b><span>昼</span></div><div class="tok"><i style="background: var(--sun-t)" /><b>--sun-t</b><span>薄明</span></div></div></div><figcaption>トークン</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>決まり</dt><dd>補助の文字は面の上で4.5:1以上、輪郭は3:1以上（実装ガイド2章）。色だけで意味を伝えない（祝日は下線、エラーは文とアイコン）。</dd></div></dl>
    </PatternSection>
    <PatternSection id="f-type" title="文字" kind="markup">
      <template #use>大きさは8段のトークンだけ使う。主役の数字だけはコンテナ単位で、枠の大きさに合わせて伸び縮みする。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="typ"><div style="font-size: 3rem; font-weight: 200; line-height: 1" class="num">10:24</div><span>主役の数字（コンテナ単位で伸び縮み、200）</span></div><div class="typ"><div style="font-size: var(--fs-3xl)">つなぐ番号</div><span><code>--fs-3xl</code> 30px</span></div><div class="typ"><div style="font-size: var(--fs-2xl)">電卓の答え・録音の時間</div><span><code>--fs-2xl</code> 22px</span></div><div class="typ"><div style="font-size: var(--fs-xl)">シートの見出し・ウィジェットの数字</div><span><code>--fs-xl</code> 18px</span></div><div class="typ"><div style="font-size: var(--fs-l)">コードの入力・数のステッパー</div><span><code>--fs-l</code> 16px</span></div><div class="typ"><div style="font-size: var(--fs-b)">本文と操作の文字</div><span><code>--fs-b</code> 14px</span></div><div class="typ"><div style="font-size: var(--fs-m)">チップ・帯・行の補足</div><span><code>--fs-m</code> 13px</span></div><div class="typ"><div style="font-size: var(--fs-s)">補助の文字・キャプション</div><span><code>--fs-s</code> 12px</span></div><div class="typ"><div style="font-size: var(--fs-xs)">目盛りと曜日だけ</div><span><code>--fs-xs</code> 11px</span></div></div><figcaption>段階</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>決まり</dt><dd>Inter と Noto Sans JP。数字は等幅数字（<code>font-variant-numeric: tabular-nums</code>）。見出しは置かない（読み上げ用の見えない見出しは枠が持つ）。</dd></div></dl>
    </PatternSection>
    <PatternSection id="f-surface" title="面の段" kind="markup">
      <template #use>ガラスは3段だけ。中身の部品（入力欄、チップ）はガラスにしない。ガラスの上にガラスを重ねない。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="hrw"><div class="ps-lvl"><div class="w gl" /><span>ウィジェットの面<br><code>--glass</code></span></div><div class="ps-lvl"><div class="toast gl2" style="padding: 0" /><span>下部バー・トースト<br><code>--glass2</code></span></div><div class="ps-lvl"><div class="gl3" /><span>シート・ダイアログ<br><code>--sheet</code></span></div></div></div><figcaption>3段</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>決まり</dt><dd>ガラスはナビゲーションの層（ウィジェットの枠、下部バー、シート、トースト）だけ。縁の光は左上と右下だけに入れ、斜めの光沢は入れない。</dd></div></dl>
    </PatternSection>
    <PatternSection id="f-radius" title="角丸" kind="markup">
      <template #use>5段だけ使う。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="hrw"><div class="rad"><i style="border-radius: var(--rr)" /><span>ボタン・点・細い線<br><code>--rr</code> 丸</span></div><div class="rad"><i style="border-radius: var(--r4)" /><span>ウィジェット・シート・ダイアログ<br><code>--r4</code> 26px</span></div><div class="rad"><i style="border-radius: var(--r3)" /><span>メニュー・カード・吹き出し<br><code>--r3</code> 18px</span></div><div class="rad"><i style="border-radius: var(--r2)" /><span>入力欄・行・小さな面<br><code>--r2</code> 12px</span></div><div class="rad"><i style="border-radius: var(--r1)" /><span>キー・チェック・骨組みの線<br><code>--r1</code> 6px</span></div></div></div><figcaption>値</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>決まり</dt><dd>入れ子にするときは、外の角丸 − 余白 = 中の角丸 を目安にし、近い段に寄せる。ウィジェットだけは設定の「角の丸み」（<code>--rad</code>）に従う。</dd></div></dl>
    </PatternSection>
    <PatternSection id="f-shadow" title="影" kind="markup">
      <template #use>面の高さで3段。ガラスの縁（<code>--rim</code>）と組で使う。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="hrw"><div class="shd"><i style="box-shadow: var(--rim),var(--el1)" /><span>ウィジェット<br><code>--el1</code></span></div><div class="shd"><i style="box-shadow: var(--rim),var(--el2)" /><span>下部バー・トースト・メニュー・受け取りの帯<br><code>--el2</code></span></div><div class="shd"><i style="box-shadow: var(--rim),var(--el3)" /><span>シート・ダイアログ・案内のカード<br><code>--el3</code></span></div></div></div><figcaption>段</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>決まり</dt><dd>線や輪（入力欄の縁、フォーカス、選択の輪）は影ではなく線として扱う。スイッチやスライダーのつまみは <code>--knob</code>。</dd></div><div><dt>高い面ほど</dt><dd>影は広く薄くなる。重なりの順（z-index）と高さの段をそろえる。</dd></div></dl>
    </PatternSection>
    <PatternSection id="f-icon" title="アイコン" code=".i" kind="vue">
      <template #use>24の枠で線の太さ1.6、角は丸。20px で使い、帯の中では18px、行の中の小さな操作は16px。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="icns"><span v-for="[n, d] in ICON_SAMPLES" :key="n" class="icn" :title="n"><Icon :d="d" /></span></div></div><figcaption>見本</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd>アイコンには <code>aria-hidden="true"</code>。名前はボタンの側に付ける。短くてよいが、同じ名前で別のことをするボタンを作らない。</dd></div></dl>
    </PatternSection>
  </section>
</template>
