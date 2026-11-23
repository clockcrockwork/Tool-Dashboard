/**
 * Widget implementations. Each entry is lazy so heavy tools load only when placed or opened
 * (実装ガイド 8章「開く速さ」). Widgets without an implementation yet (P2) are absent here;
 * the catalog still lists them (see docs/lgd/development-flow.md).
 */
import { defineAsyncComponent, type Component } from 'vue';
import type { WidgetDataDef } from '../app/store/store';

export const WIDGETS: Readonly<Record<string, Component>> = {
  clock: defineAsyncComponent(() => import('./clock/ClockWidget.vue')),
};

/** Full-screen views (仕様書 2章「全画面ウィジェット」 `.fsw`). Always rendered; the view hides itself with `.off` when not full-screen. */
export const FULLSCREEN: Readonly<Record<string, Component>> = {};

/** Per-widget saved records (区画 `w:<id>` の data). */
export const WIDGET_DATA: Readonly<Record<string, WidgetDataDef<unknown>>> = {};
