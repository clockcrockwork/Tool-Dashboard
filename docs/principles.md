# Project Principles & Rules

## 1. Project Stance
- This project is primarily for personal use.
- The repository is public.
- Anyone may use it freely by configuring their own environment (self-host / self-config).
- No hosted shared backend or managed SaaS usage is assumed.

## 2. Tool Philosophy
- Each tool MUST be able to function independently.
- A tool MUST work without dashboard integration.
- Dashboard integration is an enhancement, not a requirement.
- Common features (sync, notifications, accounts) are optional and added later.

## 3. Dashboard Philosophy
- Home is a dashboard, not a marketing landing page.
- Dashboard is a widget board:
  - Free placement (grid-based)
  - Resizable widgets
  - Show / hide widgets
  - Multiple dashboard pages
- Editing operations are explicitly gated by "Edit Mode".

## 4. Environment Variables & Settings
### 4.1 Public vs Secret
- Only **public-safe values** may be exposed to the browser.
- Secret values (API keys, tokens) MUST NOT be configurable via UI.

### 4.2 Priority Order
UI Settings (localStorage)
> Public Environment Variables (`PUBLIC_*`)
> Default fallback behavior

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

## 7. Accessibility & Safety
- Interactive operations (drag, resize) MUST be disabled unless in Edit Mode.
- UI must not cause accidental destructive actions.
- Keyboard navigation should not be blocked by dashboard mechanics.