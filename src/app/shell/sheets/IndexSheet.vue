<script setup lang="ts">
/** ウィジェット一覧 (ボードとウィジェット, prototype markup Main.dc.html 1874–1891). */
import { computed } from 'vue';
import { useDash } from '../../context';
import { nameOf } from '../../registry/instances';
import { addBoardAndGo, currentBoard, currentBoardId, deleteBoard, flashOn, setVeil } from '../../store/sheets';
import { IC } from '../../parts/icons';
import Icon from '../../parts/LineIcon.vue';
import { SI } from './sheetIcons';

defineProps<{ dock: string }>();
const d = useDash();

const unread = computed(() => {
  const share = d.data.share as { items?: { dir: string; seen: boolean; pending?: boolean }[] } | undefined;
  return (share?.items ?? []).filter(y => y.dir === 'in' && !y.seen && !y.pending).length;
});
const boards = computed(() => {
  const L = d.layout.value;
  const cur = currentBoard(d);
  const out = d.g.groups.map((gr, gi) => ({ id: gr.id, n: gr.n, cur: gi === cur, first: L.first[gi] ?? 0, items: [] as { id: string; n: string; page: number }[] }));
  for (const id of d.g.order) {
    const q = L.pos[id];
    const b = q ? out[q.gi] : undefined;
    if (!q || !b) continue;
    b.items.push({ id, n: nameOf(id), page: q.page });
  }
  return out;
});
function goTo(id: string, page: number): void {
  d.ui.panel = 'none';
  d.go(page);
  flashOn(d, id);
}
</script>

<template>
  <aside class="sheet" :class="[dock, d.ui.panel === 'index' ? 'open' : '']" aria-label="ウィジェット一覧">
    <div class="sh"><span class="st">ボードとウィジェット</span><button class="nb" :class="d.g.gs.veil ? 'on' : ''" aria-label="中身を隠す" :aria-pressed="d.g.gs.veil ? 'true' : 'false'" style="margin-left: auto" @click="setVeil(d, !d.g.gs.veil)"><Icon :d="IC.eyeOff" /></button><button class="nb" aria-label="閉じる" @click="d.closePanel()"><Icon :d="IC.close" /></button></div>
    <div v-for="pg in boards" :key="pg.id" style="margin-top: 6px">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-right: -10px">
        <button class="pgn" :class="pg.cur ? 'cur' : ''" @click="d.go(pg.first)">{{ pg.n }}</button>
        <button v-if="d.g.groups.length > 1" class="nb" aria-label="このボードを削除" @click="deleteBoard(d, pg.id)"><Icon :d="SI.trash" :size="18" /></button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px">
        <button v-for="pw in pg.items" :key="pw.id" class="chip sm on" @click="goTo(pw.id, pw.page)">{{ pw.n }}<template v-if="pw.id === 'share' && unread > 0"><span class="bdg st" aria-hidden="true">{{ unread }}</span><span class="vh">、未読{{ unread }}件</span></template></button>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 16px">
      <button class="chip pri" @click="d.openPanel('add', { addFrom: 'index', tgt: currentBoardId(d), sel: null })"><Icon :d="IC.plus" :size="18" />ウィジェットを追加</button>
      <button class="chip" @click="addBoardAndGo(d)"><Icon :d="IC.addBoard" :size="18" />ボードを追加</button>
    </div>
  </aside>
</template>
