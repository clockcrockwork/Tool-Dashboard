# Project Principles & Rules

## 1. Project Stance
- This project is primarily for personal use.
- The repository is public.
- Anyone may use it by configuring their own environment (self-host / self-config).
- No hosted shared backend or managed SaaS usage is assumed.

## 2. Tool Philosophy
- Each tool MUST be able to function independently.
- A tool MUST work without widget board integration.
- Widget board integration is an enhancement, not a requirement.
- Common cross-tool features (sync, notifications, accounts) are optional and may be added later.

## 3. Widget Board Philosophy
- Home is a widget board (dashboard), not a marketing landing page.
- The widget board provides:
  - Free placement (grid-based)
  - Resizable widgets
  - Show / hide widgets
  - Multiple pages (layouts)
- Editing operations MUST be explicitly gated by "Edit Mode".

## 4. Environment Variables & User Settings
### 4.1 Public vs Secret
- Only public-safe values may be exposed to the browser.
- Secret values (API keys, tokens) MUST NOT be configurable via UI.

### 4.2 Priority Order (Effective Value Resolution)
User Settings (localStorage)
> Public Environment Variables (`PUBLIC_*`)
> Tool Defaults

### 4.3 Fallback Rule
- If configuration is missing or invalid, the tool MUST still function.
- Failure MUST gracefully degrade (never break the UI).

## 5. Offline-First
- Tools MUST work offline whenever reasonable.
- Network usage is optional and treated as an enhancement.
- Failure to fetch remote resources MUST fall back to local behavior.

## 6. Storage & Migration
- All persisted data MUST be versioned.
- Invalid or incompatible data MUST be recoverable (safe reset).
- Data corruption MUST NOT break the application.
- Persisted schema changes MUST include a migration strategy (or safe reset).

## 7. Accessibility & Safety
- Interactive operations (drag, resize) MUST be disabled unless in Edit Mode.
- UI must not cause accidental destructive actions.
- Keyboard navigation should not be blocked by widget board mechanics.

## 8. Optional Sync / Notification Providers
- The core product MUST work in local-only mode (no backend required).
- External providers are treated as optional modules, enabled only when configured by the user.
- Provider selection SHOULD be explicit (e.g. `PUBLIC_SYNC_PROVIDER=none|supabase|convex`, default `none`).
- When providers are enabled, required environment variables MAY be introduced, but MUST NOT be required for local-only usage.

## 9. Client vs Server Processing Priorities
- Default stance: serverless and client-first; prefer completing work in the browser without secret material.
- Priority order (highest to lowest):
  1. Pure client-side JS (UI, state, light work)
  2. JS + Web APIs (external API / serverless functions / webhooks; no secrets stored)
  3. Wasm + JS (for CPU-heavy local compute)
  4. Web APIs + Wasm + JS (when both external I/O and heavy compute are required)
  5. Server-side processing (only when client-only is impractical)
- Exceptions where Wasm may be preferred over Web APIs: offline-first needs, avoiding API key storage, large I/O where local compute beats API round-trips, or compute-heavy tasks with minimal I/O/UI.
- Wasm boundary rules: treat Wasm as pure functions (no DOM/Storage/Network), batch data in/out to avoid chatter, and lazily load Wasm per tool to keep initial load light.
