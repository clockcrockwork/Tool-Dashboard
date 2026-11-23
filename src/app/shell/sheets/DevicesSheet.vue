<script setup lang="ts">
/** 端末をつなぐ (見た目と見本データのみ。実通信は P4。prototype markup Main.dc.html 1714–1749). */
import { computed } from 'vue';
import { useDash } from '../../context';
import { DEVICE_ICONS, agoText, askUnpair, qrPath, setPairInput, setPairMode, sheetState } from '../../store/sheets';
import { IC } from '../../parts/icons';
import Icon from '../../parts/LineIcon.vue';
import FieldRow from '../../parts/FieldRow.vue';
import SegChoice from '../../parts/SegChoice.vue';
import SwitchToggle from '../../parts/SwitchToggle.vue';

defineProps<{ dock: string }>();
const d = useDash();
const st = sheetState(d);

const PAIR_MODES = [['show', 'この端末に表示'], ['enter', 'コードを入力']] as const;
const RECV = [[true, '自動で受け取る'], [false, '毎回確認']] as const;
const qr = computed(() => qrPath(st.pairCode));
const leftSec = computed(() => Math.max(0, 300 - Math.floor((d.ui.t - st.pairAt) / 1000)));
const codeShow = computed(() => (leftSec.value ? st.pairCode.slice(0, 3) + ' ' + st.pairCode.slice(3) : '期限切れ'));
const left = computed(() => (leftSec.value ? String(Math.floor(leftSec.value / 60)) + ':' + String(leftSec.value % 60).padStart(2, '0') : '0:00（もう一度「この端末に表示」を押すと新しいコードになります）'));
const paired = computed(() => st.devices.map(x => ({ ...x, d: DEVICE_ICONS[x.type], st: x.on ? '接続中' : 'オフライン・' + agoText(d.ui.t, x.last) })));
const near = computed(() => st.nearby.filter(x => st.lsOn || x.tag !== 'LocalSend').map(x => ({ ...x, d: DEVICE_ICONS[x.type] })));
const val = (e: Event): string => (e.target as HTMLInputElement).value;
</script>

<template>
  <aside class="sheet" :class="[dock, d.ui.panel === 'devices' ? 'open' : '']" aria-label="端末をつなぐ">
    <div class="sh"><button v-if="d.ui.devFrom === 'global'" class="bk" @click="d.back()"><Icon :d="IC.back" />設定</button><span class="st">端末をつなぐ</span><button class="nb" aria-label="閉じる" @click="d.closePanel()"><Icon :d="IC.close" /></button></div>
    <FieldRow label="この端末の名前"><input class="inp" aria-label="この端末の名前" :value="st.myName" @input="st.myName = val($event)" @keydown.stop></FieldRow>
    <div class="sl">自分の端末を追加</div>
    <SegChoice :options="PAIR_MODES" :model-value="st.pairMode" label="追加のしかた" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr))" @update:model-value="v => setPairMode(d, v)" />
    <template v-if="st.pairMode === 'show'">
      <div class="qrb"><svg role="img" aria-label="ペアリング用のQRコード（見本）" viewBox="0 0 29 29" shape-rendering="crispEdges" style="width: 100%; height: 100%"><path :d="qr" fill="currentColor" /></svg></div>
      <div class="pcode num" :aria-label="'ペアリングコード ' + st.pairCode">{{ codeShow }}</div>
      <p class="cap" style="text-align: center; margin: 0">相手の端末で読み取るか、コードを入力してください。残り {{ left }}</p>
    </template>
    <template v-if="st.pairMode === 'enter'">
      <input class="inp num" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="6桁のコード" placeholder="6桁のコード" :value="st.pairIn" style="width: 100%; margin-top: 10px; font-size: var(--fs-2xl); letter-spacing: .3em; text-align: center" @input="setPairInput(d, val($event))" @keydown.stop>
      <p class="cap" style="margin: 8px 0 0">もう一方の端末で「この端末に表示」を開き、出ているコードを入れてください。{{ st.pairMsg }}</p>
    </template>
    <div class="sl">自分の端末</div>
    <div>
      <div v-for="dv in paired" :key="dv.id" class="drow"><Icon :d="dv.d" style="color: var(--mut)" /><div class="cn"><b>{{ dv.n }}</b><span class="ctag"><span class="pdot" :class="dv.on ? 'on' : ''" aria-hidden="true" />{{ dv.st }}</span></div><button class="chip" style="min-height: 38px; padding: 0 12px; font-size: var(--fs-m); background: none" @click="askUnpair(d, dv.id)">解除</button></div>
      <p v-if="!paired.length" class="cap" style="margin: 8px 0">まだありません。上の方法で追加すると、別のネットワークにいても届きます。</p>
    </div>
    <div class="sl">近くの端末</div>
    <div>
      <div v-for="nv in near" :key="nv.id" class="drow"><Icon :d="nv.d" style="color: var(--mut)" /><div class="cn"><b>{{ nv.n }}<span class="dtag">{{ nv.tag }}</span></b><span class="ctag">同じネットワーク・受け取る前に毎回確認</span></div></div>
      <p v-if="!near.length" class="cap" style="margin: 8px 0">同じネットワークに見つかった端末はありません。</p>
    </div>
    <div class="sl">受け取り方</div>
    <FieldRow label="自分の端末から"><SegChoice :options="RECV" :model-value="st.recvAuto" label="自分の端末からの受け取り方" @update:model-value="v => st.recvAuto = v" /></FieldRow>
    <FieldRow label="LocalSend の端末も表示"><SwitchToggle :model-value="st.lsOn" label="LocalSend の端末も表示" @update:model-value="v => st.lsOn = v" /></FieldRow>
    <FieldRow label="中継サーバー"><input class="inp" type="url" aria-label="中継サーバーのURL" :value="st.relay" style="width: 100%" @input="st.relay = val($event)" @keydown.stop></FieldRow>
    <p class="cap" style="margin: 8px 0 0">送る内容は端末どうしで暗号化します。中継サーバーは中身を読めず、相手が閉じている間だけ最大24時間預かります。アカウントは不要です。</p>
  </aside>
</template>
