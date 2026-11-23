<script setup lang="ts">
/**
 * 5章 選ぶ・入れる。部品シート #inputs を写したもの。
 * 本物の部品: SegChoice・SwitchToggle・FieldRow・RangeInput・SizeGrid・SelectButton・NumStepper、選択メニューの中身は MenuLayer。
 * 入力欄・切替チップ・ウィジェットを探す・チェック・補足とエラー・日付と時刻は、部品が無いのでクラスだけ。
 * 見本は押すと動く（左右の台で値を共有する）。
 */
import { ref } from 'vue';
import Icon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';
import SegChoice from '../../app/parts/SegChoice.vue';
import SwitchToggle from '../../app/parts/SwitchToggle.vue';
import FieldRow from '../../app/parts/FieldRow.vue';
import RangeInput from '../../app/parts/RangeInput.vue';
import SizeGrid from '../../app/parts/SizeGrid.vue';
import SelectButton from '../../app/parts/SelectButton.vue';
import NumStepper from '../../app/parts/NumStepper.vue';
import MenuLayer from '../../app/shell/overlays/MenuLayer.vue';
import type { Dashboard } from '../../app/store/store';
import DashScope from '../parts/DashScope.vue';
import PatternSection from '../parts/PatternSection.vue';
import ThemeStages from '../parts/ThemeStages.vue';

const seg3 = ref('web');
const seg2 = ref('m');
const SEG3 = [['web', 'ウェブ'], ['img', '画像'], ['vid', '動画']] as const;
const SEG2 = [['pc', 'PC'], ['m', 'スマホ']] as const;
const swOff = ref(false);
const swOn = ref(true);
const swFocus = ref(false);
const swRow = ref(true);
const quality = ref(80);
const sz = ref<[number, number]>([2, 2]);
const full = ref(true);
const people = ref(4);
const peopleMin = ref(1);
const pct = ref(10);
const noop = (): void => undefined;

/** 開いた選択メニュー（日の出・日の入りの「場所」）。位置は台の中に置くので 0。 */
const openSelect = (d: Dashboard): void => {
  d.setCfg('sun', 'loc', '大阪');
  d.ui.mnAt = { l: 0, t: 0, w: 0, h: 0, rw: 1000, rh: 1000, al: '場所' };
  d.ui.mn = { kind: 'select', id: 'sunloc', x: 0, y: 0, origin: '0 0', dock: '' };
};
</script>

<template>
  <section id="inputs" class="ch"><h2>5. 選ぶ・入れる</h2>
    <PatternSection id="i-inp" title="入力欄" code=".inp" kind="markup">
      <template #use>1行の入力。検索、名前、URL。輪郭は <code>--line</code> の1px。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><input class="inp" placeholder="Googleで検索" style="width: 220px"></div><figcaption>空</figcaption></figure>
        <figure class="smp"><div class="box"><input class="inp" value="リキッドグラス" style="width: 220px"></div><figcaption>入力済み</figcaption></figure>
        <figure class="smp"><div class="box"><input class="inp is-focus" value="リキッドグラス" style="width: 220px"></div><figcaption>フォーカス</figcaption></figure>
        <figure class="smp"><div class="box"><input class="inp" disabled value="—" style="width: 220px; opacity: .4"></div><figcaption>無効</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>文字</dt><dd>スマホでは16px以上（入力時の拡大を防ぐ）。</dd></div><div><dt>名前</dt><dd>見える文言が無いときも <code>aria-label</code> を必ず付ける。プレースホルダーを名前の代わりにしない。</dd></div></dl>
    </PatternSection>
    <PatternSection id="i-seg" title="選択の並び" code=".seg / .sg" kind="vue">
      <template #use>同じ画面の見せ方を2〜4個から1つ選ぶ。5個以上や、利用者が作る項目は切替チップ（下）か選択メニュー（下）。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><SegChoice v-model="seg3" class="g-hov3" :options="SEG3" label="検索の種類" /></div><figcaption>3択</figcaption></figure>
        <figure class="smp"><div class="box"><SegChoice v-model="seg2" class="g-foc2" :options="SEG2" label="表示" /></div><figcaption>フォーカス</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd>並び全体に名前（<code>role="group"</code> と <code>aria-label</code>）、選んでいるものに <code>aria-pressed="true"</code>。</dd></div><div><dt>キー</dt><dd><code>Tab</code> で1つずつ移動。</dd></div></dl>
    </PatternSection>
    <PatternSection id="i-tgts" title="切替チップ" code=".tgts .chip" kind="markup">
      <template #use>利用者が作った項目（スクリプト、受け渡しの送り先）を切り替える横並び。あふれたら横にスクロールする。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div class="tgts" style="width: 300px"><button class="chip on" aria-pressed="true">大文字に</button><button class="chip">JSON整形</button><button class="chip">URLを分解</button><button class="chip sm" style="min-width: 36px; padding: 0 8px" aria-label="追加"><Icon :d="IC.plus" :size="16" /></button></div></div><figcaption>並び</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>大きさ</dt><dd>高さ36px。</dd></div></dl>
    </PatternSection>
    <PatternSection id="i-sw" title="スイッチ" code=".sw" kind="vue">
      <template #use>すぐ効く入り切り。保存ボタンは置かない。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><SwitchToggle v-model="swOff" label="オフの見本" /></div><figcaption>オフ</figcaption></figure>
        <figure class="smp"><div class="box"><SwitchToggle v-model="swOn" label="オンの見本" /></div><figcaption>オン</figcaption></figure>
        <figure class="smp"><div class="box"><SwitchToggle v-model="swFocus" class="is-focus" label="フォーカスの見本" /></div><figcaption>フォーカス</figcaption></figure>
        <figure class="smp"><div class="box"><SwitchToggle :model-value="false" disabled label="無効の見本" /></div><figcaption>無効</figcaption></figure>
        <figure class="smp wd"><div class="box"><FieldRow label="1文字のキー操作" style="width: 300px"><SwitchToggle v-model="swRow" label="1文字のキー操作" /></FieldRow></div><figcaption>設定の行</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd><code>role="switch"</code> と <code>aria-checked</code>。名前は行の文言と同じ。</dd></div><div><dt>動き</dt><dd>つまみが0.2秒で移る。</dd></div></dl>
    </PatternSection>
    <PatternSection id="i-rg" title="スライダー" code=".rg" kind="vue">
      <template #use>連続した値（透明感、品質、音量）。値は横か見出しに数字で出す。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><div style="width: 220px"><span class="cap">品質 {{ quality }}</span><RangeInput v-model="quality" :min="40" :max="100" label="品質" /></div></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><div style="width: 220px"><span class="cap">品質（PNGは指定なし）</span><RangeInput :model-value="80" :min="0" :max="100" label="品質" disabled style="opacity: .4" /></div></div><figcaption>無効</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>引かずに操作</dt><dd>タップした位置へ移る。キーボードは矢印、<code>Home</code>、<code>End</code>。</dd></div></dl>
    </PatternSection>
    <PatternSection id="i-sz" title="大きさのマス" code=".sz" kind="vue">
      <template #use>設定パネルでウィジェットの大きさを選ぶ 4×3 のマス。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><SizeGrid :size="sz" :min="[1, 1]" :max="[4, 3]" :cols="4" :rows="3" :locked="false" :can-full="false" :full="false" @pick="(w, h) => { sz = [w, h]; }" /></div><figcaption>選んだ範囲</figcaption></figure>
        <figure class="smp"><div class="box"><SizeGrid :size="[2, 2]" :min="[1, 1]" :max="[4, 3]" :cols="4" :rows="3" locked :can-full="false" :full="false" /></div><figcaption>大きさを固定中</figcaption></figure>
        <figure class="smp"><div class="box"><SizeGrid :size="[2, 2]" :min="[2, 2]" :max="[4, 3]" :cols="2" :rows="3" :locked="false" :can-full="false" :full="false" /></div><figcaption>収まらないマス（最小2×2、スマホの2列）</figcaption></figure>
        <figure class="smp"><div class="box"><SizeGrid :size="[2, 1]" :min="[1, 1]" :max="[4, 3]" :cols="4" :rows="3" :locked="false" can-full :full="full" @pick="() => { full = false; }" @full="full = !full" /></div><figcaption>全画面にできるもの（全画面を選択中）</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>全画面</dt><dd>登録で <code>pg: true</code> のウィジェット（時計とスケッチ）だけ、マスの下に「全画面」を出す。選ぶと1画面を占め、マスはどれも選ばれていない見た目にする。位置を固定は使えない。</dd></div><div><dt>押せるマス</dt><dd>登録の <code>min</code>・<code>max</code> と、その端末のボードの列数・行数に収まるマスだけ。収まらないマスは無効の見た目（不透明度 .4）で、押しても変わらない。保存した大きさが入らない端末では縮めて出し、保存値は変えない。</dd></div><div><dt>読み上げ</dt><dd>各マスに「横2、縦2」の名前。「全画面」は押した状態（<code>aria-pressed</code>）を持つ。</dd></div></dl>
    </PatternSection>
    <PatternSection id="i-catq" title="ウィジェットを探す" code=".catq / .cath" kind="markup">
      <template #use>「ウィジェットを追加」の一覧の上の検索欄と、最近の検索。打つたびに絞り込む。</template>
      <ThemeStages>
        <figure class="smp wd"><div class="box"><div style="width: 300px"><div class="catq"><input class="inp" type="search" placeholder="名前や用途で探す"></div><div class="cath"><button class="chip sm">たいまー</button><button class="chip sm">メモ</button><button class="nb" aria-label="最近の検索を消す"><Icon :d="IC.close" /></button></div></div></div><figcaption>入力前（最近の検索あり）</figcaption></figure>
        <figure class="smp wd"><div class="box"><div style="width: 300px"><div class="catq"><input class="inp" type="search" value="かれんだー"></div><div class="sl" style="margin: 4px 0 2px">検索結果</div><div class="crow"><span class="cnb"><span class="cnm">月間カレンダー</span></span><button class="nb ad" aria-label="追加"><Icon :d="IC.plus" /></button></div></div></div><figcaption>入力中</figcaption></figure>
        <figure class="smp wd"><div class="box"><div style="width: 300px"><div class="catq"><input class="inp" type="search" value="ふぁっくす"></div><p class="cap" style="margin: 12px 4px">見つかりません。ほかの言葉で探してください。</p></div></div><figcaption>見つからない</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>対象</dt><dd>名前、ID、分類、登録の検索語（<code>kw</code>）。ひらがな・カタカナ、全角・半角、大文字・小文字は区別しない。空白で区切った語はすべて含むものだけ。</dd></div><div><dt>覚える</dt><dd>結果を使った（▶ ＋ ↓ 名前）ときだけ、5件まで。空のときにチップで出し、× で消せる。パスワードなど隠す入力は覚えない（入力欄の原則）。</dd></div><div><dt>キー</dt><dd><kbd>Enter</kbd> で最初の結果を開く。</dd></div></dl>
      <p class="pnote">本物は「ウィジェットを追加」のシート（<code>AddSheet</code>）の中にある。Storybook の Shell/Sheets「ウィジェットを追加」で動かせます。</p>
    </PatternSection>
    <PatternSection id="i-ck" title="チェック" code=".ck" kind="markup">
      <template #use>TODO の完了。丸い印で、完了すると <code>--a1</code> で塗る。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><span class="ckx" /></div><figcaption>未完了</figcaption></figure>
        <figure class="smp"><div class="box"><span class="ckx on"><Icon :d="IC.check" :size="14" style="stroke-width: 2.4" /></span></div><figcaption>完了</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>読み上げ</dt><dd>行全体をボタンにし、<code>aria-pressed</code> で完了を伝える。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-select" title="選択メニュー" code=".sel + .mnu[role=listbox]" kind="vue">
      <template #use>選ぶものが5個以上あるとき（日の出・日の入りの場所、ボードが5つ以上のときの「ホーム」「追加先」「置くボード」）。4個までは選択の並びのまま。ホームは常にこれ。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><SelectButton label="場所" value="大阪" :expanded="false" @open="noop" /></div><figcaption>閉じている</figcaption></figure>
        <figure class="smp"><div class="box"><DashScope :prepare="openSelect"><div style="display: grid; gap: 6px; justify-items: start"><SelectButton class="is-focus" label="場所" value="大阪" expanded @open="noop" /><MenuLayer /></div></DashScope></div><figcaption>開いている</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>キー</dt><dd><code>↑</code><code>↓</code> で移動、<code>Enter</code> で決定、<code>Esc</code> で閉じて元に戻る、文字を打つとその文字で始まる項目へ。12個を超えたら先頭に絞り込みの欄。</dd></div><div><dt>作り</dt><dd>プロトタイプは押したボタンの位置から計算して重ねる。本実装では popover と anchor positioning に置き換えてよい。下に入らなければ上に出す。幅520px未満では下からのシートにする。</dd></div><div><dt>読み上げ</dt><dd><code>role="listbox"</code>、選んでいる項目に <code>aria-selected</code>。</dd></div></dl>
      <p class="pnote">中身は本物の選択肢（日の出・日の入りの「場所」: 東京・大阪・札幌・福岡・那覇・現在地）。原本の見本の都市（ロンドン・ニューヨーク…）とは違う。</p>
    </PatternSection>
    <PatternSection id="n-step" title="数のステッパー" code=".stp" kind="vue">
      <template #use>小さな整数。カウンターの数、割り勘の人数、トーストの表示秒数、スライドの間隔、メモの文字サイズ、ポモドーロの集中時間（5分刻み）。スライダーより正確に、入力欄より押しやすく。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><NumStepper v-model="people" :min="1" :max="20" label="人数" /></div><figcaption>通常</figcaption></figure>
        <figure class="smp"><div class="box"><NumStepper v-model="peopleMin" :min="1" :max="20" label="人数" /></div><figcaption>最小に達した</figcaption></figure>
        <figure class="smp"><div class="box"><NumStepper v-model="pct" :min="0" :max="30" unit="%" label="税率" /></div><figcaption>単位つき</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>操作</dt><dd>押し続けると0.5秒後から速く進む。真ん中は直接入力できる。</dd></div><div><dt>キー</dt><dd>真ん中で <code>↑</code><code>↓</code>、<code>PageUp</code> / <code>PageDown</code> で10ずつ。</dd></div><div><dt>読み上げ</dt><dd>真ん中は <code>role="spinbutton"</code>（または number 入力）と最小・最大。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-field" title="入力欄の補足とエラー" code=".fld2" kind="markup">
      <template #use>書き方の説明と、間違いの知らせ。独自の検索URL、リンクのURL、税率、アラームの時刻、カウントダウンの日付。文字の設定は、見出しを上に置く縦の並びにする。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><div class="fld2"><label class="cap">独自の検索URL</label><input class="inp" value="https://kagi.com/search?q=%s" style="width: 260px"><span class="cap">%s のところに検索語が入ります</span></div></div><figcaption>補足</figcaption></figure>
        <figure class="smp"><div class="box"><div class="fld2"><label class="cap">独自の検索URL</label><input class="inp err" value="https://kagi.com/search" aria-invalid="true" style="width: 260px"><span class="ferr"><Icon d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" :size="16" />%s が入っていません。検索語を入れる場所に %s を書いてください</span></div></div><figcaption>エラー</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>出すとき</dt><dd>入力を終えたとき（欄から離れたとき）に確かめる。打っている途中には出さない。</dd></div><div><dt>読み上げ</dt><dd>欄に <code>aria-invalid</code> と、文への <code>aria-describedby</code>。</dd></div><div><dt>文言</dt><dd>何が違うかと、どう直すかを書く。</dd></div></dl>
    </PatternSection>
    <PatternSection id="n-time" title="日付と時刻の入力" code=".inp[type=time|date]" kind="markup">
      <template #use>アラームの時刻（ウィジェットの設定に追加）、カウントダウンの日付。ブラウザの入力を入力欄の見た目にそろえて使い、独自の暦は作らない。</template>
      <ThemeStages>
        <figure class="smp"><div class="box"><input class="inp" type="time" value="07:30" style="width: 150px"></div><figcaption>時刻</figcaption></figure>
        <figure class="smp"><div class="box"><input class="inp" type="date" value="2026-12-24" style="width: 190px"></div><figcaption>日付</figcaption></figure>
      </ThemeStages>
      <dl class="beh"><div><dt>理由</dt><dd>スマホではOSの選び方が出て、読み上げとキーボードの扱いもブラウザに任せられる。</dd></div><div><dt>補足</dt><dd>「次は明日 7:00」「あと42日（12月31日）」のように、選んだ結果を文で添える。</dd></div></dl>
    </PatternSection>
  </section>
</template>
