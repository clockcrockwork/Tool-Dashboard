# Tool-Dashboard v2: design system and UI parts contract

Status: **Draft design proposal**, 2026-11-12. The old monolithic React prototype is a reference, **not an accepted visual specification**. This document defines the boundary between utility behavior and human-facing views, including constrained MCP Apps embedded views.

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
2. **View model/state**: what the user sees and does — display values, validation errors, progress, enabled/disabled actions, busy state. UI actions dispatch typed intents, not host-specific fetch() or localStorage calls.
3. **Presentation contract (parts)**: how a tool opts into known UI regions and reusable primitives; host layouts may rearrange or omit parts while preserving essential data and actions.
4. **Design tokens and shells**: visual styling, density, type scale, motion, focus, and host container/chrome. Board layout remains a separate data model; design tokens do not encode its instance ID or grid position.

A "parts schema" is helpful, but **a full JSON-to-any-UI renderer is not required**. Keep it deliberately small, declarative and first-party; use a handwritten Vue view for image editors, complex calendars, canvases and advanced interactions. Parts are semantic composition contracts, not arbitrary DOM and CSS serialization.

## 2. Minimal part system (candidate)

Use static TypeScript manifests, one registration per utility. Example shape (illustrative; validate with running code):

~~~ts
type HostSurface = "widget" | "standalone" | "mcp-app";
type Region = "heading" | "input" | "controls" | "result" | "status" | "settings";
type PartType = "field" | "button" | "value" | "preview" | "feedback" | "custom";

type PartRef = {
  id: string;                  // stable identifier for testing/accessibility
  type: PartType;
  region: Region;
  dataKey?: string;            // lookup in typed ViewModel, never eval or raw expression
  actionId?: string;           // maps to declared intent; authorization occurs in operation layer
  priority?: number;
  visibility?: Partial<Record<HostSurface, "show" | "compact" | "hide">>;
};

type PresentationSpec = {
  version: 1;
  kind: string;                // utility ID, not board instance ID
  parts: readonly PartRef[];
  visualPreset?: string;       // semantic visual style; no arbitrary script/style injection
  defaultDensity?: "comfortable" | "compact";
};
~~~

- Parts must have stable IDs and semantic roles; no arbitrary event-handler JavaScript, URLs, HTML, class string allowlists, or secret-bearing props in persisted schema.
- ViewModel contains concrete structured values and action state, not a string encoding of code.
- The schema is **not** the persistence schema of a tool's substantive data, and is **not** the JSON schema for MCP tools.
- Host surfaces decide layout/breakpoint/safe area. Visibility rules cannot hide required feedback or destructive-action confirmation; use deliberate host overrides.
- Widget frame supports size and resize constraints from the **existing** board metadata/schema; don't duplicate grid x/y/w/h in tool parts.
- MCP Apps may get host-supplied theme, locale, dimensions and display mode; the host may not supply all of them, so every style variable needs a fallback.

### Example

For a line-ending normalizer, a manifest may describe:
- input: a textarea bound to ViewModel.inputText,
- controls: one choice bound to ViewModel.ending and a Run action,
- result: a value/copy panel bound to ViewModel.outputText,
- status: validation and failure feedback.

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

## 7. Explicitly open visual decisions

The new overall dashboard appearance, initial theme sets, specific shadows/effects, mobile navigation, whether board grid should be freeform on phone, and which components should be authored from scratch remain **undecided**. The 2025 visual prototype should be compared as an option, not blindly reproduced.
