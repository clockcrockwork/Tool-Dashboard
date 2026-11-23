/**
 * Storybook の共通デコレーター。各ストーリーは `parameters.lgd` で入れ物の形と Dashboard の準備を書く。
 *
 *   parameters: { lgd: { layout: 'grid', grid: [2, 1], setup: (d, args) => { solo(d, 'clock', [2, 1]); } } }
 *
 * - Dashboard はストーリーごとにメモリ上に作る（`makeDash`）。時刻は 2026-11-19 10:24:36 JST に固定。
 * - `setup` は args が変わるたびに呼び直す（Controls で変えた値がそのまま映る）。何度呼んでも同じ結果になるように書く。
 * - ツールバーの「テーマ」（globals.theme）: 両方並べる / ライト / ダーク。
 * - `bare: true` は入れ物（StoryShell）で包まず、Dashboard を渡すだけ（DashboardRoot 全体のように自分で `.dash` を描くもの）。
 *   テーマは Dashboard の全体設定（`gs.theme`）に入れる（両方並べるときは「自動」）。ストーリーの側は `useDash()` で受け取る。
 */
import { defineComponent, h, watch, type Component } from 'vue';
import type { Decorator } from '@storybook/vue3-vite';
import type { Dashboard } from '../app/store/store';
import { provideDash } from '../app/context';
import { makeDash, solo } from './dash';
import StoryShell from './StoryShell.vue';
import type { ShellLayout, ShellTheme } from './types';

export type StoryArgs = Record<string, unknown>;

export type LgdParams = Readonly<{
  layout?: ShellLayout;
  /** layout 'grid' のマス数 [横, 縦]。args から決めるときは関数で。 */
  grid?: readonly [number, number] | ((args: StoryArgs) => readonly [number, number]);
  /** layout 'bar' の箱の高さと幅(px) */
  height?: number;
  width?: number;
  setup?: (d: Dashboard, args: StoryArgs) => void;
  /** トーストが消えるなど、本物のタイマーで動かす */
  timers?: boolean;
  /** 入れ物で包まない（DashboardRoot 全体など）。Storybook の `layout: 'fullscreen'` と組で使う */
  bare?: boolean;
}>;

const THEMES: readonly ShellTheme[] = ['both', 'light', 'dark'];
const themeOf = (v: unknown): ShellTheme => (THEMES.includes(v as ShellTheme) ? (v as ShellTheme) : 'both');

export const withDashboard: Decorator = (storyFn, ctx) => {
  const p = (ctx.parameters.lgd ?? {}) as LgdParams;
  const Story = storyFn() as Component;
  return defineComponent({
    name: 'LgdStoryShell',
    setup() {
      const dash = makeDash(undefined, { timers: !!p.timers });
      // ctx.args / ctx.globals は Storybook が reactive にしている（@storybook/vue3 render.ts）。
      watch(() => ({ ...ctx.args }), args => { p.setup?.(dash, args); }, { immediate: true, deep: true });
      if (p.bare) {
        provideDash(dash);
        watch(() => themeOf(ctx.globals.theme), t => { dash.g.gs.theme = t === 'both' ? null : t; }, { immediate: true });
        return () => h(Story);
      }
      return () => h(StoryShell, {
        dash,
        theme: themeOf(ctx.globals.theme),
        layout: p.layout ?? 'stage',
        grid: typeof p.grid === 'function' ? p.grid({ ...ctx.args }) : (p.grid ?? [2, 1]),
        height: p.height ?? 120,
        ...(p.width ? { width: p.width } : {}),
      }, { default: () => h(Story) });
    },
  });
};

/** ウィジェットのストーリー用: args の w・h（マス数）と edit（編集モード）を受け、そのウィジェットだけを左上に置く。 */
export function widgetLgd(id: string, more?: (d: Dashboard, args: StoryArgs) => void): LgdParams {
  const size = (a: StoryArgs): readonly [number, number] => [Number(a.w) || 1, Number(a.h) || 1];
  return {
    layout: 'grid',
    grid: size,
    setup: (d, a) => {
      solo(d, id, size(a));
      d.ui.edit = !!a.edit;
      more?.(d, a);
    },
  };
}
