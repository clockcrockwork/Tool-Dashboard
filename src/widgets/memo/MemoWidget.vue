<script setup lang="ts">
/**
 * メモ (memo) — 2×2, vd. Markdown の色分け層＋プレビュー＋入力補助の帯＋前面表示＋予定・TODOへの提案.
 * Prototype: Main.dc.html section data-w="memo" (markup 1063–1095); `mdLines`, `pvLines`, `memoKey`, `mdEdit()`,
 * `parseCand`, `sug*`, `memoFocus`, `bigTog.memo` in `renderVals()`.
 */
import { computed, nextTick, ref } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import type { MemoData } from './data';
import { MEMO_TOOLS, applyFormat, charCount, continueList, lineAt, mdLine, pvLine, toggleCheck, type Edit, type FormatKind } from './memo';
import { candidates, pickSuggestion, suggestionText, type LineCand } from './suggest';
import type { TodoData } from '../todo/data';
import { addTodo } from '../todo/todo';
import { addEvent, type AgendaData } from '../agenda/data';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const ta = ref<HTMLTextAreaElement | null>(null);
/** 編集／プレビュー (not saved, like the prototype `memoMode`). */
const view = ref(false);
/** Caret line while editing; -1 when the textarea is not focused. */
const caret = ref(-1);
const scrollY = ref(0);

const memo = computed(() => w.data<MemoData>());
const now = computed(() => new Date(d.ui.t));
const lines = computed(() => memo.value.text.split('\n'));
const cands = computed(() => candidates(lines.value, memo.value.done, now.value));
const isBig = computed(() => d.ui.big === w.id && (!d.g.off[w.id] || d.ui.temp === w.id));

const mdLines = computed(() => lines.value.map((ln, i) => {
  const l = mdLine(ln);
  const c = cands.value[i];
  if (c) l.c = (l.c ? l.c + ' ' : '') + (c.kind === 'ev' ? 'ms' : 'mtd');
  return l;
}));
const pvLines = computed(() => lines.value.map((ln, i) => {
  const c = cands.value[i] ?? null;
  return {
    ...pvLine(ln),
    cand: c,
    did: c?.state === 'add',
    al2: !c ? '' : c.state === 'add' ? '追加済み' : (c.kind === 'ev' ? '予定に追加' : 'TODOに追加'),
  };
}));
const sug = computed(() => pickSuggestion(cands.value, caret.value));
const sugD = computed(() => (sug.value?.kind === 'ev' ? 'M5 6h14v13H5zM5 10h14M9 4v3M15 4v3' : 'M5 12.5l4.5 4.5L19 7.5'));
const sugText = computed(() => (sug.value ? suggestionText(sug.value, now.value) : ''));
const sugAct = computed(() => (sug.value ? (sug.value.kind === 'ev' ? '予定に追加' : 'TODOに追加') : ''));
const tools = computed(() => ((w.cfg('bar') || isBig.value) && !view.value ? MEMO_TOOLS : []));
const count = computed(() => (w.cfg('count') ? String(charCount(memo.value.text)) + '字' : ''));
const px = computed(() => Number(w.cfg('size')) || 14);

function setText(text: string): void {
  w.setData<MemoData>({ ...memo.value, text });
}
function applyEdit(e: Edit): void {
  setText(e.value);
  void nextTick(() => {
    const el = ta.value;
    if (!el) return;
    try { if (document.activeElement !== el) el.focus(); el.setSelectionRange(e.a, e.b); } catch { /* detached */ }
    syncCaret();
  });
}
function syncCaret(): void {
  const el = ta.value;
  if (!el || document.activeElement !== el) return;
  const li = lineAt(el.value, el.selectionStart);
  if (li !== caret.value) caret.value = li;
}

// ----- 前面表示 (仕様書 6章) -----
function collapse(): void {
  const u = d.ui;
  Object.assign(u, { big: null, temp: null, ret: null, panel: u.temp && u.ret ? u.ret : u.panel });
  try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch { /* noop */ }
}
function toggleBig(): void {
  if (d.ui.big === w.id) collapse();
  else Object.assign(d.ui, { big: w.id, panel: 'none', edit: false, sel: null });
}

// ----- textarea -----
function onInput(e: Event): void {
  setText((e.target as HTMLTextAreaElement).value);
  syncCaret();
}
function onFocus(): void {
  if (!d.ui.big && w.cfg('expand') && d.env.width < 720) Object.assign(d.ui, { big: w.id, panel: 'none' });
  syncCaret();
}
function onBlur(): void {
  if (caret.value !== -1) caret.value = -1;
}
function onScroll(e: Event): void {
  const y = (e.currentTarget as HTMLElement).scrollTop;
  if (y !== scrollY.value) scrollY.value = y;
}
function onKey(e: KeyboardEvent): void {
  e.stopPropagation();
  if (e.key === 'Escape') { collapse(); return; }
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  const el = e.target as HTMLTextAreaElement;
  const r = continueList(el.value, el.selectionStart, el.selectionEnd);
  if (!r) return;
  e.preventDefault();
  applyEdit(r);
}
function format(kind: FormatKind): void {
  const el = ta.value;
  if (!el) return;
  applyEdit(applyFormat(kind, el.value, el.selectionStart, el.selectionEnd));
}

// ----- preview / suggestions -----
function check(i: number): void {
  setText(toggleCheck(memo.value.text, i));
}
function addCand(c: LineCand): void {
  // Adds to the first TODO / 予定 placement (`todo`, `agenda`); choosing another placement comes with 複数配置 (P3).
  const sn = { todo: d.dataOf<TodoData>('todo'), agenda: d.dataOf<AgendaData>('agenda'), done: memo.value.done };
  const id = d.now();
  w.setData<MemoData>({ ...memo.value, done: { ...memo.value.done, [c.key]: 'add' } });
  if (c.kind === 'todo') d.setData<TodoData>('todo', { items: addTodo(sn.todo.items, c.title, id) ?? sn.todo.items });
  else d.setData<AgendaData>('agenda', addEvent(sn.agenda, { id, ts: c.ts, hasTime: c.hasTime, n: c.title, c: 'a1' }));
  d.toast((c.kind === 'todo' ? 'TODO' : '予定') + 'に追加しました', 'ok', {
    label: '元に戻す',
    fn: () => {
      d.setData<TodoData>('todo', sn.todo);
      d.setData<AgendaData>('agenda', sn.agenda);
      w.setData<MemoData>({ ...w.data<MemoData>(), done: sn.done });
    },
  });
}
function sugAdd(): void {
  if (sug.value) addCand(sug.value);
}
function sugSkip(): void {
  const s = sug.value;
  if (!s) return;
  w.setData<MemoData>({ ...memo.value, done: { ...memo.value.done, [s.key]: 'skip' } });
}
/** 別の端末へ送る — 受け渡し (P2d) arrives later; until then this mirrors the prototype's toast for the sample devices. */
function send(): void {
  if (!memo.value.text.trim()) return;
  d.toast('2台に送りました（1台は相手が開いたら届きます）', 'ok');
}
</script>

<template>
  <WidgetFrame>
    <div class="in" style="flex-direction: column; gap: 4px; padding: 14px 16px 8px">
      <div v-if="!view" class="mdw" :style="{ fontSize: px + 'px' }">
        <div class="mdhl" aria-hidden="true"><div :style="{ translate: '0 ' + String(-scrollY) + 'px' }">
          <div v-for="(ml, i) in mdLines" :key="i" class="mdl"><span class="mk">{{ ml.m }}</span><span :class="ml.c">{{ ml.t }}</span></div>
        </div></div>
        <textarea ref="ta" class="mdta" aria-label="メモ" placeholder="メモ…" :value="memo.text" @input="onInput" @keydown="onKey" @keyup="syncCaret" @click="syncCaret" @select="syncCaret" @scroll="onScroll" @focus="onFocus" @blur="onBlur" />
      </div>
      <div v-if="view" class="pvw" :style="{ fontSize: px + 'px' }">
        <div v-for="(pl, i) in pvLines" :key="i" class="pv" :class="pl.k"><button v-if="pl.chk" class="pvc" :aria-label="pl.al" :aria-pressed="pl.done" @click="check(i)"><span><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke-width: 2.6"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span></button><span class="sx"><span v-for="(sg, j) in pl.segs" :key="j" :class="sg.c">{{ sg.t }}</span></span><button v-if="pl.cand" class="pva" :disabled="pl.did" @click="addCand(pl.cand)">{{ pl.al2 }}</button></div>
      </div>
      <div class="sug" :class="sug && !view ? 'show' : ''">
        <svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: var(--mut)"><path :d="sugD" /></svg>
        <span class="tx">{{ sugText }}</span>
        <button class="abb" style="font-weight: 600" @pointerdown.prevent @click="sugAdd">{{ sugAct }}</button>
        <button class="abb" aria-label="この行は追加しない" @pointerdown.prevent @click="sugSkip"><svg class="i" aria-hidden="true" viewBox="0 0 24 24" style="width: 16px; height: 16px"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg></button>
      </div>
      <div class="ab show">
        <button v-for="mt in tools" :key="mt[0]" class="abb" :aria-label="mt[2]" @pointerdown.prevent @click="format(mt[0])">{{ mt[1] }}</button>
        <span class="abs" />
        <span class="cap num" style="flex: none; padding: 0 6px">{{ count }}</span>
        <button class="abb" aria-label="メモを別の端末へ送る" @click="send"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" /></svg></button>
        <button class="abb" :class="view ? 'on' : ''" :aria-label="view ? '編集に戻る' : 'プレビュー'" :aria-pressed="view" @click="view = !view"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M2.5 12c1.8-3.8 5.3-6 9.5-6s7.7 2.2 9.5 6c-1.8 3.8-5.3 6-9.5 6s-7.7-2.2-9.5-6zM12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z" /></svg></button>
        <button class="abb" :aria-label="isBig ? '元の大きさに戻す' : '大きく表示'" @click="toggleBig"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path :d="isBig ? 'M10 4v6H4M14 20v-6h6' : 'M4 10V4h6M20 14v6h-6'" /></svg></button>
      </div>
    </div>
  </WidgetFrame>
</template>
