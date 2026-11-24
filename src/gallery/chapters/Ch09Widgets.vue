<script setup lang="ts">
/**
 * 9章 ウィジェットの表示。部品シート #modes と同じ並び（小型・通常・編集中）で、本物のウィジェットを描く。
 * ウィジェットは src/widgets/index.ts の WIDGETS から引くので、実装が入ったものは自動で見本が出る
 * （まだ無いものは点線の枠）。時刻は 2026-11-19 10:24:36 JST に固定。
 */
import { IC } from '../../app/parts/icons';
import GalleryControls from '../parts/GalleryControls.vue';
import WidgetSnap from '../parts/WidgetSnap.vue';

type Fig = readonly [caption: string, cols: number, rows: number, w: number, h: number, edit?: boolean];
type Row = Readonly<{ id: string; title: string; figs: readonly Fig[]; marks: readonly string[]; ok: string; missing: string }>;

const S11 = (cols: number, rows: number, w: number, h: number, small: string, normal: string): readonly Fig[] => [
  [small, Math.min(cols, 1), rows, 166, h, false],
  [normal, cols, rows, w, h, false],
  ['編集中', cols, rows, w, h, true],
];

/** 大きさ(px)は部品シートの見本の値（1マス 166×153px、すき間 14px）。 */
const ROWS: readonly Row[] = [
  { id: 'clock', title: '時計', figs: S11(2, 1, 346, 153, '小型 1×1', '通常 2×1'), marks: [IC.pin], ok: '小型でも主役の数字を残す。秒は小さく添える。', missing: 'P1 で追加' },
  { id: 'weather', title: '天気', figs: S11(2, 1, 346, 153, '小型 1×1', '通常 2×1'), marks: [], ok: '1×1では湿度を外し、朝・昼・夜の気温だけを残す。', missing: 'P1 で追加' },
  { id: 'pomo', title: 'ポモドーロ', figs: S11(2, 1, 346, 153, '小型 1×1', '通常 2×1'), marks: [IC.lock], ok: '小型ではリングを縮め、再生とやり直しを縦に積む。', missing: 'P2a で追加' },
  { id: 'todo', title: 'TODO', figs: [['小型 1×2', 1, 2, 166, 320], ['通常 2×2', 2, 2, 346, 320], ['編集中', 2, 2, 346, 320, true]], marks: [IC.eyeOff], ok: '1×2では入力欄と行を縦に積む。', missing: 'P1 で追加' },
  { id: 'memo', title: 'メモ', figs: [['小型 2×1', 2, 1, 346, 153], ['通常 2×2', 2, 2, 346, 320], ['編集中', 2, 2, 346, 320, true]], marks: [IC.eyeOff], ok: '2×1では本文だけを残す。予定の提案は出さず、書式の帯は入力中だけ出す。', missing: 'P1 で追加' },
  { id: 'script', title: 'スクリプト', figs: [['小型 2×2', 2, 2, 346, 320], ['通常 3×3', 3, 3, 526, 486], ['編集中', 3, 3, 526, 486, true]], marks: [IC.eyeOff], ok: '2×2ではエディタを隠し、入力・実行・結果を残す（仕様書の決まりどおり）。', missing: 'P2d で追加' },
];
const kind = (f: Fig): string => (f[5] ? '編集中' : f[0].startsWith('小型') ? '小型' : '通常');
</script>

<template>
  <section id="modes" class="ch">
    <h2>9. ウィジェットの表示</h2>
    <p class="lead2">同じウィジェットを、小型・通常・編集中で並べました。ダッシュボードの規則と見本の状態から書き出した表示です（押しても動きません）。</p>
    <GalleryControls small />
    <dl class="beh"><div><dt>編集中</dt><dd>枠が点線になり、中身は押せなくなる。右上の印は、位置を固定（時計）・大きさを固定（ポモドーロ）・人前では隠す（TODO、メモ、スクリプト）。</dd></div><div><dt>大きさ</dt><dd>1マスは約170×150px（デスクトップ、文字の大きさ「中」）。スマホは2列で、1マスが画面の半分。</dd></div><div><dt>赤い注記</dt><dd>このギャラリーで見つかった崩れ。レビューのボードにも載せています。</dd></div></dl>
    <div v-for="r in ROWS" :key="r.id" class="mrow">
      <h3 class="h3">{{ r.title }}</h3>
      <div class="stage one mstage">
        <figure v-for="(f, i) in r.figs" :key="i" class="mf">
          <figcaption>{{ f[0] }}</figcaption>
          <WidgetSnap :id="r.id" :cols="f[1]" :rows="f[2]" :w="f[3]" :h="f[4]" :edit="!!f[5]" :marks="f[5] ? r.marks : []" :label="r.title + '（' + kind(f) + '）'" :missing="r.missing" />
        </figure>
      </div>
      <p class="mok">{{ r.ok }}</p>
    </div>
  </section>
</template>
