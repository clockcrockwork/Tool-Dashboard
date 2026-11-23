/**
 * Widget implementations. Each entry is lazy so heavy tools load only when placed or opened
 * (実装ガイド 8章「開く速さ」). Widgets without an implementation yet (P2) are absent here;
 * the catalog still lists them (see docs/lgd/development-flow.md).
 */
import { defineAsyncComponent, type Component } from 'vue';
import type { WidgetDataDef } from '../app/store/store';
import { todoData } from './todo/data';
import { linksData } from './links/data';
import { memoData } from './memo/data';
import { agendaData } from './agenda/data';

export const WIDGETS: Readonly<Record<string, Component>> = {
  clock: defineAsyncComponent(() => import('./clock/ClockWidget.vue')),
  weather: defineAsyncComponent(() => import('./weather/WeatherWidget.vue')),
  rain: defineAsyncComponent(() => import('./rain/RainWidget.vue')),
  search: defineAsyncComponent(() => import('./search/SearchWidget.vue')),
  todo: defineAsyncComponent(() => import('./todo/TodoWidget.vue')),
  links: defineAsyncComponent(() => import('./links/LinksWidget.vue')),
  memo: defineAsyncComponent(() => import('./memo/MemoWidget.vue')),
};

/** Full-screen views (仕様書 2章「全画面ウィジェット」 `.fsw`). Always rendered; the view hides itself with `.off` when not full-screen. */
export const FULLSCREEN: Readonly<Record<string, Component>> = {
  clock: defineAsyncComponent(() => import('./clock/ClockFullScreen.vue')),
};

/**
 * Per-widget saved records (区画 `w:<id>` の data). `agenda` is registered before its widget (P2b) so that
 * メモから予定への追加 is stored.
 */
export const WIDGET_DATA: Readonly<Record<string, WidgetDataDef<unknown>>> = {
  todo: todoData as WidgetDataDef<unknown>,
  links: linksData as WidgetDataDef<unknown>,
  memo: memoData as WidgetDataDef<unknown>,
  agenda: agendaData as WidgetDataDef<unknown>,
};
