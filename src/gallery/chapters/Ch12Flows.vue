<script setup lang="ts">
/**
 * 12章 空・処理中・失敗・復旧。部品シート #flows と同じ並びで、ウィジェットごとの状態の流れを左から並べる。
 * 天気（5状態、`setWeatherState`）と TODO の空は本物のウィジェット。翻訳・スクリプト・画像変換・受け渡し・日の出は
 * P2 のウィジェットなので、原本（Parts.dc.html）の見本のマークアップをそのまま描く（クラスだけ、src/gallery/proto.ts）。
 */
import { onMounted, ref } from 'vue';
import { setWeatherState, type WxState } from '../../widgets/weather';
import { flowSnap } from '../proto';
import type { DashSetup } from '../dash';
import GalleryControls from '../parts/GalleryControls.vue';
import KindTag from '../parts/KindTag.vue';
import WidgetSnap from '../parts/WidgetSnap.vue';
import type { PatternKind } from '../parts/kinds';

/** 段の種類（`.kd` の色）: e 空・l 処理中・o 通常・x 失敗・f 復旧。 */
type Kd = 'e' | 'l' | 'o' | 'x' | 'f';
const KD: Record<Kd, string> = { e: '空', l: '処理中', o: '通常', x: '失敗', f: '復旧' };
type Real = Readonly<{ id: string; cols: number; rows: number; prepare: DashSetup }>;
type Fig = Readonly<{ kd: Kd; kdl?: string; b: string; w: number; h: number; p?: string; arrow?: string; real?: Real }>;
type Flow = Readonly<{ n: number; title: string; fl: string; kind: PatternKind; figs: readonly Fig[] }>;

const wx = (st: WxState): Real => ({ id: 'weather', cols: 2, rows: 1, prepare: d => { setWeatherState(d, st); } });
const todoEmpty: Real = { id: 'todo', cols: 2, rows: 2, prepare: d => { d.data.todo = { items: [] }; } };

const FLOWS: readonly Flow[] = [
  { n: 0, title: '天気', fl: '通信するウィジェット（天気、GitHub、RSS）は同じ形。ガラスの面に重ねて状態を出す。', kind: 'vue', figs: [
    { kd: 'e', b: '未接続', w: 346, h: 153, p: '「接続する」から始める。', arrow: '接続する', real: wx('empty') },
    { kd: 'l', b: '読み込み', w: 346, h: 153, p: '形だけ先に出す（スケルトン）。', arrow: '届いた', real: wx('load') },
    { kd: 'o', b: '通常', w: 346, h: 153, arrow: '次の更新', real: wx('ok') },
    { kd: 'l', b: '更新中', w: 346, h: 153, p: '前の値を薄く残し、右上で回す。', arrow: '通信できない', real: wx('stale') },
    { kd: 'x', b: '失敗', w: 346, h: 153, p: '「もう一度」と最終更新の時刻。押すと読み込みへ戻る。', real: wx('err') },
  ] },
  { n: 1, title: '翻訳（ローカルAI）', fl: 'AIの準備は上の細い帯で知らせる。翻訳とチャットで共通。', kind: 'markup', figs: [
    { kd: 'e', b: '未準備', w: 346, h: 320, p: '容量と「準備する」。', arrow: '準備する' },
    { kd: 'l', b: 'ダウンロード中', w: 346, h: 320, p: '進み具合の線と、止めるボタン。', arrow: '保存できた' },
    { kd: 'l', b: '読み込み中', w: 346, h: 320, p: '回る印と「AIを読み込み中…」。', arrow: '使える' },
    { kd: 'o', b: '通常', w: 346, h: 320, p: '帯が消える。', arrow: 'メモリ不足など' },
    { kd: 'x', b: '失敗', w: 346, h: 320, p: '理由と「もう一度」。' },
  ] },
  { n: 2, title: 'スクリプト', fl: '結果の欄と下の状態の行で知らせる。エラーは行に印を付ける。', kind: 'markup', figs: [
    { kd: 'e', b: '待機', w: 526, h: 486, p: '結果の欄に、何が出るかを書く。', arrow: '▶ 実行' },
    { kd: 'l', b: '実行中', w: 526, h: 486, p: '止めるボタンと経過時間。ログは届いた順に出す。', arrow: '終わった' },
    { kd: 'o', b: '完了', w: 526, h: 486, p: '戻り値と型、かかった時間。', arrow: '例外が出たとき' },
    { kd: 'x', b: 'エラー', w: 526, h: 486, p: '行の印と「2行目へ」。直して再実行で復旧。', arrow: '入力が取れないとき' },
    { kd: 'x', b: '入力なし', w: 526, h: 486, p: '理由と「手入力にする」を結果の欄に出す。' },
  ] },
  { n: 3, title: '画像変換', fl: 'ドロップの面が、追加すると一覧に変わる。', kind: 'markup', figs: [
    { kd: 'e', b: '空', w: 346, h: 320, p: '「画像をドロップ」と「見本で試す」。', arrow: '画像を追加' },
    { kd: 'l', b: '変換中', w: 346, h: 320, p: '全体と1枚ずつの進み具合。', arrow: '終わった' },
    { kd: 'o', b: '完了', w: 346, h: 320, p: '減った量と保存ボタン。', arrow: '読めない形式' },
    { kd: 'x', b: '失敗', w: 346, h: 320, p: '理由と「選び直す」。大きすぎるときは長辺を下げて、書き出せない形式はJPEGでやり直せる。' },
  ] },
  { n: 4, title: 'TODO と 受け渡し', fl: '中身が無いときは、何をすれば増えるかを1行で。', kind: 'mix', figs: [
    { kd: 'e', b: 'TODO 空', w: 346, h: 320, p: '「上の欄に書いて Enter で追加します」。', real: todoEmpty },
    { kd: 'e', b: '受け渡し 空', w: 346, h: 486, p: '送り方の案内。', arrow: '送る' },
    { kd: 'l', b: '送信待ち', w: 346, h: 486, p: '相手の確認を待つ。', arrow: '受け取った' },
    { kd: 'o', b: '未読あり', w: 346, h: 486, p: '新しい行を強調し、一覧ボタンに件数。' },
  ] },
  { n: 5, title: '日の出・日の入り（許可）', fl: '許可が要る機能は、ブラウザに聞く前にウィジェットの中で説明する。', kind: 'markup', figs: [
    { kd: 'l', kdl: 'お願い', b: 'お願い', w: 346, h: 153, p: '理由と「位置を使う」「都市を選ぶ」。', arrow: '断られた' },
    { kd: 'x', b: '断られた', w: 346, h: 153, p: '直し方と、もう一度・都市を選ぶ。', arrow: '都市を選んだ' },
    { kd: 'f', b: '復旧', w: 346, h: 153, p: '選んだ都市で表示。' },
  ] },
];

/**
 * 原本のマークアップでは textarea と select の中身が value 属性で書かれている（プロトタイプの実行環境が値を入れる）。
 * HTML としてはそのままでは映らないので、描いたあとに value 属性を値として入れる。
 */
const root = ref<HTMLElement | null>(null);
onMounted(() => {
  root.value?.querySelectorAll<HTMLTextAreaElement | HTMLSelectElement>('.snapi :is(textarea, select)[value]').forEach((el) => {
    el.value = el.getAttribute('value') ?? '';
  });
});
</script>

<template>
  <section id="flows" ref="root" class="ch"><h2>12. 空・処理中・失敗・復旧</h2>
    <p class="lead2">ウィジェットごとに、状態がどう移るかを左から順に並べました。矢印の上は、次の状態に移るきっかけです。</p>
    <GalleryControls small />
    <div class="kleg"><span class="kd k-e">空</span>まだ何も無い<span class="kd k-l">処理中</span>待っている・お願いしている<span class="kd k-o">通常</span><span class="kd k-x">失敗</span>うまくいかなかった<span class="kd k-f">復旧</span>失敗から戻った</div>
    <div v-for="f in FLOWS" :key="f.n" class="flow">
      <h3 class="h3">{{ f.title }} <KindTag :kind="f.kind" /></h3>
      <p class="fl">{{ f.fl }}</p>
      <div class="stage one fstage">
        <template v-for="(g, i) in f.figs" :key="i">
          <figure class="fr">
            <figcaption><span class="kd" :class="'k-' + g.kd">{{ g.kdl ?? KD[g.kd] }}</span><b>{{ g.b }}</b></figcaption>
            <WidgetSnap v-if="g.real" :id="g.real.id" :cols="g.real.cols" :rows="g.real.rows" :w="g.w" :h="g.h" :label="f.title + '：' + g.b" :prepare="g.real.prepare" />
            <!-- 原本の見本のマークアップ（信頼できる固定の文字列）をそのまま描く -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-else class="snapf" role="img" :aria-label="f.title + '：' + g.b" :style="{ width: g.w + 'px', height: g.h + 'px' }"><div class="snapi" inert v-html="flowSnap(f.n, i)" /></div>
            <p v-if="g.p">{{ g.p }}</p>
          </figure>
          <div v-if="g.arrow" class="arr" aria-hidden="true"><span>{{ g.arrow }}</span><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 18px; height: 18px"><path d="M5 12h13M13 7l5 5-5 5" /></svg></div>
        </template>
      </div>
    </div>
  </section>
</template>
