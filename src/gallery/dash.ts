/**
 * Dashboards for Storybook stories and the Design Pattern Gallery.
 * Always in memory (`memoryStore`), with the time fixed to the reproduction-test clock
 * (2026-11-19 10:24:36 JST, same as vrt/lib/env.ts) so samples match the prototype screenshots.
 */
import { Dashboard } from '../app/store/store';
import { memoryStore } from '../app/store/persist';
import { REGISTRY, type Size } from '../app/registry/registry';
import { renumber } from '../app/store/defaults';
import { WIDGET_DATA } from '../widgets';

export const FIXED_NOW = Date.parse('2026-11-19T10:24:36+09:00');

export type DashSetup = (d: Dashboard) => void;

export type MakeDashOptions = Readonly<{
  /** Real timers (toasts fade). Off by default so samples stay still. */
  timers?: boolean;
}>;

/** A fresh in-memory Dashboard; the first-run tour is already done. */
export function makeDash(setup?: DashSetup, opts: MakeDashOptions = {}): Dashboard {
  const d = new Dashboard({
    store: memoryStore(),
    dataDefs: WIDGET_DATA,
    now: () => FIXED_NOW,
    ...(opts.timers ? {} : { setTimeout: () => 0 }),
  });
  d.g.tourDone = true;
  d.ui.tour = -1;
  setup?.(d);
  return d;
}

/** Place only `id` (top-left of the first screen), optionally at `size` [横, 縦]. */
export function solo(d: Dashboard, id: string, size?: Size): void {
  const off: Record<string, boolean> = {};
  for (const k of Object.keys(REGISTRY)) if (k !== id) off[k] = true;
  d.g.off = off;
  if (size) d.g.sizes = { ...d.g.sizes, [id]: size };
}

/** `n` boards (「ボード 1」…). Empty boards take one screen each. */
export function boards(d: Dashboard, n: number): void {
  d.g.groups = renumber(Array.from({ length: n }, (_v, i) => ({ id: i === 0 ? 'g0' : 'g' + String(i), n: '' })));
}
