# Basic Specification & Architecture

## 1. Tech Stack
- Astro: Routing, page shells, static layout
- Vue: Interactive UI, widgets, state handling
- localStorage: Initial persistence layer
- Convex / Supabase: Deferred (Phase 2+)

## 2. Application Structure

apps/web/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro        # Dashboard
│  │  └─ tools/[id].astro   # Tool standalone pages
│  ├─ dashboard/
│  │  ├─ DashboardRoot.vue
│  │  ├─ GridLayout.vue
│  │  └─ EditModeToggle.vue
│  ├─ tools/
│  │  └─ clock/
│  │     ├─ ClockWidget.vue
│  │     ├─ ClockStandalone.vue
│  │     └─ clock.config.ts
│  ├─ lib/
│  │  ├─ storage.ts
│  │  └─ env.ts
│  └─ types/
│     └─ dashboard.ts

## 3. Dashboard Layout Model

### Grid System
- lg: 12 columns
- md: 8 columns
- sm: 4 columns

### Dashboard State
```ts
type DashboardState = {
  version: number;
  activeDashboardId: string;
  pages: DashboardPage[];
};
````

### Layout Rules

* Collision resolution: auto-pack downward
* Resize handles: bottom-right only (MVP)
* Layout stored per breakpoint

## 4. Widget Model

```ts
type WidgetInstance = {
  instanceId: string;
  kind: string;
  settings?: Record<string, unknown>;
  isVisible: boolean;
};
```

## 5. Clock Tool Specification (Initial Tool)

### Core Function

* Digital clock
* Local time by default

### Optional Time Server

* Configurable via:

  * UI (localStorage)
  * PUBLIC_TIME_SERVER_URL
* If unavailable → local time fallback

### Time Sync Behavior

* Fetch server time on load
* Cache offset (server - local)
* Periodic refresh (e.g. 10 min)
* UI updates use local timer + offset

### UI Settings

* 12h / 24h
* Seconds on/off
* Time server URL (optional)

## 6. Persistence

* localStorage
* Versioned schema
* Safe reset on invalid data

## 7. What This Document Does NOT Cover

* Sync between devices
* Notifications
* Authentication
* Cloud storage