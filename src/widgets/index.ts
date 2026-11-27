/**
 * Widget implementations. Each entry is lazy so heavy tools load only when placed or opened
 * (実装ガイド 8章「開く速さ」). Widgets without an implementation yet (P2) are absent here;
 * the catalog still lists them (see docs/lgd/development-flow.md).
 */
import { defineAsyncComponent, type Component } from 'vue';
import type { WidgetDataDef } from '../app/store/store';
import type { Runner } from '../app/runtime/runtime';
import { alarmRunner } from './alarm/runner';
import { pomoRunner } from './pomo/runner';
import { todoData } from './todo/data';
import { linksData } from './links/data';
import { memoData } from './memo/data';
import { agendaData } from './agenda/data';
import { alarmData } from './alarm/data';
import { timelogData } from './timelog/data';
import { punchData } from './punch/data';
import { habitData } from './habit/data';
import { counterData } from './counter/data';

export const WIDGETS: Readonly<Record<string, Component>> = {
  clock: defineAsyncComponent(() => import('./clock/ClockWidget.vue')),
  weather: defineAsyncComponent(() => import('./weather/WeatherWidget.vue')),
  rain: defineAsyncComponent(() => import('./rain/RainWidget.vue')),
  search: defineAsyncComponent(() => import('./search/SearchWidget.vue')),
  todo: defineAsyncComponent(() => import('./todo/TodoWidget.vue')),
  links: defineAsyncComponent(() => import('./links/LinksWidget.vue')),
  memo: defineAsyncComponent(() => import('./memo/MemoWidget.vue')),
  // P2a 時間
  world: defineAsyncComponent(() => import('./world/WorldWidget.vue')),
  alarm: defineAsyncComponent(() => import('./alarm/AlarmWidget.vue')),
  pomo: defineAsyncComponent(() => import('./pomo/PomoWidget.vue')),
  stopwatch: defineAsyncComponent(() => import('./stopwatch/StopwatchWidget.vue')),
  countdown: defineAsyncComponent(() => import('./countdown/CountdownWidget.vue')),
  timelog: defineAsyncComponent(() => import('./timelog/TimelogWidget.vue')),
  punch: defineAsyncComponent(() => import('./punch/PunchWidget.vue')),
  gantt: defineAsyncComponent(() => import('./gantt/GanttWidget.vue')),
  // P2b 予定と記録
  agenda: defineAsyncComponent(() => import('./agenda/AgendaWidget.vue')),
  month: defineAsyncComponent(() => import('./month/MonthWidget.vue')),
  week: defineAsyncComponent(() => import('./week/WeekWidget.vue')),
  habit: defineAsyncComponent(() => import('./habit/HabitWidget.vue')),
  counter: defineAsyncComponent(() => import('./counter/CounterWidget.vue')),
  recorder: defineAsyncComponent(() => import('./recorder/RecorderWidget.vue')),
  sketch: defineAsyncComponent(() => import('./sketch/SketchWidget.vue')),
};

/**
 * Full-screen views by kind (仕様書 2章「全画面ウィジェット」 `.fsw`). DashboardRoot renders one per full-screen screen
 * (`layout.fullScreens`), passing the placement ID. Widgets and views receive the placement ID as the `id` prop and
 * read their settings and records through `useWidget(id)`.
 */
export const FULLSCREEN: Readonly<Record<string, Component>> = {
  clock: defineAsyncComponent(() => import('./clock/ClockFullScreen.vue')),
  sketch: defineAsyncComponent(() => import('./sketch/SketchFullScreen.vue')),
};

/**
 * Saved records by kind (区画 `w:<配置ID>` の data; each placement keeps its own record). `agenda` was registered before its widget so
 * that メモから予定への追加 is stored.
 */
export const WIDGET_DATA: Readonly<Record<string, WidgetDataDef<unknown>>> = {
  todo: todoData as WidgetDataDef<unknown>,
  links: linksData as WidgetDataDef<unknown>,
  memo: memoData as WidgetDataDef<unknown>,
  agenda: agendaData as WidgetDataDef<unknown>,
  // P2a 時間. ポモドーロ・ストップウォッチの計測は保存しない（runtime、各 status.ts）。世界時計・カウントダウン・タイムスケジュールは記録を持たない.
  alarm: alarmData as WidgetDataDef<unknown>,
  timelog: timelogData as WidgetDataDef<unknown>,
  punch: punchData as WidgetDataDef<unknown>,
  // P2b 予定と記録. 月間・週間は記録を持たない。録音（音声）とスケッチの線は保存しない（実装ガイド 6章。各 status.ts の runtime）.
  habit: habitData as WidgetDataDef<unknown>,
  counter: counterData as WidgetDataDef<unknown>,
};

/**
 * Handlers the Dashboard's runtime starts for every placement of these kinds while it runs (`src/app/runtime/runtime.ts`;
 * registry `run`: `watch` / `continuous`). Loaded eagerly (small), independent of whether the view is placed or drawn.
 * Kinds whose run can be computed from a start time (stopwatch) need none.
 */
export const WIDGET_RUNNERS: Readonly<Record<string, Runner>> = {
  alarm: alarmRunner,
  pomo: pomoRunner,
};
