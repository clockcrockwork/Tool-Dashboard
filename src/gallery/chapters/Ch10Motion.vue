<script setup lang="ts">
/**
 * 10章 動きとフィードバック。部品シート #motion を写したもの。
 * 「再生」は原本の play()（Parts.dc.html のスクリプト `MV()` / `play()`）を移したもので、同じ時間と曲線を Web Animations で流す。
 * 上部の「動き」（減らす）と「速さ」（1/4）が効く。スイッチは本物の SwitchToggle、ほかはクラスだけ。
 */
import { ref } from 'vue';
import Icon from '../../app/parts/LineIcon.vue';
import { IC } from '../../app/parts/icons';
import SwitchToggle from '../../app/parts/SwitchToggle.vue';
import { reducedMotion, useGallery } from '../state';
import KindTag from '../parts/KindTag.vue';

const s = useGallery();
const swOn = ref(false);
const dotOn = ref(0);

type Anim = { k?: Keyframe[]; d: number; e: string; o?: string; delay?: number; t?: string; all?: string; h?: boolean };
type Spec = Anim | { seq: Anim[] };
type Motion = { n?: Spec; r?: Spec | null; cls?: string; hold?: number; flash?: string; all?: string };

const io: Anim = { k: [{ opacity: 0 }, { opacity: 0, offset: 0.99 }, { opacity: 1 }], d: 400, e: 'linear' };
/** 原本の `MV()` と同じ値。 */
const MV: Record<string, Motion> = {
  press: { n: { k: [{ scale: 1 }, { scale: 0.96, offset: 0.5 }, { scale: 1 }], d: 200, e: 'ease' }, r: null },
  hover: { cls: 'is-hover', hold: 900 },
  toast: {
    n: { seq: [{ k: [{ opacity: 0, translate: '0 -12px' }, { opacity: 1, translate: '0 0' }], d: 200, e: 'ease-out' }, { k: [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -10px' }], d: 200, e: 'ease-out', delay: 1200 }, { k: [{ opacity: 0 }, { opacity: 1 }], d: 1, e: 'linear', delay: 2000 }] },
    r: { seq: [{ k: [{ opacity: 0 }, { opacity: 1 }], d: 200, e: 'ease-out' }, { k: [{ opacity: 1 }, { opacity: 0 }], d: 200, e: 'ease-out', delay: 1200 }, { k: [{ opacity: 0 }, { opacity: 1 }], d: 1, e: 'linear', delay: 2000 }] },
  },
  sheet: { n: { k: [{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], d: 250, e: 'ease-out' }, r: { k: [{ opacity: 0 }, { opacity: 1 }], d: 250, e: 'ease-out' } },
  menu: { n: { k: [{ opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1 }], d: 200, e: 'cubic-bezier(.2,.9,.3,1)', o: '0 0' }, r: io },
  dlg: {
    n: { seq: [{ k: [{ opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1 }], d: 250, e: 'ease-out' }, { t: '.scr', k: [{ opacity: 0 }, { opacity: 1 }], d: 250, e: 'ease-out' }] },
    r: { seq: [{ k: [{ opacity: 0 }, { opacity: 1 }], d: 250, e: 'ease-out' }, { t: '.scr', k: [{ opacity: 0 }, { opacity: 1 }], d: 250, e: 'ease-out' }] },
  },
  page: {
    n: { k: [{ translate: '0 0' }, { translate: '0 0', offset: 0.15 }, { translate: '-33.333% 0', offset: 0.16 }, { translate: '-66.666% 0', offset: 0.5 }, { translate: '-66.666% 0', offset: 0.85 }, { translate: '0 0' }], d: 1200, e: 'ease-in-out' },
    r: { k: [{ translate: '0 0' }, { translate: '-33.333% 0', offset: 0.01 }, { translate: '-33.333% 0', offset: 0.99 }, { translate: '0 0' }], d: 900, e: 'linear' },
  },
  prg: { n: { k: [{ scale: '0.2 1' }, { scale: '0.7 1' }], d: 250, e: 'ease-out', o: '0 50%' }, r: { k: [{ scale: '0.2 1' }, { scale: '0.2 1', offset: 0.99 }, { scale: '0.7 1' }], d: 250, e: 'linear', o: '0 50%' } },
  bar: { n: { h: true, d: 1, e: 'linear', all: '.barx i' }, r: { h: true, d: 1, e: 'linear', all: '.barx i' } },
  flash: { flash: 'hl' },
};

const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

/** 原本の `play()`。押した「再生」の節（`.mv`）の中の `.mt` を動かす。 */
function play(e: MouseEvent, key: string): void {
  if (key === 'sw') { swOn.value = !swOn.value; return; }
  if (key === 'dots') { dotOn.value = (dotOn.value + 1) % 4; return; }
  const m = MV[key];
  const box = (e.currentTarget as HTMLElement | null)?.closest('.mv');
  const tg = box?.querySelector<HTMLElement>('.mt');
  if (!m || !box || !tg) return;
  const f = s.slow ? 4 : 1;
  if (m.cls && m.hold) {
    const cls = m.cls;
    tg.classList.add(cls);
    clearTimeout(timers.get(tg));
    timers.set(tg, setTimeout(() => { tg.classList.remove(cls); }, m.hold * f));
    return;
  }
  if (m.flash) {
    const cls = m.flash;
    tg.classList.add(cls);
    requestAnimationFrame(() => requestAnimationFrame(() => { tg.classList.remove(cls); }));
    return;
  }
  const spec = reducedMotion(s) ? m.r : m.n;
  if (!spec) return;
  const list = 'seq' in spec ? spec.seq : [spec];
  for (const a of list) {
    const sel = a.all ?? m.all;
    const els: HTMLElement[] = a.t ? Array.from(box.querySelectorAll<HTMLElement>(a.t)) : sel ? Array.from(box.querySelectorAll<HTMLElement>(sel)) : [tg];
    for (const el of els) {
      if (a.o) el.style.transformOrigin = a.o;
      const k = a.h ? [{ height: '0%' }, { height: el.style.height || '50%' }] : (a.k ?? [{ opacity: 1 }, { opacity: 1 }]);
      el.animate(k, { duration: Math.max(1, a.d * f), easing: a.e, delay: (a.delay ?? 0) * f, fill: 'backwards' });
    }
  }
}

type Row = readonly [label: string, width: string, ms: string];
const DURS: readonly Row[] = [
  ['押した反応', '15.4%', '100 ms'], ['ホバーの塗り', '23.1%', '150 ms'], ['スイッチの色', '23.1%', '150 ms'], ['スイッチのつまみ', '30.8%', '200 ms'],
  ['トースト', '30.8%', '200 ms'], ['メニュー', '30.8%', '200 ms'], ['画面の点', '30.8%', '200 ms'], ['シート', '38.5%', '250 ms'],
  ['ダイアログ', '38.5%', '250 ms'], ['進み具合', '38.5%', '250 ms'], ['グラフの棒', '38.5%', '250 ms'], ['受け取った行', '92.3%', '600 ms'],
];
const CURVES = [
  ['ease-out', 'トースト、シート、進み具合', 'M8 92 C 8.0 92.0 56.7 8.0 92 8'],
  ['--ease', 'メニュー（今のトークン）', 'M8 92 C 24.8 16.4 33.2 8.0 92 8'],
  ['ease', 'ホバー、押した反応、スイッチ', 'M8 92 C 29.0 83.6 29.0 8.0 92 8'],
  ['ease-in-out', '画面送り、読み込みの往復', 'M8 92 C 43.3 92.0 56.7 8.0 92 8'],
  ['linear', '回る印、AIの進み具合', 'M8 92 C 8.0 92.0 92.0 8.0 92 8'],
] as const;
/** 各節の「きっかけ・時間・曲線・性質・頻度・減らすと」。 */
type Meta = readonly [trigger: string, time: string, curve: string, prop: string, freq: string, reduced: string];
const META: Record<string, Meta> = {
  press: ['押す（マウス、タッチ）', '縮む 0.1秒', 'ease', 'scale 1→0.96', 'とても多い', '縮まない'],
  hover: ['マウスを乗せる（マウスのある端末だけ）', '0.15秒', 'ease', '背景の色', 'とても多い', 'すぐ変わる'],
  sw: ['押す', 'つまみ 0.2秒・色 0.15秒', 'ease', 'つまみの translate', 'ふつう', 'すぐ移る'],
  toast: ['操作の結果', '入る 0.2秒・出る 0.2秒', 'ease-out', '透明度と上下12px', 'ふつう', '透明度だけ'],
  sheet: ['設定・一覧を開く', '0.25秒', 'ease-out', '透明度と上下10px', 'ふつう', '透明度だけ'],
  menu: ['「…」、右クリック、選択メニュー', '0.2秒', '--ease', '透明度と 0.95倍（開いたボタンの側から）', 'ふつう', 'すぐ出る'],
  dlg: ['削除など', '0.25秒', 'ease-out', '透明度と 0.97倍、背景の暗さと一緒に', 'まれ', '透明度だけ'],
  dots: ['画面が変わる', '色と透明度 0.2秒', 'ease', '幅はすぐ変わり、色と透明度だけ動く', 'とても多い', '同じ'],
  page: ['スワイプ、矢印、点、⌂', '最後の1画面分だけ（距離で伸びない）', 'ブラウザの smooth', '離れた先は隣まですぐ移り、残り1画面を横スクロール', 'とても多い', 'すぐ移る'],
  load: ['待ち', '回転 0.8秒・明滅 1.4秒・往復 1.2秒', 'linear / ease-in-out', '回転・透明度・横移動', '待つたび', '回転と往復は明滅に'],
  prg: ['進んだ', '0.3秒', 'ease-out', 'scale（横）', '待つたび', 'すぐ変わる'],
  bar: ['値が変わる', '高さはすぐ、色だけ 0.15秒', 'ease', '背景の色', 'ふつう', '同じ'],
  flash: ['受け取った', '0.6秒で消える', 'ease', '背景の色', 'まれ', '色だけ残る'],
};
const META_KEYS = ['きっかけ', '時間', '曲線', '性質', '頻度', '減らすと'] as const;
type Sec = readonly [key: string, title: string, code: string, use: string];
const SECS: readonly Sec[] = [
  ['press', '押した反応', '.chip ほか', '押したことを指の下で伝える。'],
  ['hover', 'ホバーの塗り', '.nb ほか', 'マウスで指せることを知らせる。'],
  ['sw', 'スイッチ', '.sw', '入り切りの結果を、つまみの位置で見せる。'],
  ['toast', 'トースト', '.toast', '操作の結果を、作業を止めずに知らせる。'],
  ['sheet', 'シート', '.sheet', '設定や一覧を、今の画面の上に開く。'],
  ['menu', 'メニュー', '.mnu', '押したボタンのそばに選択肢を出す。'],
  ['dlg', 'ダイアログ', '.dlg', '取り消せない操作の前に確かめる。'],
  ['dots', '画面の点', '.dot', '今どの画面かを、伸びた点で示す。'],
  ['page', '画面送り', '.pages', '画面が変わったことを、横の動きで伝える。'],
  ['load', '読み込み', '.sp / .sk / .pgb', '待っていることを伝える。終わりが分からない待ちに使う。'],
  ['prg', '進み具合', '.prg', '終わりが分かる待ち（変換、ダウンロード）。'],
  ['bar', 'グラフの棒', '.bar', '値が変わったことを、棒の伸びで見せる。'],
  ['flash', '受け取った行の強調', '.srow', '新しく届いたものに目を向けさせる。'],
];
</script>

<template>
  <section id="motion" class="ch"><h2>10. 動きとフィードバック</h2>
    <p class="lead2">操作に返す反応と、画面が変わるときの動きの一覧です。本体と同じ時間と曲線で再生できます。</p>
    <dl class="beh"><div><dt>使い方</dt><dd>「再生」で本体と同じ時間と曲線を流します。上の切り替えで「動きを減らす」と「1/4の速さ」を試せます。</dd></div><div><dt>決まり</dt><dd>出入りは ease-out、画面の上で動くものは ease-in-out、色の変化は ease。1日に何度も見る動きは短く、動かさない選択も考える。</dd></div><div><dt>動きを減らす</dt><dd>位置と大きさの変化を止め、状態が変わったことは透明度と色で残す。</dd></div></dl>
    <div class="mvh">
      <div class="cvs">
        <figure v-for="c in CURVES" :key="c[0]" class="cv"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="ax" d="M8 8V92H92" /><path class="cu" :d="c[2]" /></svg><figcaption><b>{{ c[0] }}</b><span>{{ c[1] }}</span></figcaption></figure>
      </div>
      <div class="dch">
        <div class="drs"><div class="bands" aria-hidden="true"><i style="left: 15.4%; width: 7.7%" /><i style="left: 23.1%; width: 15.4%" /><i style="left: 38.5%; width: 7.7%" /></div><div v-for="r in DURS" :key="r[0]" class="dr"><span>{{ r[0] }}</span><i :style="{ width: r[1] }" /><b class="num">{{ r[2] }}</b></div></div>
        <p class="cap">時間はトークン4つだけ：<code>--dur-1</code> 100ms 押した反応／<code>--dur-2</code> 150ms ホバーと色／<code>--dur-3</code> 200ms 小さな出入り／<code>--dur-4</code> 250ms 大きな面と量の変化。受け取った行の光（600ms）だけは目を引くための例外。読み込みの繰り返しと背景の模様は別枠。</p>
      </div>
    </div>
    <div class="mvgrid">
      <section v-for="sec in SECS" :id="'mv-' + sec[0]" :key="sec[0]" class="ps-pt mv">
        <header><h3>{{ sec[1] }}</h3><code>{{ sec[2] }}</code><span class="vd ok">そのまま</span><KindTag :kind="sec[0] === 'sw' ? 'vue' : 'markup'" /></header>
        <p class="use">{{ sec[3] }}</p>
        <div class="mvr">
          <div class="stage one mvs">
            <button v-if="sec[0] === 'press'" class="chip mt">書き出し</button>
            <button v-else-if="sec[0] === 'hover'" class="nb mt hv" aria-label="設定"><Icon :d="IC.sliders" /></button>
            <SwitchToggle v-else-if="sec[0] === 'sw'" v-model="swOn" class="mt" label="スイッチの見本" />
            <div v-else-if="sec[0] === 'toast'" class="toast mt"><Icon d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM8 12.3l2.8 2.8L16 9.6" style="color: var(--ok, #2b7650)" /><span>ファイルに保存しました</span></div>
            <div v-else-if="sec[0] === 'sheet'" class="sheet mt shm"><div class="sth"><b>設定</b></div><div class="fld"><span>テーマ</span><span class="cap">自動</span></div><div class="fld"><span>ホーム</span><span class="cap">ボード 1</span></div></div>
            <div v-else-if="sec[0] === 'menu'" class="mnu mt stx"><div class="mi">東京</div><div class="mi on"><Icon :d="IC.check" />大阪</div><div class="mi">札幌</div></div>
            <div v-else-if="sec[0] === 'dlg'" class="dlgx"><div class="scr" /><div class="dlg mt"><b>ボードを削除しますか？</b><p class="cap">置いてあるウィジェットは一覧に戻ります。</p><div class="pa"><button class="chip">キャンセル</button><button class="chip bad">削除する</button></div></div></div>
            <div v-else-if="sec[0] === 'dots'" class="dot mt"><span v-for="i in 4" :key="i" :class="{ on: dotOn === i - 1 }" /></div>
            <div v-else-if="sec[0] === 'page'" class="pgx"><div class="pgt mt"><i>1</i><i>2</i><i>3</i></div></div>
            <div v-else-if="sec[0] === 'load'" class="ldx"><span class="sp lp-spin" /><div class="skx"><span /><span /></div><div class="pgbx2"><div class="lp-slide" /></div></div>
            <div v-else-if="sec[0] === 'prg'" class="prg mt2"><i class="mt" style="scale: .7 1" /></div>
            <div v-else-if="sec[0] === 'bar'" class="barx mt"><i style="height: 40%" /><i style="height: 75%" /><i style="height: 55%" /><i style="height: 90%" /><i style="height: 30%" /></div>
            <div v-else-if="sec[0] === 'flash'" class="srowx mt"><span class="cap">iPhone から</span><b>https://example.com/recipe</b></div>
          </div>
          <dl class="mvm"><div v-for="(k, i) in META_KEYS" :key="k"><dt>{{ k }}</dt><dd>{{ META[sec[0]]?.[i] }}</dd></div></dl>
        </div>
        <div class="mvb">
          <span v-if="sec[0] === 'load'" class="cap">繰り返し動いています</span>
          <button v-else class="chip" @click="play($event, sec[0])"><Icon :d="IC.play" :size="16" style="fill: currentColor; stroke: none" />再生</button>
        </div>
      </section>
    </div>
  </section>
</template>
