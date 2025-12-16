# Basic Specification & Architecture

## 1. Tech Stack
- Astro: Routing, page shells, static layout
- Vue: Interactive UI, widgets, state handling
- localStorage: Core persistence for local-only mode (MVP)
- Sync/Notification Providers (Optional): Supabase / Convex / Web Push (Phase 2+ and only when enabled)

> Principle: The system MUST fully work without any backend configured. Providers are optional modules.

## 2. Application Structure

apps/web/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro        # Widget board (dashboard)
│  │  └─ tools/[kind].astro # Tool standalone pages
│  ├─ board/
│  │  ├─ BoardRoot.vue
│  │  ├─ GridLayout.vue
│  │  └─ EditModeToggle.vue
│  ├─ tools/
│  │  └─ clock/
│  │     ├─ ClockWidget.vue
│  │     ├─ ClockStandalone.vue
│  │     ├─ clock.settings.ts
│  │     └─ clock.metadata.ts
│  ├─ registry/
│  │  └─ toolRegistry.ts
│  ├─ lib/
│  │  ├─ storage.ts
│  │  ├─ env.ts
│  │  └─ migrations.ts
│  └─ types/
│     ├─ board.ts
│     └─ tools.ts

## 3. Widget Board Model

### Grid System
- lg: 12 columns
- md: 8 columns
- sm: 4 columns

### State (Persisted)
```ts
type WidgetBoardState = {
  version: number;
  activePageId: string;
  pages: WidgetBoardPage[];
};
```

```ts
type WidgetBoardPage = {
  pageId: string;
  name: string;

  // Widget instances that exist on this page (source of truth for kind/config)
  instances: WidgetInstance[];

  // Layout per breakpoint (position/size only; references instances by instanceId)
  layouts: Record<Breakpoint, WidgetLayoutItem[]>;
};
```

### Layout Rules (MVP)
- Collision resolution: auto-pack downward
- Resize handles: bottom-right only
- Layout is stored per breakpoint

### Breakpoint Fallback (Required)
- If a breakpoint layout is missing, generate it by degrading from the nearest larger layout:
  - sm <- md <- lg
- Generation MUST clamp widths to the target column count and then auto-pack.

## 4. Widget Instance Model

```ts
type WidgetInstance = {
  instanceId: string;
  kind: string;

  isVisible: boolean;

  // Persisted user configuration (versioned, migratable, safe-resettable)
  config?: ToolConfig;
};
```

> Runtime-only state (e.g., transient UI state, timers in progress) SHOULD NOT be persisted by default.

## 5. Tool Registry Contract

Each tool kind MUST be registered with a tool registry that connects:
- metadata (title/tags/default size)
- components (Widget and Standalone)
- default config
- config migration

```ts
type ToolRegistration = {
  kind: string;
  metadata: ToolMetadata;
  WidgetComponent: any;
  StandaloneComponent: any;

  defaultConfig: ToolConfig;
  migrateConfig: (input: unknown) => MigrationResult<ToolConfig>;
};
```

## 6. Clock Tool Specification (Initial Tool)

### Core Function
- Digital clock
- Local time by default

### Optional Time Server
- Configurable via:
  - UI (localStorage)
  - PUBLIC_TIME_SERVER_URL
- If unavailable → local time fallback

### Time Sync Behavior
- Fetch server time on load (single request)
- Cache offset (server - local)
- Periodic refresh (e.g. 10 min; MUST NOT poll per-second)
- UI updates use local timer + offset
- Timeout MUST be short (e.g. 2s) and failures MUST degrade silently

### UI Settings (Persisted Config)
- 12h / 24h
- Seconds on/off
- Time server URL (optional)

## 7. Persistence
- localStorage as MVP persistence
- Versioned schema + safe reset on invalid data
- Persisted keys MUST be namespaced (see dev-guide)

## 8. Out of Scope (for this document)
- Cross-device sync behavior details
- Push subscription lifecycle details
- Authentication / accounts
