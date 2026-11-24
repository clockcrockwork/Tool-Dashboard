import { inject, provide, type InjectionKey } from 'vue';
import type { Dashboard } from './store/store';
import type { FieldValue, WidgetDef } from './registry/registry';
import { defOf, kindOf } from './registry/instances';

const KEY: InjectionKey<Dashboard> = Symbol('dashboard');

export function provideDash(d: Dashboard): void {
  provide(KEY, d);
}

export function useDash(): Dashboard {
  const d = inject(KEY);
  if (!d) throw new Error('useDash() must be used inside <DashboardRoot> (or a story decorator that provides a Dashboard).');
  return d;
}

/**
 * A widget's own entry to the store (実装ガイド 4章・7.4): one placement (`links` or `links#2`), its kind's registry
 * entry, and its settings and record. Widgets never index the store by kind, so a second placement of the same kind
 * keeps separate settings and records.
 */
export type WidgetCtx = Readonly<{
  /** Placement ID (`links`, `links#2`). */
  id: string;
  /** Kind ID (registry key, `links`). */
  kind: string;
  def: WidgetDef;
  cfg: (key: string) => FieldValue | undefined;
  /** False when the value is not valid for the setting (nothing changes). */
  setCfg: (key: string, v: FieldValue) => boolean;
  data: <T>() => T;
  setData: <T>(v: T) => void;
}>;

const WKEY: InjectionKey<WidgetCtx> = Symbol('widget');

export function widgetContext(d: Dashboard, id: string): WidgetCtx {
  const def = defOf(id);
  if (!def) throw new Error('Unknown placement ' + id);
  return {
    id, kind: kindOf(id), def,
    cfg: key => d.cfgOf(id, key),
    setCfg: (key, v) => d.setCfg(id, key, v),
    data: <T>() => d.dataOf<T>(id),
    setData: <T>(v: T) => { d.setData<T>(id, v); },
  };
}

/**
 * `useWidget(id)` in a widget's root component (the shell passes the placement ID as the `id` prop) creates the
 * context and provides it to the widget's children; `useWidget()` in a child (e.g. `WidgetFrame`) injects it.
 */
export function useWidget(id?: string): WidgetCtx {
  if (id !== undefined) {
    const ctx = widgetContext(useDash(), id);
    provide(WKEY, ctx);
    return ctx;
  }
  const ctx = inject(WKEY, null);
  if (!ctx) throw new Error('useWidget() without an id must be used inside a widget (a component that called useWidget(id)).');
  return ctx;
}
