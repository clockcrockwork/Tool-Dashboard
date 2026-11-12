# Decision: four-layer UI/operation contracts v1

Decision date: 2026-11-12.
Status: **ACCEPTED DESIGN CONTRACT** for Tool-Dashboard v2; **NOT YET IMPLEMENTED OR RUNTIME-VERIFIED**.
Companion: [quality-gates-v2.md](./quality-gates-v2.md), [architecture-v2.md](./architecture-v2.md), [design-system-and-parts-v2.md](./design-system-and-parts-v2.md).

## Scope and non-goals

Use Vue 3 + Vite + TypeScript for the first Web implementation, IndexedDB as the primary local-data platform (Dexie adapter candidate/selected for the first proof), a Cloudflare Worker for remote MCP, an optional browser Dedicated Web Worker for heavy computations, and a Service Worker for offline application assets. Hono is **not** a required dependency; add it if HTTP route/middleware complexity warrants it. The new Cloudflare `cf` CLI / Vite plugin beta is the first deployment spike, pinned and reversible.

**Do not conflate this four-layer presentation/execution contract with the legacy four-layer storage metadata model** in [schemas.md](./schemas.md) (Board / Tool Common / Metadata / Tool Extension). Both exist; the legacy storage model must be reconciled with IndexedDB and versioned migrations before code is treated as canonical.

The four **new** layers are:

| # | Layer | Canonical source | Stable boundary | May change without changing core logic |
| --- | --- | --- | --- | --- |
| 1 | Operation Schema | Zod 4 schema + TypeScript-inferred types | Stable kind/operation IDs, validated args/results, effect/runtime/exposure | New operations, compatible optional fields |
| 2 | ViewModel | Typed TypeScript model and typed UI intents | Shared state envelope + per-tool state types, no DOM/persistence | Data projections, presentational status, view variants |
| 3 | Parts Schema | Static discriminated TypeScript union | Known part kinds/IDs, view bindings and semantic regions | Add new parts/host arrangements and a custom view |
| 4 | Design Tokens | Typed semantic token map + CSS custom properties | Semantic token names and safe theme values | Colors/typography/spacing/effects/themes without altering operations |

Persisted tool data/config **is a separate cross-cutting concern** that receives its own schema version and migration policy; never encode it as a ViewModel or parts manifest.

## Layer 1 — Operation Schema

- A **utility** has a stable `kind` (e.g. `text-normalize`), metadata and optional operations. A **board instance** has a unique `instanceId`, but is not itself an operation or MCP tool.
- A callable operation has an immutable, globally unique stable ID (e.g. `text.normalize_lines`); one utility may expose zero or more operations. A tool must opt in to remote MCP or WebMCP independently; operations are not automatically exposed because a widget exists.
- The **one source of truth** for externally usable operation input and output is a Zod 4 schema (strict object, JSON-compatible data). Use `z.infer` / `z.input` / `z.output` to derive TypeScript types. Generate any MCP JSON Schema with `z.toJSONSchema()`; do not maintain a hand-edited duplicate schema.
- All input is `unknown` until `schema.parse` / `safeParse`, on both browser and server boundaries. Validate output before exposing or persisting. Keep failures as typed, intentionally narrow error codes; never leak stack traces or secrets to MCP.
- Operations record `effect: read | write`, `dataClass: public | user-private | file`, allowed runtimes (`browser | server`), explicit AI exposures (`remote-mcp | webmcp`), and input/resource bounds. Do not infer authorization from effect metadata: **runtime authorization is required for writes/private data**.
- Public schema must be serializable to JSON Schema. Do **not** use `Date`, `bigint`, `File`, `Map`, `transform`, or non-JSON native values in external I/O; normalize to documented strings, numbers, enums and explicit uploaded content references at the boundary.
- No `any`, unchecked type casts or hidden direct `window`/IndexedDB/Cloudflare imports in core operations. Inject narrow ports for clock, repository, cancellation and other capabilities.
- The execution result must have structured JSON plus a useful readable representation for hosts that do not support MCP Apps. An MCP App UI is **optional** and must not be necessary for the underlying operation to work.

Example (illustrates the accepted contract; not yet compiled):

~~~ts
import { z } from "zod";

export const NormalizeLinesInput = z.strictObject({
  text: z.string().max(50_000),
  ending: z.enum(["lf", "crlf"]),
});
export const NormalizeLinesOutput = z.strictObject({
  text: z.string(),
});

export type NormalizeLinesArgs = z.infer<typeof NormalizeLinesInput>;
export type NormalizeLinesResult = z.infer<typeof NormalizeLinesOutput>;

// An operation definition additionally declares:
// id: "text.normalize_lines"; contractVersion: 1;
// effect: "read"; dataClass: "public";
// runtimes: ["browser", "server"];
// exposeTo: ["remote-mcp", "webmcp"];
// inputSchema: NormalizeLinesInput; outputSchema: NormalizeLinesOutput;
~~~

Use this Zod instance as the source for browser validation, Worker registration, WebMCP registration and generated MCP tool descriptions. The operation implementation itself is independent of the transport.

## Layer 2 — ViewModel (typed, not a storage schema)

- A ViewModel is a **read-only projection** of a tool's current presentation state. It never owns the business truth, IndexedDB connection, Cloudflare authentication or a DOM component.
- Core envelope is fixed: `kind`, `status`, `data`, `feedback` and optional action availability. `status` is a discriminated union (`idle | working | ready | error`) with stable fields for each variant. Each utility provides its own typed `data`.
- The UI emits typed **intents** (e.g. `{ type: "normalize.submit", payload: {...} }`). A controller/application service validates, authorizes, performs the action, then projects the new ViewModel. A view must not directly invoke the MCP endpoint or a DB write for an action already defined in the application service.
- Do not require every action to have an MCP operation (opening settings, copying text, local-only interactions do not need one). Intent names are stable in a utility, but the visual arrangement is not.
- The in-process ViewModel does not require a JSON Schema for every transient field. **Only** a ViewModel or action transported across a process/iframe/persistence boundary needs runtime Zod validation and a versioned serialized envelope.
- For multi-stage/long-running work, use explicit states and progress fields; no "success" before an operation confirms completion. Avoid rendering feedback purely from guessed elapsed time.

Illustrative structural type, not an implementation library:

~~~ts
type UiStatus =
  | { phase: "idle" }
  | { phase: "working"; progress?: number }
  | { phase: "ready" }
  | { phase: "error"; code: string; message: string };

type ViewModel<TData> = Readonly<{
  kind: string;
  status: UiStatus;
  data: Readonly<TData>;
  feedback: readonly { kind: "info" | "warning" | "error"; text: string }[];
}>;
~~~

## Layer 3 — Parts Schema (simple semantic composition)

- Define a **static, typed discriminated union**: `field | action | result | feedback | custom`. Each part has a stable `id`, a semantic `region` (`input | controls | result | status | settings`) and a typed ViewModel binding or declared intent. No arbitrary string-to-code evaluation.
- `custom` is an explicit first-party component reference in the build-time registry, **not** arbitrary HTML/CSS/JS from a user/persisted JSON object.
- Layout/sizing/hosting is determined by the appropriate **Web WidgetShell**, **StandaloneShell**, or **MCPAppShell**. A parts schema cannot replace the dashboard's own grid/drag/resize state.
- Declare variants (`compact | detailed`) as **presentation choices**. A host may reorder parts or shrink density, but must not hide required validation, user consent or destructive-action confirmation. Part IDs are stable for accessibility and tests.
- Only simple tools need the standard parts renderer. A custom calendar, clock face, image editor or canvas may implement a dedicated Vue view over the same ViewModel. Never build a full JSON-driven page builder by default.
- No direct user or AI injection of component constructors/HTML styles. User-configurable parts preferences must use a separate validated persistent data schema.

Typed discriminated shape (**binding keys are checked at compile time**, not arbitrary string paths):

~~~ts
type DataKey<TData> = Extract<keyof TData, string>;
type Region = "input" | "controls" | "result" | "status" | "settings";

type Part<TData extends object, TActionId extends string> =
  | { id: string; kind: "field"; region: "input";
      dataKey: DataKey<TData> }
  | { id: string; kind: "action"; region: "controls";
      actionId: TActionId }
  | { id: string; kind: "result"; region: "result";
      dataKey: DataKey<TData> }
  | { id: string; kind: "feedback"; region: "status" }
  | { id: string; kind: "custom"; region: Region;
      componentId: string };
~~~

A utility manifest declares its data and intent union, so a nonexistent `dataKey` or `actionId` produces a TS error. Part IDs and `custom.componentId` also get runtime uniqueness/registry validation, especially for imported part settings. The compiler-backed implementation may refine the syntax, **not weaken these invariants**.

## Layer 4 — Design Tokens

- Semantic CSS custom properties are the one visual theme interface, with a **typed token-name registry** in TypeScript. The stable API is the *meaning* of a token, not its color/size value.
- Initial groups: `color` (surface/text/accent/success/warning/danger/focus), `space`, `radius`, `type` (size/weight/line-height), `elevation`, `motion`, `density`. Use CSS custom properties with `--td-*` namespace.
- Every shipped theme must supply all required semantic tokens or an explicit shared fallback. A theme change must not touch an operation implementation, data migration or tool-specific input/output type.
- Persist only `themeId` and **allowlisted typed overrides** (e.g. a validated accent-color value, density enum). Reject unsafe raw CSS/URL/script injection in theme import. External backgrounds need independent URI/CSP and upload validation.
- MCP Apps host theme variables map into the same semantic token names in an isolated host shell; the Web board theme is not assumed to be copied into ChatGPT or Claude. Host may change theme, dimensions or locale at runtime; support reactive mapping and safe fallbacks.
- Accessibility checks remain required: contrast, focus, keyboard, reduced-motion, touch target size, phone layout. Not all themes must replicate the 2025 glassmorphism concept.

Example of role-based tokens:

~~~css
:root {
  --td-color-surface: #181a25;
  --td-color-text: #f7f7fb;
  --td-color-accent: #9b7df5;
  --td-space-2: 0.5rem;
  --td-radius-card: 1rem;
}
~~~

## Stable contracts versus flexible changes

| Change | Rule |
| --- | --- |
| Add new operation, part, theme or optional ViewModel property | Allowed with build/contract tests; defaults/fallbacks required if user data persists |
| Change an operation's existing required input, meaning, side effects or output type | Breaking: new operation ID or explicitly versioned compatibility adapter; no silent behavior change |
| Rename/remove `kind`, operation ID, part ID referenced by persisted user settings, or semantic token key | Breaking; requires migration/alias and tests; do not silently repurpose an old ID |
| Change a visual token value, component appearance, layout density or reorder optional parts | Compatible; visual/a11y regression checks, no domain/schema version bump |
| Change ViewModel internals in the same JS process | Safe if all typed consumers pass; bump wire version **only if** it crosses an iframe/process/persistent boundary |
| Change persisted board/tool config/data | Separate ordered migration, backup/round-trip tests, no silent data loss |
| Receive newer unknown schema or unknown widget kind | Preserve raw data and display non-destructive unsupported placeholder/read-only state; never auto-reset or overwrite |

**Version identity is not one global number.** Keep `operation.contractVersion` (plus stable operation IDs), `parts.schemaVersion`, `theme.schemaVersion`, and per-tool `configVersion`/`dataVersion` independently. The in-process ViewModel has no unnecessary version; serialized ViewModel envelopes are versioned if required. No version bump for mere paint/color changes.

## Durable data and registry rules outside the four layers

- A build-time **first-party utility registry** owns one `kind` per utility; adapters derive supported operations and views from it. Never duplicate MCP operation declarations in a separate registry.
- The proposed IndexedDB (Dexie) schema owns board state, per-instance settings, tool-specific durable data and migrations in **separate stores/logical domains**. A widget can have many instances of one kind; a standalone utility has an independent stable settings identity. The Worker cannot read browser IndexedDB.
- Data records use stable IDs, `schemaVersion` where persisted format evolves, explicit migration functions and recovery/backup. Preserve unknown variants on import; safely reject unsupported newer versions without destructive writes.
- Board layout and tools' business data are not the same thing. Styling tokens are not stored inside operation data. No user-private state is shared across Web/MCP until authenticated sync is separately implemented.
- Avoid introducing a general dynamic plugin platform, third-party modules or speculative abstraction for tools that don't exist.

## Required design acceptance before any tool implementation

1. Confirm the first TypeScript package can **compile** the declared Operation/ViewModel/Parts/Token types; document any necessary ergonomic refinements, preserving the above semantics.
2. Confirm one manifest creates a standalone and widget UI and registers only explicitly exposed MCP/WebMCP operations.
3. Confirm the second different tool does not require modifying the protocol adapters or shared business core.
4. Confirm switching themes/host shells changes visuals only, with operation fixtures unchanged.
5. Confirm persistent schema evolution and older exports round-trip without silent loss.

See [quality-gates-v2.md](./quality-gates-v2.md) for lint, types, contract tests, snapshot and CI rules. No claim of passing checks is made before an actual build exists.
