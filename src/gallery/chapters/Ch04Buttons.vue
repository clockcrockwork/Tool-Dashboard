<script setup lang="ts">
/**
 * 4章 ボタン（.chip .chip.sm .btn .nb .abb .bk）。部品シート #btns を写したもの。
 * 今はボタンの部品コンポーネントが無いので、プロトタイプのクラスを付けた素の button で描いている。
 * アイコンは本物の LineIcon。ボタンの部品ができたら、この章の button をその部品に差し替える。
 */
import Icon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';
import { GIC } from '../icons';
import PatternSection from '../parts/PatternSection.vue';
import Stages from '../parts/Stages.vue';
</script>

<template>
  <section class="ch" id="btns"><h2>4. ボタン</h2>
    <PatternSection id="b-roles" title="役割で4つ" kind="markup">
      <template #use>ボタンは見た目の名前ではなく、役割で選びます。</template>
      
      <div class="tw"><table><thead><tr><th>役割</th><th>クラス</th><th>大きさ</th><th>塗りと状態</th></tr></thead><tbody><tr><td><b>① 文字のボタン</b></td><td><code>.chip</code>（大）<br><code>.chip.sm</code>・<code>.jlb</code>・<code>.pva</code>、帯や行の中のチップ（小）</td><td>大44px・小36px</td><td>通常は塗り。控えめ（<code>.gh</code>）は塗りなし、提案（<code>.sm</code>）は線だけ。選んでいる＝文字色、主な操作＝青、危険＝赤</td></tr><tr><td><b>② アイコンボタン</b></td><td><code>.btn</code>（塗りあり）<br><code>.nb</code>・<code>.abb</code>（塗りなし）</td><td>44×44px（帯の中は文字に合わせて横に伸びる）</td><td>オンの機能＝青</td></tr><tr><td><b>③ 選択の並び</b></td><td><code>.seg .sg</code></td><td>44px</td><td>選んでいる＝文字色</td></tr><tr><td><b>④ 行全体のボタン</b></td><td><code>.cnb</code>・<code>.mi</code>・<code>.dsc</code></td><td>48px（メニューの項目は44px）</td><td>ホバーで行を塗る。角丸12px</td></tr></tbody></table></div>
      <dl class="beh"><div><dt>共通</dt><dd>形は丸（行全体だけ12px）。ホバーはマウスのある端末だけで、主な操作・危険・オンも少し濃くなる。押すと0.96倍、無効は不透明度0.4。</dd></div><div><dt>色の意味</dt><dd>「選んでいる」（いくつかから1つ）は文字色の塗り、「オンの機能」（入れたり切ったり）は青。</dd></div><div><dt>大きさの決め方</dt><dd>大小は置き場所で決まる。帯や行の中のチップは自動で小になる。</dd></div></dl>
    </PatternSection>
    <PatternSection id="b-chip" title="チップ" code=".chip" kind="markup">
      <template #use>文字のボタンの基本形。シートの中の操作、ダイアログの選択、帯の主な操作に使う。</template>
      <Stages>
        <figure class="smp"><div class="box"><button class="chip">書き出し</button></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip is-hover">書き出し</button></div><figcaption>ホバー</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip is-press">書き出し</button></div><figcaption>押下</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip is-focus">書き出し</button></div><figcaption>フォーカス</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip on">ボード 1</button></div><figcaption>選択中</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip pri">再読み込み</button></div><figcaption>主な操作</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip bad">削除する</button></div><figcaption>危険な操作</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip" disabled>追加</button></div><figcaption>無効</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>操作</dt><dd>クリック、タップ、<code>Enter</code>、<code>Space</code>。</dd></div><div><dt>文言</dt><dd>何が起きるかの動詞で書く（「保存」でなく「ファイルに保存」）。トーストの完了の文言と同じ語を使う。</dd></div><div><dt>大きさ</dt><dd>大は高さ44px・左右16px。帯や行の中は小（高さ36px・左右12px）。</dd></div></dl>
    </PatternSection>
    <PatternSection id="b-chipsm" title="追加用の小チップ" code=".chip.sm" kind="markup">
      <template #use>「＋項目」「見本で試す」「表示する」など、提案や補助の控えめなボタン。塗らずに縁の線で示す。</template>
      <Stages>
        <figure class="smp"><div class="box"><button class="chip sm"><Icon :d="IC.plus" :size="16" />項目</button></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip sm on">クリップボード</button></div><figcaption>選択中</figcaption></figure>
        <figure class="smp"><div class="box"><button class="chip sm" disabled>見本で試す</button></div><figcaption>無効</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>大きさ</dt><dd>文字のボタンの「小」。高さ36px。</dd></div><div><dt>選択中</dt><dd>ほかの文字のボタンと同じく文字色で塗る。</dd></div></dl>
      <p class="pnote">縁の線は <code>--fill2</code> で薄めです。3:1 にするなら <code>--line</code> に寄せます。</p>
    </PatternSection>
    <PatternSection id="b-btn" title="丸いアイコンボタン" code=".btn" kind="markup">
      <template #use>ウィジェットの中の主な操作（再生、録音、TODOの追加）。塗りのある丸。</template>
      <Stages>
        <figure class="smp"><div class="box"><button class="btn" aria-label="再生"><Icon :d="IC.play" style="fill:currentColor;stroke:none" /></button></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><button class="btn is-hover"><Icon :d="IC.play" style="fill:currentColor;stroke:none" /></button></div><figcaption>ホバー</figcaption></figure>
        <figure class="smp"><div class="box"><button class="btn is-press"><Icon :d="IC.play" style="fill:currentColor;stroke:none" /></button></div><figcaption>押下</figcaption></figure>
        <figure class="smp"><div class="box"><button class="btn on"><Icon :d="GIC.mic" /></button></div><figcaption>オン</figcaption></figure>
        <figure class="smp"><div class="box"><button class="btn" disabled><Icon :d="IC.play" style="fill:currentColor;stroke:none" /></button></div><figcaption>無効</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>読み上げ</dt><dd>名前は動詞で（「再生」「録音を始める」）。オンとオフがあるものは <code>aria-pressed</code>。</dd></div><div><dt>大きさ</dt><dd>44×44px。</dd></div></dl>
    </PatternSection>
    <PatternSection id="b-nb" title="アイコンボタン（塗りなし）" code=".nb" kind="markup">
      <template #use>下部バー、シートの見出し、行の右端。塗りが無く、ホバーで塗る。</template>
      <Stages>
        <figure class="smp"><div class="box"><button class="nb"><Icon :d="IC.sliders" /></button></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><button class="nb is-hover"><Icon :d="IC.sliders" /></button></div><figcaption>ホバー</figcaption></figure>
        <figure class="smp"><div class="box"><button class="nb is-press"><Icon :d="IC.sliders" /></button></div><figcaption>押下</figcaption></figure>
        <figure class="smp"><div class="box"><button class="nb is-focus"><Icon :d="IC.sliders" /></button></div><figcaption>フォーカス</figcaption></figure>
        <figure class="smp"><div class="box"><button class="nb on"><Icon :d="IC.pen" /></button></div><figcaption>オン</figcaption></figure>
        <figure class="smp"><div class="box"><div class="crow" style="border: 0; min-height: 0"><button class="nb ad"><Icon :d="IC.plus" /></button></div></div><figcaption>追加（塗り）</figcaption></figure>
        <figure class="smp"><div class="box"><button class="nb hl"><Icon :d="IC.grid" /></button></div><figcaption>案内で強調</figcaption></figure>
        <figure class="smp"><div class="box"><button class="nb" disabled><Icon :d="GIC.trash" /></button></div><figcaption>無効</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>大きさ</dt><dd>44×44px。</dd></div><div><dt>ツールチップ</dt><dd>マウスで0.55秒止めると名前を出す（ツールチップの項）。</dd></div></dl>
    </PatternSection>
    <PatternSection id="b-abb" title="帯のボタン" code=".abb" kind="markup">
      <template #use>ウィジェットの下の帯（<code>.ab</code>）に並ぶ操作。アイコンか短い文字。</template>
      <Stages>
        <figure class="smp wd"><div class="box"><div class="ab show" style="margin: 0"><button class="abb"><Icon :d="IC.play" style="fill:currentColor;stroke:none" /></button><button class="abb is-hover"><Icon :d="IC.reload" /></button><button class="abb on"><Icon :d="IC.pen" /></button><span class="abs" /><button class="abb"><Icon :d="GIC.copy" /></button><button class="abb" disabled><Icon :d="GIC.trash" /></button></div></div><figcaption>並び</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>並べ方</dt><dd>左に主な操作と状態、右に補助の操作、右端に「大きく表示」。あふれたら「その他メニュー」（8章）にまとめる。</dd></div><div><dt>大きさ</dt><dd>幅44px以上、高さ44px、丸。</dd></div><div><dt>オン</dt><dd>ほかのアイコンボタンと同じく青（オンの機能）。</dd></div></dl>
    </PatternSection>
    <PatternSection id="b-bk" title="戻る" code=".bk" kind="markup">
      <template #use>シートの左上。行き先の名前を添える（「‹ 設定」）。閉じるのではなく1つ前の層に戻る。</template>
      <Stages>
        <figure class="smp"><div class="box"><button class="bk"><Icon :d="IC.back" />設定</button></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><button class="bk is-hover"><Icon :d="IC.back" />設定</button></div><figcaption>ホバー</figcaption></figure>
        <figure class="smp"><div class="box"><button class="bk is-focus"><Icon :d="IC.back" />設定</button></div><figcaption>フォーカス</figcaption></figure>
      </Stages>
      
      <dl class="beh"><div><dt>キー</dt><dd><code>Esc</code> でも同じ動き。</dd></div><div><dt>文言</dt><dd>戻る先の名前。一番上の層では「閉じる」</dd></div></dl>
    </PatternSection>
  </section>
</template>
