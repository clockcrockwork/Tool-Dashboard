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

## 9. Advanced Editing Features

### Widget Lock
- UX flow: toggle lock on a widget from its context menu; locked state shows a lock badge and disables drag/resize handles.
- Operation restrictions: locked widgets cannot be moved, resized, grouped, or edited; unlock via the same menu.
- Error handling: attempts to move/resize a locked widget should show a non-blocking toast explaining the lock.

### Multi-Select Grouping
- UX flow: shift+click or drag-selection to pick multiple widgets, then choose “Group” in the toolbar; group shows a bounding box with a group label.
- Group creation/removal: group creates a parent container id; ungroup via toolbar action restores individual widget controls and layout records.
- Error handling: grouping should fail gracefully if any selected widget is locked (toast explaining failure; no partial groups created).

### Snap Guides
- UX flow: while dragging/resizing, snap guides appear on alignment to sibling edges and grid columns.
- Precision: snap tolerance defaults to 8px offset from guide; snapping can be disabled per session via a toolbar toggle.
- Error handling: if snap calculation fails (e.g., missing layout data), fall back to free-move and hide guides to avoid jitter.

### JSON Export/Import
- UX flow: export downloads the current board state as JSON; import opens a file picker and previews validation results before applying.
- Schema versioning: exported payload includes `schemaVersion`; imports must migrate or reject older versions with clear messaging.
- Validation: validate required fields (pages, instances, layouts); on failure, show an error summary and do not mutate existing state.

### Z-Index Management
- UX flow: context menu actions for “Bring to Front/Back” adjust stacking; preview outlines show target layer before commit.
- Defaults: widgets start at z-index 0; upper bound is clamped at 999 to avoid CSS overflow issues.
- Error handling: if z-index updates clash (e.g., duplicate max), rebalance by normalizing the stack order and log a warning toast.
