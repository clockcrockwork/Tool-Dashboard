# Tool-Dashboard v2: design system and UI parts contract

Status: **Accepted separation of concerns** (2026-11-12); visual look and implementation are not yet verified. The canonical four-layer data types and version rules are in [four-layer-contracts-v2.md](./four-layer-contracts-v2.md), and mandatory lint/typecheck/schema tests are in [quality-gates-v2.md](./quality-gates-v2.md). The old monolithic React prototype is a reference, **not an accepted visual specification**. This document describes UI use of the fixed contracts across Web and MCP Apps.

## 1. The separation that actually matters

~~~text
Utility operation: inputs + semantics + typed result + side effect rules
                    |
                 ViewModel
                    |
       Tool presentation / optional parts description
                    |
       Reusable visual components + design tokens
                    |
          Host-specific shell / layout
       / Widget / Standalone / MCP App \
~~~

Keep four independent contracts:

1. **Operation schema** (already proposed in tool-module-contract-v2.md): validated inputs/outputs for an AI-callable function and direct application use. Contains no visual style.
2. **ViewModel/controller**: read-only projected committed data, per-view editable draft, validation feedback and async status. Fields emit typed change intents into the controller; host-specific fetch()/IndexedDB access and remote refresh stay outside the view.
3. **Presentation contract (parts)**: how a tool opts into known UI regions and reusable primitives; host layouts may rearrange or omit parts while preserving essential data and actions.
4. **Design tokens and shells**: visual styling, density, type scale, motion, focus, and host container/chrome. Board layout remains a separate data model; design tokens do not encode its instance ID or grid position.

A "parts schema" is helpful, but **a full JSON-to-any-UI renderer is not required**. Keep it deliberately small, declarative and first-party; use a handwritten Vue view for image editors, complex calendars, canvases and advanced interactions. Parts are semantic composition contracts, not arbitrary DOM and CSS serialization.

## 2. Minimal part system (accepted v1)

Use static TypeScript manifests, one registration per utility. The **canonical** union is `field | action | result | feedback | custom` in [four-layer-contracts-v2.md](./four-layer-contracts-v2.md). Do not introduce alternative `button/value/preview` enum names or an arbitrary `dataKey: string` that cannot be checked against a ViewModel.

~~~ts
// The generic Part<TData, TActionId> type is defined canonically
// in four-layer-contracts-v2.md.
type HostSurface = "widget" | "standalone" | "mcp-app";
type PresentationSpec<TData extends object, TActionId extends string> = {
  schemaVersion: 1;
  kind: string;
  parts: readonly Part<TData, TActionId>[];
  variants?: Partial<Record<HostSurface, "compact" | "detailed">>;
};
~~~

`PresentationSpec` is an illustrative **shape**; the exact compiled type will import `Part` from the one canonical source. Avoid duplicating this contract in production packages.

- Parts must have stable, unique IDs and semantic roles; no arbitrary event-handler JavaScript, HTML, inline CSS or secret-bearing props in persisted schema.
- Each field's `draftKey` / `changeIntentId` is checked against its typed draft/change-intent union, and each result's `dataKey` against committed ViewModel data. Submit uses a snapshot of the draft and validates operation args via Zod; incomplete/invalid edit values stay in draft rather than coercing or executing. Referenced custom components are checked against a local first-party registry.
- The Parts contract is **not** the persistence schema of tool data, and is **not** the input/output JSON Schema for MCP tools.
- Host surfaces decide layout/breakpoint/safe area. Visibility overrides cannot hide required feedback, consent or destructive-action confirmation.
- Widget frame uses size/resize constraints from Board metadata/schema; no grid x/y/w/h in tool Parts.
- MCP Apps may get theme, locale and dimensions from their host; if unavailable, all styles have accessible fallback values.

### Example

For a line-ending normalizer, a manifest may describe:
- input: a textarea bound to per-view `draft.inputText` via a typed change intent,
- controls: an `ending` selector bound to draft and a Submit intent which snapshots/validates the operation args,
- result: a value/copy panel bound to committed result data,
- status: parse errors, pending/ready/error, and an external-update conflict notice without dropping dirty draft.

On the widget surface, output may be compact. On a standalone page, it can expand to a large dual-pane editor. In an MCP App, the tool result may initially be text-first with an optional focused view. **All use the same operation**, but not necessarily the same layout/component tree.

## 3. Design tokens (keep visual design replaceable)

Suggested token groups:

| Layer | Example | Owner |
| --- | --- | --- |
| Global brand | typography, accessible color roles, spacing scales, radius, elevation | Design system |
| Themes | light, dark, custom user theme, background treatment, accent | Design system/board settings |
| Density | compact/comfortable, touch-target sizes | Host shell |
| Semantic state | focus, error, warning, disabled, success, busy | Design system |
| Motion | duration/easing, reduced-motion fallback | Design system |
| Tool-local | chart palette, editor sizing, item/card chrome variants | A tool's presentation, referencing global tokens |
| Host mapping | MCP Apps host CSS variables to Tool-Dashboard tokens | MCP App shell |

**Use CSS custom properties for visual tokens**, with types/constraints on user theme settings. Example:

~~~css
:root {
  --td-surface: #181a25;
  --td-text: #f7f7fb;
  --td-accent: #9b7df5;
  --td-radius-card: 1rem;
  --td-space-2: 0.5rem;
}
[data-host="mcp-app"] {
  --td-surface: var(--color-background-primary, #181a25);
  --td-text: var(--color-text-primary, #f7f7fb);
}
@media (prefers-reduced-motion: reduce) {
  :root { --td-motion-duration: 0ms; }
}
~~~

- Let the user switch themes or widget sizes without editing utility operation code.
- Widget chrome (header, card, resize handle, settings, focus) is separate from the tool's own view.
- MCP App iframe uses a host-specific shell, reads hostContext/styles and maps known variables; its visual style should feel native while preserving utility identity.
- A polished public portfolio can show the distinctive board design; an embedded ChatGPT tool should prioritize clarity and host fit. **Pixel identity across different hosts is not a requirement.**
- Avoid turning current neumorphism/glassmorphism samples into fixed UI acceptance criteria. Compare real rendered screenshots, accessibility and device experience before freezing a design direction.

Primary MCP Apps style references:
- [MCP Apps theming specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)
- [MCP Apps host-context patterns](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/patterns.md)

## 4. Shell composition and implementation scope

~~~text
Design tokens + common primitives
  ├─ WebStandaloneShell (navigation, generous layout, settings)
  ├─ BoardWidgetShell (edit mode, drag/resize, chrome)
  └─ MCPAppShell (iframe bridge, host theme, safe area, compact result)
                        |
                 Optional ToolView.vue
                        |
              ViewModel + typed intents
                        |
               Shared application service
~~~

- Each utility view should be independent of BoardRoot and *not* know its x/y grid position.
- The same Vue component may be used with responsive variants when convenient. It is not mandatory to reuse one component for every surface; separate views can bind one ViewModel/operation.
- Tool-specific visuals such as a big clock face or complex image editor are first-class custom views rather than hacks over generic field widgets.
- A UI-first widget with no meaningful operation can still be registered. Conversely, a pure operation with no human-facing UI can still be exposed via MCP.
- Existing separate utility applications may be linked/integrated by adapter; do not force code migration to acquire a "Tool-Dashboard look".

## 5. Implement only the minimum primitives first

For initial vertical slice, restrict primitives to: Field, Action, Result, Feedback, plus shared WidgetShell and host-specific Shells. Add Preview/Chart/Calendar/etc only when real tools need them. **No runtime plugin marketplace, schema-authored arbitrary HTML, dynamic scripting, or generic drag/drop page builder.**

Developer experience for a second utility:

1. Write a tool definition with metadata, declared operations (optional), data/config schema.
2. Use a ViewModel and the existing primitive parts or a focused custom Vue view.
3. Select widget/standalone/MCP App presentation(s) needed; no unused blank views.
4. Select explicit agent exposure and compatible runtime(s); common adapters register only supported operations.
5. Add tests for the view's states, theme switch, responsive layout, keyboard/focus feedback and operation result.

## 6. Design verification

- A simple form tool and an unusual visual tool (e.g., clock/color visualizer) share the same visual tokens/host shells **without** sharing forced layouts.
- Changing the board theme changes UI visuals but leaves all operation golden fixtures identical.
- Compact widget, phone standalone and MCP Apps iframe show intentional, useable compositions. Screenshot inspections and keyboard/touch tests catch issues that a JSON schema alone cannot.
- Unsupported embedded host styling falls back to a readable neutral theme. Host variables and locale/size can change after mount.
- Local storage, server auth and private data access are not available merely because a component renders.
- Re-render and resize of widgets must not inadvertently restart file conversions or mutate persistent data.
- An external AI commit updates all clean views of a shared target; a dirty editor retains its draft/baseRevision and visibly reports a newer committed revision. A stale save fails with CONFLICT and offers comparison/reapply, never silently overwrites.
- Each mounted view owns its draft/subscription cleanup and invocation order; mounting a second widget does not create duplicated provider writes or unbounded subscriptions. Keyboard/focus/error and browser visibility/reconnect refresh remain test cases. The provider transport itself is specified in the module and architecture docs, not in visual Parts.

## 7. Explicitly open visual decisions

The new overall dashboard appearance, initial theme sets, specific shadows/effects, mobile navigation, whether board grid should be freeform on phone, and which components should be authored from scratch remain **undecided**. The 2025 visual prototype should be compared as an option, not blindly reproduced.
