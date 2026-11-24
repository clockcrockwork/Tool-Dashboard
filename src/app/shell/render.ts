/**
 * Which placements and full-screen views the shell renders (DashboardRoot).
 *
 * 表示されるまで描画しない (実装ガイド 8章「開く速さ」, review #7): a kind marked `lazy` in the registry is rendered only
 * while its screen is the current screen or a neighbouring one (so a swipe shows it already drawn), in the front view, or
 * used without placing (一時利用, which also opens in front). Elsewhere it has no DOM at all; it is created when the user
 * moves near it. Other kinds keep the prototype's behaviour (every placement is rendered). The same rule applies to
 * full-screen views. Updating (fetching, timers) is a separate, stricter rule: only the shown screen (`store/visibility.ts`).
 */
import { REGISTRY } from '../registry/registry';
import { kindOf } from '../registry/instances';
import type { Dashboard } from '../store/store';

export type LazyOf = (kind: string) => boolean;
export const lazyKind: LazyOf = kind => !!REGISTRY[kind]?.lazy;

/** Screens rendered for lazy kinds: the current one and its neighbours. */
export function nearScreen(d: Dashboard, page: number): boolean {
  return Math.abs(page - d.page) <= 1;
}

/** Placements rendered in the grid, in DOM order: placed ones, and the one used without placing. */
export function gridPlacements(d: Dashboard, lazy: LazyOf = lazyKind): string[] {
  const u = d.ui;
  return d.ids.value.filter((id) => {
    if (d.g.off[id] && u.temp !== id) return false;
    if (!lazy(kindOf(id))) return true;
    if (u.big === id) return true;
    const p = d.layout.value.pos[id];
    return !!p && nearScreen(d, p.page);
  });
}

/** Full-screen screens whose view is rendered (lazy kinds only near the current screen). */
export function fullScreenViews(d: Dashboard, lazy: LazyOf = lazyKind): { id: string; page: number }[] {
  return d.layout.value.fullScreens.filter(s => !lazy(kindOf(s.id)) || nearScreen(d, s.page)).map(s => ({ id: s.id, page: s.page }));
}
