<script setup lang="ts">
/** 全体の設定 (prototype markup Main.dc.html 1792–1872). */
import { computed } from 'vue';
import { useDash } from '../../context';
import { ACCENTS } from '../../store/defaults';
import {
  detectEnv, exportCopy, homeBoardIndex, importFromClipboard, lastExportText, presetAll, presetMinimal, resetAll, sectionOpen,
  selectExpanded, selectLabel, setVeil, sheetState, toggleSection,
} from '../../store/sheets';
import { DIALOG_SAMPLES, install, installPrompt, pageLoading, tourStart } from '../../store/overlays';
import { IC } from '../../parts/icons';
import Icon from '../../parts/LineIcon.vue';
import CollapseSection from '../../parts/CollapseSection.vue';
import FieldRow from '../../parts/FieldRow.vue';
import RangeInput from '../../parts/RangeInput.vue';
import SegChoice from '../../parts/SegChoice.vue';
import SelectButton from '../../parts/SelectButton.vue';
import SwitchToggle from '../../parts/SwitchToggle.vue';
import { SI } from './sheetIcons';
import { openSel } from './selectMenu';

defineProps<{ dock: string }>();
const d = useDash();
const st = sheetState(d);
const DEV = import.meta.env.DEV;

const theme = computed(() => d.g.gs.theme ?? 'auto');
const THEMES = [['auto', '自動'], ['light', 'ライト'], ['dark', 'ダーク']] as const;
const DENS = [[0, '小'], [1, '中'], [2, '大']] as const;
const devCount = computed(() => st.devices.length);
const devCountLabel = computed(() => (devCount.value ? String(devCount.value) + '台とつながっています' : '未接続'));
const homeLabel = computed(() => (d.g.groups[homeBoardIndex(d)]?.n ?? selectLabel(d, 'home')));
function setTheme(v: 'auto' | 'light' | 'dark'): void { d.setG('theme', v === 'auto' ? null : v); }

// ローカルAI: 見た目だけ (P2 で実装)
const AI_GB: Record<string, number> = { 軽量: 0.4, 標準: 1.0, 高品質: 2.2 };
const MODELS = [['軽量', '軽量'], ['標準', '標準'], ['高品質', '高品質']] as const;
const ENGINES = [['自動', '自動'], ['GPU', 'GPU'], ['CPU', 'CPU']] as const;
const hasGpu = typeof navigator !== 'undefined' && !!(navigator as Navigator & { gpu?: unknown }).gpu;
const isolated = typeof window !== 'undefined' && !!window.crossOriginIsolated;
const ai = computed(() => {
  const gb = (AI_GB[st.ai.model] ?? 1).toFixed(1);
  const eng = st.ai.engine === '自動' ? (hasGpu ? 'GPU' : 'CPU') : st.ai.engine;
  const usable = !(eng === 'GPU' && !hasGpu);
  const notes: Record<string, string> = { 軽量: '速く動きますが、長い文章や難しい質問は苦手です。', 標準: '翻訳と短い相談に向いた大きさです。', 高品質: '答えは丁寧になりますが、性能の高い端末が必要です。' };
  return {
    status: '未準備・' + st.ai.model + '・' + (eng === 'GPU' ? 'GPU（WebLLM）' : 'CPU（wllama）'),
    modelNote: '約' + gb + 'GB。' + (notes[st.ai.model] ?? ''),
    engineNote: !usable ? 'この端末ではGPUを使えません'
      : eng === 'GPU' ? 'GPUで動かします（WebLLM）。速く、端末の負担も小さめです。'
        : 'CPUで動かします（wllama）。' + (hasGpu ? '' : 'この端末ではGPUが使えないためです。') + (isolated ? '複数のスレッドで動きます。' : '単一スレッドで動くため遅くなります。'),
    main: '準備する（約' + gb + 'GB）',
  };
});

// 表示テスト (DEV only; 実装ガイド付録「本実装に入れない」)
const DEMOS = [['ok', '通常'], ['load', '読込'], ['stale', '更新'], ['empty', '空'], ['err', '失敗']] as const;
type DemoState = (typeof DEMOS)[number][0];
/**
 * 表示テスト「外部情報ウィジェットの状態」: 天気・GitHub PR・RSS の状態を選んだものにする（プロトタイプ `setDemo`）。
 * 開発時だけ。各ウィジェットの状態の口は動的 import で読み、本番ビルドでは `import.meta.env.DEV` ごと消える（`e2e/production.spec.ts`）。
 */
function setDemo(v: DemoState): void {
  st.demo = v;
  if (import.meta.env.DEV) {
    void Promise.all([import('../../../widgets/weather'), import('../../../widgets/github'), import('../../../widgets/rss')]).then(([wx, gh, rss]) => {
      if (st.demo !== v) return;
      wx.setWeatherState(d, v);
      gh.setGithubState(d, v);
      rss.setRssState(d, v);
    });
  }
}
const ENV_NAMES: Record<string, string> = { '': '自動', pc: 'PC', ios: 'iPhone', android: 'Android', app: 'アプリ' };
const envSimLabel = computed(() => '案内: ' + (ENV_NAMES[st.simEnv] ?? '自動'));
function cycEnv(): void {
  const o = ['', 'pc', 'ios', 'android', 'app'] as const;
  st.simEnv = o[(o.indexOf(st.simEnv) + 1) % o.length] ?? '';
}
function testAlert(): void { d.ui.panel = 'none'; d.confirm(DIALOG_SAMPLES.alert()); }
function testConfirm(): void { d.ui.panel = 'none'; d.confirm(DIALOG_SAMPLES.confirm(d)); }
function testBusy(): void { d.ui.panel = 'none'; d.busy('同期しています…', 2200, '同期しました'); }
function testPage(): void { d.ui.panel = 'none'; pageLoading(d); }
function togOffline(): void { Object.assign(d.ui, { online: !d.ui.online, panel: 'none' }); }
/** 「アプリとして入れる」: only where the browser offers the install prompt and not already an app. */
const canInstall = computed(() => !!installPrompt.value && (st.simEnv || detectEnv()) !== 'app');
function notYet(): void { d.toast('この表示テストは未実装です', 'info'); }
</script>

<template>
  <aside class="sheet" :class="[dock, d.ui.panel === 'global' ? 'open' : '']" aria-label="全体の設定">
    <div class="sh"><span class="st">設定</span><button class="nb" aria-label="閉じる" @click="d.closePanel()"><Icon :d="IC.close" /></button></div>
    <button class="chip" style="width: 100%; justify-content: space-between; margin-top: 4px" @click="d.openPanel('devices', { devFrom: 'global' })"><span style="display: flex; align-items: center; gap: 8px"><Icon :d="SI.devices" :size="18" />端末をつなぐ</span><span class="cap" style="display: flex; align-items: center; gap: 4px">{{ devCountLabel }}<Icon :d="SI.right" :size="18" style="color: var(--mut)" /></span></button>
    <button class="chip" style="width: 100%; justify-content: space-between; margin-top: 6px" @click="d.openPanel('help', { sel: null, edit: false })"><span style="display: flex; align-items: center; gap: 8px"><Icon :d="SI.help" :size="18" />操作ヒント</span><Icon :d="SI.right" :size="18" style="color: var(--mut)" /></button>
    <button v-if="canInstall" class="chip pri" style="width: 100%; margin-top: 6px" @click="install(d)">アプリとして入れる</button>

    <CollapseSection title="外観" :open="sectionOpen(d, 'look')" @toggle="toggleSection(d, 'look')">
      <SegChoice :options="THEMES" :model-value="theme" label="テーマ" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr))" @update:model-value="setTheme" />
      <div role="group" aria-label="アクセントカラー" style="display: flex; justify-content: space-between; margin-top: 12px">
        <button v-for="(a, i) in ACCENTS" :key="a[2]" class="ac" :class="d.g.gs.acc === i ? 'on' : ''" :aria-label="a[2]" :aria-pressed="d.g.gs.acc === i ? 'true' : 'false'" :style="{ background: 'light-dark(' + a[0] + ', ' + a[1] + ')' }" @click="d.setG('acc', i)" />
      </div>
      <FieldRow label="ガラスの透明感" style="margin-top: 6px"><RangeInput :model-value="d.g.gs.glass" :min="0" :max="100" label="ガラスの透明感" @update:model-value="v => d.setG('glass', v)" /></FieldRow>
      <FieldRow label="角の丸み"><RangeInput :model-value="d.g.gs.rad" :min="8" :max="36" label="角の丸み" @update:model-value="v => d.setG('rad', v)" /></FieldRow>
    </CollapseSection>

    <CollapseSection title="レイアウト" :open="sectionOpen(d, 'layout')" @toggle="toggleSection(d, 'layout')">
      <FieldRow label="ウィジェットの大きさ"><SegChoice :options="DENS" :model-value="d.g.gs.dens" label="ウィジェットの大きさ" @update:model-value="v => d.setG('dens', v)" /></FieldRow>
      <FieldRow label="ホーム"><SelectButton label="ホーム" :value="homeLabel" :expanded="selectExpanded(d, 'home')" @open="e => openSel(d, 'home', 'ホーム', e)" /></FieldRow>
      <FieldRow label="ホイールで画面を切り替え"><SwitchToggle :model-value="d.g.gs.wheel" label="ホイールで画面を切り替え" @update:model-value="v => d.setG('wheel', v)" /></FieldRow>
      <FieldRow label="開いたら検索欄に入力"><SwitchToggle :model-value="d.g.gs.autoq" label="開いたら検索欄に入力" @update:model-value="v => d.setG('autoq', v)" /></FieldRow>
    </CollapseSection>

    <CollapseSection title="操作" :open="sectionOpen(d, 'ops')" @toggle="toggleSection(d, 'ops')">
      <FieldRow label="1文字のキー操作（/ , e 1〜9）"><SwitchToggle :model-value="d.g.gs.keys1" label="1文字のキー操作" @update:model-value="v => d.setG('keys1', v)" /></FieldRow>
      <FieldRow label="中身を隠す"><SwitchToggle :model-value="d.g.gs.veil" label="中身を隠す" @update:model-value="v => setVeil(d, v)" /></FieldRow>
      <p class="cap" style="margin: 0 0 4px">画面共有のときなどに、「人前では隠す」にしたウィジェットの中身を隠します。</p>
    </CollapseSection>

    <CollapseSection title="ローカルAI" :open="sectionOpen(d, 'ai')" @toggle="toggleSection(d, 'ai')">
      <FieldRow label="状態"><span class="cap" style="text-align: right">{{ ai.status }}</span></FieldRow>
      <FieldRow label="モデル"><SegChoice :options="MODELS" :model-value="st.ai.model" label="モデル" @update:model-value="v => st.ai.model = v" /></FieldRow>
      <p class="cap" style="margin: 0 0 4px">{{ ai.modelNote }}</p>
      <FieldRow label="動かし方"><SegChoice :options="ENGINES" :model-value="st.ai.engine" label="動かし方" @update:model-value="v => st.ai.engine = v" /></FieldRow>
      <p class="cap" style="margin: 0 0 8px">{{ ai.engineNote }}</p>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px">
        <button class="chip" @click="notYet">{{ ai.main }}</button>
        <button class="chip" disabled>モデルを削除</button>
      </div>
      <p class="cap" style="margin: 8px 0 0">モデルと入力した内容は、この端末の中だけで扱います。最初の準備でだけモデルをダウンロードします。</p>
    </CollapseSection>

    <CollapseSection v-if="DEV" title="表示テスト" :open="sectionOpen(d, 'test')" @toggle="toggleSection(d, 'test')">
      <SegChoice :options="DEMOS" :model-value="st.demo" label="外部情報ウィジェットの状態" btn-style="padding: 0 4px; font-size: var(--fs-m)" style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr))" @update:model-value="setDemo" />
      <p class="cap" style="margin: 8px 0">天気・GitHub PR・RSS の3つに、選んだ状態を当てはめます。</p>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px">
        <button class="chip" @click="testPage">ページ読み込み</button>
        <button class="chip" @click="testBusy">通信中トースト</button>
        <button class="chip" @click="testAlert">お知らせ</button>
        <button class="chip" @click="testConfirm">削除の確認</button>
        <button class="chip" :class="d.ui.online ? '' : 'on'" :aria-pressed="d.ui.online ? 'false' : 'true'" @click="togOffline">オフライン</button>
        <button class="chip" aria-pressed="false" @click="notYet">AI: GPUなし</button>
        <button class="chip" aria-pressed="false" @click="notYet">AI: 失敗</button>
        <button class="chip" @click="notYet">受信: 文</button>
        <button class="chip" @click="notYet">受信: URL</button>
        <button class="chip" @click="notYet">受信: 画像</button>
        <button class="chip" @click="notYet">受信: 近くの端末</button>
        <button class="chip" @click="tourStart(d)">最初の案内</button>
        <button class="chip" @click="Object.assign(d.ui, { upd: true, updLater: false, panel: 'none' })">新しい版</button>
        <button class="chip" aria-pressed="false" @click="notYet">画面の切り欠き</button>
        <button class="chip" @click="cycEnv">{{ envSimLabel }}</button>
      </div>
    </CollapseSection>

    <CollapseSection title="データ" :open="sectionOpen(d, 'data')" @toggle="toggleSection(d, 'data')">
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px">
        <button class="chip" @click="exportCopy(d)">書き出し（コピー）</button>
        <button class="chip" @click="d.exportFile()">ファイルに保存</button>
        <button class="chip" @click="importFromClipboard(d)">読み込み</button>
        <button class="chip" @click="presetMinimal(d)">ミニマル構成</button>
        <button v-if="DEV" class="chip" @click="presetAll(d)">すべて並べる</button>
        <button class="chip" @click="resetAll(d)">初期状態に戻す</button>
      </div>
      <p class="cap" style="margin: 10px 0 0">{{ lastExportText(d) }}</p>
      <p class="cap" style="margin: 6px 0 0">設定と記録はこのブラウザ内に保存し、外部には送信しません。書き出しはクリップボードへのコピー、読み込みはクリップボードからの貼り付けです。</p>
    </CollapseSection>
    <a v-if="DEV" href="/design/claude-design/Spec.dc.html" class="chip" style="width: 100%; margin-top: 12px; text-decoration: none; color: inherit">仕様書を開く</a>
  </aside>
</template>
