<script setup lang="ts">
/**
 * 8章 そのほかの部品。部品シート #spec を写したもの。
 * 本物の部品: その他メニュー（MenuLayer）、折りたたみの節（CollapseSection）。
 * ドロップ受け・ファイル行（画像変換）・コード欄（スクリプト）・時間の帯（日の出）は P2 のウィジェットに属するのでクラスだけ。
 * 一覧の行（AddSheet の中）・件数のバッジ（受け渡しの未読）・キーの表示もクラスだけ。
 */
import { reactive } from 'vue';
import Icon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';
import CollapseSection from '../../app/parts/CollapseSection.vue';
import MenuLayer from '../../app/shell/overlays/MenuLayer.vue';
import { GIC } from '../icons';
import type { DashSetup } from '../dash';
import DashScope from '../parts/DashScope.vue';
import PatternSection from '../parts/PatternSection.vue';
import ThemeStages from '../parts/ThemeStages.vue';

/** TODO のその他メニュー（大きさを固定・人前では隠すがオン）。位置は台の中に置くので 0。 */
const todoMenu: DashSetup = d => {
  d.g.lockSz = { ...d.g.lockSz, todo: true };
  d.setCfg('todo', 'veil', true);
  d.ui.mnAt = { l: 0, t: 0, w: 0, h: 0, rw: 1000, rh: 1000, al: '' };
  d.ui.mn = { kind: 'widget', id: 'todo', x: 0, y: 0, origin: '0 0', dock: '' };
};
const open = reactive({ ai: false, data: true });
</script>

<template>
  <section id="spec" class="ch"><h2>8. そのほかの部品</h2>
    <p class="lead2">ウィジェット固有だがほかでも使えるように切り出した部品と、メニュー・バッジ・キーの表示・折りたたみの節。</p>
    <PatternSection id="x-drop" title="ドロップ受け" code=".drop" kind="markup">
      <template #use>ファイルを受け取る。中身は file 入力を包んだ label で、キーボードとタップでも選べる。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><span class="drop full" style="width: 200px"><Icon :d="GIC.image" :size="28" />画像をドロップ</span></div><figcaption>空</figcaption></figure>
        <figure class="smp"><div class="box"><span class="drop" style="width: 200px"><Icon :d="IC.plus" />画像を追加</span></div><figcaption>項目あり</figcaption></figure>
        <figure class="smp"><div class="box"><span class="drop over" style="width: 200px"><Icon :d="IC.plus" />ここに放す</span></div><figcaption>重ねている</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>受け口</dt><dd>ウィジェット全体。重ねている間は枠を実線、<code>--a1</code> で薄く塗る。</dd></div></dl>
    </PatternSection>
    <PatternSection id="x-frow" title="ファイル行" code=".frow" kind="markup">
      <template #use>処理するファイル1件。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="frow" style="width: 300px"><span class="fth" style="background: linear-gradient(160deg, var(--w1), var(--w2))" /><div class="cn"><b>海辺.jpg</b><span>4.8 MB・変換中</span><span class="prg"><i style="scale: .64 1" /></span></div><button class="nb" aria-label="取り消す"><Icon :d="IC.close" :size="16" /></button></div></div><figcaption>処理中</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="frow" style="width: 300px"><span class="fth" style="background: linear-gradient(160deg, var(--w2), var(--w1))" /><div class="cn"><b>ロゴ.webp</b><span>184 KB → 71 KB（−61%）</span></div><button class="nb" aria-label="保存"><Icon :d="GIC.download" /></button><button class="nb" aria-label="取り除く"><Icon :d="IC.close" :size="16" /></button></div></div><figcaption>完了</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="frow err" style="width: 300px"><span class="fth" /><div class="cn"><b>IMG_2041.heic</b><span>このブラウザでは読み込めない形式です</span></div><button class="nb" aria-label="取り除く"><Icon :d="IC.close" :size="16" /></button></div></div><figcaption>エラー</figcaption></figure>
      </ThemeStages>
    </PatternSection>
    <PatternSection id="x-code" title="コード欄と出力" code=".jse / .jcon" kind="markup">
      <template #use>スクリプト。色分けした行を、透明にした入力欄の下に重ねる。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="jse" style="width: 360px; height: 108px; flex: none"><div class="jsg"><div><div>1</div><div>2</div><div class="err">3</div></div></div><div class="jsc"><div class="jshl"><div><div class="jl"><span class="jc">// 大文字にして返す</span></div><div class="jl"><span class="jk">const</span> s = <span class="jb">input</span>.<span class="jf">trim</span>();</div><div class="jl err"><span class="jk">return</span> s.<span class="jf">toUpperCase</span>(x);</div></div></div></div></div></div><figcaption>コード欄</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="jcon" style="width: 360px; flex: none"><div class="jcl"><div class="jlg info"><Icon :d="GIC.info" /><span class="x">入力: クリップボード（12文字）</span></div><div class="jlg"><Icon d="M7 10l5 5 5-5" style="rotate: -90deg" /><span class="x">件数 3</span><span class="m num">+4ms</span></div><div class="jlg err"><Icon d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" /><span class="x">3行目　ReferenceError: x is not defined</span><button class="jlb">3行目へ</button></div></div></div></div><figcaption>出力</figcaption></figure>
      </ThemeStages>
    </PatternSection>
    <PatternSection id="x-band" title="時間の帯" code=".sunb / 雨の棒" kind="markup">
      <template #use>1日や数時間を横の帯で見せる。傘と日の出・日の入りで同じ骨組み。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div style="width: 260px"><span class="sunb" style="display: block; background: linear-gradient(90deg, var(--fill2) 0 23%, var(--sun-t) 23% 26%, var(--sun-d) 26% 69%, var(--sun-t) 69% 71%, var(--fill2) 71% 100%)"><span class="tk" style="left: 25%" /><span class="tk" style="left: 50%" /><span class="tk" style="left: 75%" /><span class="nw" style="left: 61%" /></span></div></div><figcaption>日の出・日の入り</figcaption></figure>
        <figure class="smp"><div class="box"><div class="rbx"><span style="height: 8%" /><span style="height: 8%" /><span style="height: 8%" /><span style="height: 30%" /><span style="height: 70%" /><span style="height: 100%" /><span style="height: 50%" /><span style="height: 18%" /><span style="height: 8%" /><span style="height: 8%" /><span style="height: 8%" /><span style="height: 8%" /></div></div><figcaption>雨（12時間）</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd>帯は <code>role="img"</code> で、時刻と今の状態を文にした名前を付ける。</dd></div></dl>
      <p class="pnote">雨の棒の本物は傘のウィジェット（<code>RainWidget</code>、9章・Storybook の Widgets/RainWidget）の中にある。</p>
    </PatternSection>
    <PatternSection id="x-crow" title="一覧の行" code=".crow" kind="markup">
      <template #use>「ウィジェットを追加」の1行。名前を押すとその場所へ、▶ で置かずに使う、＋ で追加。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="crow" style="width: 320px"><button class="cnb"><span class="ckm on"><Icon :d="IC.check" /></span><span class="cnm">TODO</span></button><button class="nb" aria-label="置かずに使う"><Icon :d="IC.play" :size="16" style="fill: currentColor; stroke: none" /></button></div></div><figcaption>置いてある</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="crow" style="width: 320px"><button class="cnb"><span class="ckm"><Icon :d="IC.check" /></span><span class="cnm">日の出・日の入り</span><span class="newdot" /></button><button class="nb" aria-label="置かずに使う"><Icon :d="IC.play" :size="16" style="fill: currentColor; stroke: none" /></button><button class="nb ad" aria-label="追加"><Icon :d="IC.plus" /></button></div></div><figcaption>未配置・新しい</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd>状態（未配置、配置済みとボード名、新しい）は見えない文で名前に添える。</dd></div></dl>
      <p class="pnote">本物は「ウィジェットを追加」のシート（<code>AddSheet</code>、Storybook の Shell/Sheets）の中にある。</p>
    </PatternSection>
    <PatternSection id="n-menu" title="その他メニュー（ウィジェットの操作）" code=".mnu[role=menu]" kind="mix">
      <template #use>編集にしなくても、そのウィジェットの操作を出す。帯の右端の「…」、マウスの右クリック、タッチの長押しで開く。帯のボタンがあふれたときの置き場所も兼ねる。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><DashScope :prepare="todoMenu"><MenuLayer /></DashScope></div><figcaption>メニュー</figcaption></figure>
        <figure class="smp wd"><div class="box"><div class="ab show" style="margin: 0; width: 230px"><button class="abb" aria-label="再生"><Icon :d="IC.play" style="fill: currentColor; stroke: none" /></button><button class="abb" aria-label="更新"><Icon :d="IC.reload" /></button><span class="abs" /><button class="abb" aria-label="その他" aria-haspopup="menu"><Icon :d="GIC.more" /></button></div></div><figcaption>帯のあふれ（クラスだけ）</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>あふれ方</dt><dd>優先度の低いボタン（<code>.abb.lo</code>）は、ウィジェットの幅が560px以下のとき「…」の中へ移す。表・スクリプト・画像変換が対象。</dd></div><div><dt>危険な操作</dt><dd>最後に区切って <code>--bad</code>。</dd></div><div><dt>開き方</dt><dd>マウスは右クリック（文字を選んでいるときと入力欄の中はブラウザのメニュー）。タッチは0.7秒の長押しで、ツールチップ（0.48秒）を出したまま押し続けたらメニューに切り替える。キーボードは <code>Shift</code>+<code>F10</code> かメニューキー。編集中は出さない。</dd></div><div><dt>読み上げ</dt><dd><code>role="menu"</code> と <code>menuitem</code>。開くボタンに <code>aria-haspopup="menu"</code>。</dd></div></dl>
      <p class="pnote">メニューは本物（TODO の行: 設定・位置を固定・大きさを固定・人前では隠す・ボードから外す）。押すと本物の操作が走ってメニューが閉じる。原本の見本の「人前では隠す」のホバーの塗りは付けていない。</p>
    </PatternSection>
    <PatternSection id="n-badge" title="件数のバッジ" code=".bdg" kind="markup">
      <template #use>未読の数（受け渡し、届いたもの）。下部バーの一覧ボタンと、その行に付ける。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><span class="bdgw"><button class="nb" aria-label="一覧、未読3件"><Icon :d="IC.grid" /></button><span class="bdg">3</span></span></div><figcaption>数</figcaption></figure>
        <figure class="smp"><div class="box"><span class="bdgw"><button class="nb" aria-label="一覧、未読99件以上"><Icon :d="IC.grid" /></button><span class="bdg">99+</span></span></div><figcaption>多い</figcaption></figure>
        <figure class="smp"><div class="box"><span style="display: inline-flex; align-items: center; gap: 8px">受け渡し<span class="bdg st">2</span></span></div><figcaption>行の中</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd>ボタンの名前に件数を含める（「一覧、未読2件」）。バッジ自体は <code>aria-hidden</code>。</dd></div></dl>
      <p class="pnote">本物は下部バー（<code>BottomNav</code>）の一覧ボタンに付く。11章「いつもの画面」で受け渡しの未読2件を入れて見せている。</p>
    </PatternSection>
    <PatternSection id="n-kbd" title="キーの表示" code="kbd" kind="markup">
      <template #use>操作ヒントと、ツールチップ（一覧 <kbd>/</kbd>・編集 <kbd>E</kbd>・設定 <kbd>,</kbd>）でキーを示す。1文字のキー操作を切ったら出さない。ボタンには <code>aria-keyshortcuts</code>。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><kbd>Esc</kbd></div><figcaption>単独</figcaption></figure>
        <figure class="smp"><div class="box"><span><kbd>Ctrl</kbd> + <kbd>Enter</kbd></span></div><figcaption>組み合わせ</figcaption></figure>
        <figure class="smp"><div class="box"><span>一覧は <kbd>/</kbd> キーで開きます</span></div><figcaption>文の中</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>決まり</dt><dd>Mac では <kbd>⌘</kbd>、ほかでは <kbd>Ctrl</kbd> を出し分ける。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-disc" title="折りたたみの節" code=".dsc" kind="vue">
      <template #use>全体の設定（外観、レイアウト、操作、ローカルAI、表示テスト、データ）。節ごとに開閉し、開いている節をこの端末に覚える。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="sheet shx" style="width: 300px"><CollapseSection title="ローカルAI" :open="open.ai" @toggle="open.ai = !open.ai"><p class="cap" style="margin: 4px 0 8px">（中身は全体の設定の「ローカルAI」）</p></CollapseSection><CollapseSection title="データ" :open="open.data" @toggle="open.data = !open.data"><div style="display: flex; gap: 8px; padding: 4px 0 8px"><button class="chip">書き出し（コピー）</button></div></CollapseSection></div></div><figcaption>閉じた節と開いた節</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd>見出しの中のボタンに <code>aria-expanded</code>。</dd></div><div><dt>既定</dt><dd>外観とレイアウトだけ開く。開け閉めは「元に戻す」の対象にしない。</dd></div></dl>
    </PatternSection>
  </section>
</template>
