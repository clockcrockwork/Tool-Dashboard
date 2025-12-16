# Development Guide & PR Rules

## 1. Implementation Rules

### Tool Implementation Rules
- Each tool lives in its own directory.
- Tool MUST work as:
  - Standalone page
  - Dashboard widget
- Tool MUST handle failure states gracefully.

### UI Rules
- Drag & resize only in Edit Mode
- Settings changes must be reversible
- Destructive actions must be explicit

### Network Rules
- Network calls must be optional
- Timeout must be short
- Failure must not block UI

## 2. Tool Implementation TODO Template

### Tool: <tool-name>

- [ ] Standalone page renders correctly
- [ ] Widget version renders correctly
- [ ] Default behavior works with no configuration
- [ ] Optional configuration works
- [ ] Invalid configuration fallback works
- [ ] Offline behavior verified
- [ ] Settings persistence verified
- [ ] Minimal help text added

## 3. Clock Tool – Initial TODO

- [ ] Digital time display
- [ ] Seconds toggle
- [ ] 12h / 24h toggle
- [ ] Time server URL setting
- [ ] Offset calculation
- [ ] Timeout handling
- [ ] Fallback to local time
- [ ] Widget resize handling

## 4. Pull Request Template

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
- [ ] Tool works in dashboard
- [ ] No required environment variables
- [ ] Fallback behavior verified
- [ ] Versioned storage updated if needed
- [ ] Docs updated if applicable

### Screenshots / Demo
(Optional)

### Future Work
(Optional)