<script setup lang="ts">
/**
 * GitHub PR (github) — 3×2, net: data. 状態アイコン付きの行（番号・題名・状態）.
 * Prototype: Main.dc.html section data-w="github" (markup 996–1006; the 4 rows are written in the markup).
 *
 * - 見本のデータ（接続の点で見本と示す）。取得・更新は表示中だけ（`status.ts`、登録の `refresh`）。
 * - 5つの状態は共通の枠の覆い（`stateClass`）。記録は持たない。
 */
import { computed } from 'vue';
import { useDash, useWidget } from '../../app/context';
import WidgetFrame from '../../app/shell/WidgetFrame.vue';
import { stateClass, stateText } from '../weather/weather';
import { prRows } from './github';
import { GITHUB_KEY, githubSource, retryGithub } from './status';

const props = defineProps<{ id: string }>();
const d = useDash();
const w = useWidget(props.id);
const rt = githubSource.runtime(d);
const place = githubSource.use(d, w.id, () => GITHUB_KEY);
const rows = computed(() => prRows(place.val));
const stc = computed(() => stateClass(rt.st));
const st = computed(() => stateText(rt.st, d.ui.t));
</script>

<template>
  <WidgetFrame heading="GitHub プルリクエスト" :state-class="stc" :st-msg="st[0]" :st-act="st[1]" :st-sub="st[2]" @retry="retryGithub(d, w.id)">
    <div class="in" style="flex-direction: column; justify-content: center; gap: 2px; padding-inline: 18px">
      <div v-for="r in rows" :key="r.key" class="row"><svg class="i" role="img" :aria-label="r.st" viewBox="0 0 24 24" :style="r.icon.style"><circle v-for="(c, i) in r.icon.circles" :key="i" :cx="c[0]" :cy="c[1]" r="2" /><path :d="r.icon.d" /></svg><span class="mut num" style="font-size: var(--fs-s)">{{ r.num }}</span><span class="tt">{{ r.t }}</span><span class="cap">{{ r.st }}</span></div>
    </div>
  </WidgetFrame>
</template>
