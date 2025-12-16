# Development Guide & PR Rules

## 1. Implementation Rules

### Tool Implementation Rules
- Each tool lives in its own directory.
- Tool MUST work as:
  - Standalone page
  - Widget board widget
- Tool MUST handle failure states gracefully.
- Tool MUST provide a versioned persisted config and a config migration (or safe-reset) strategy.

### UI Rules
- Drag & resize only in Edit Mode.
- Settings changes must be reversible.
- Destructive actions must be explicit (including config reset).

### Network Rules
- Network calls must be optional.
- Timeout must be short.
- Failure must not block UI.

## 2. Persistence Rules

### localStorage key naming
- All keys MUST be namespaced and versioned.
- Recommended:
  - `wb:v1:boardState`
  - `wb:v1:toolConfig:<instanceId>`
  - `wb:v1:userSettings` (public-safe only)

### Core requirement
- Local-only mode MUST work with zero environment variables.
- Provider-enabled mode MAY require environment variables, but MUST be gated behind an explicit provider flag.

## 3. Tool Implementation TODO Template

### Tool: <tool-name>

- [ ] Standalone page renders correctly
- [ ] Widget version renders correctly
- [ ] Default behavior works with no configuration
- [ ] Optional configuration works
- [ ] Invalid configuration fallback works
- [ ] Offline behavior verified
- [ ] Settings persistence verified
- [ ] Config migration (or safe reset) verified
- [ ] Minimal help text added

## 4. Clock Tool – Initial TODO

- [ ] Digital time display
- [ ] Seconds toggle
- [ ] 12h / 24h toggle
- [ ] Time server URL setting (UI + PUBLIC_TIME_SERVER_URL)
- [ ] Offset calculation
- [ ] Timeout handling
- [ ] Fallback to local time
- [ ] Widget resize handling
- [ ] Config migration/safe-reset

## 5. Pull Request Template

### Summary
Describe what was added or changed.

### Motivation
Why is this change needed?

### Implementation Notes
- Key decisions
- Trade-offs
- Known limitations

### Checklist
- [ ] Tool works standalone
- [ ] Tool works in widget board
- [ ] Local-only mode works with no required environment variables
- [ ] Fallback behavior verified (invalid config / network failure)
- [ ] Versioned storage updated if needed
- [ ] Migration or safe reset implemented (if schema changed)
- [ ] Docs updated if applicable

### Screenshots / Demo
(Optional)

### Future Work
(Optional)
