# Tool-Dashboard v2: Utility module / operation contract (proposal)

Status: draft, 2026-11-12. Companion to [architecture-v2.md](./architecture-v2.md).
The main goal is **quickly adding widgets without separately rewriting the same operation for WebMCP, remote MCP and MCP Apps**. This is an implementation design, not a claim that existing code already implements the interfaces below.

## 1. Core distinctions

| Concept | Stable identity | Responsibilities | Must exist? |
| --- | --- | --- | --- |
| Utility kind | e.g. clock, text-normalize | One independently useful utility and its manifest | Yes |
| Board instance | Random instanceId | Placement, visibility, instance preferences | Only when placed on board |
| Operation | e.g. text.normalize_lines | Typed input/result, validation, deterministic behavior or controlled side effect | Only when callable functionality exists |
| View | Widget / Standalone / MCP App presentation | Show state/result, collect user intent | Only for selected surface |
| Adapter | MCP / WebMCP / MCP Apps / Web host | Host protocol, lifecycle, permissions, routing | Shared infrastructure, not per widget |
| Data provider | local, explicit remote service | Persistent data, optional auth/sync, conflict handling | Only for data-bearing utilities |

An operation is **not** a widget instance. Do not expose a generic command accepting arbitrary kind/config; schema-per-operation is required.

## 2. Minimum module convention

Keep one module per utility, statically included in a build-time catalog:

~~~text
packages/tools/
  clock/
    definition.ts            # id, metadata, config schema; no AI ops required
    config.ts                # migration/defaults
    clock.test.ts
  text-normalize/
    definition.ts            # metadata + explicit operation descriptors
    operations.ts            # pure implementation, validation, no UI
    operations.test.ts

packages/tool-ui/
  clock/ToolView.vue
  text-normalize/ToolView.vue

apps/web/
  tool-view-loaders.ts       # lazy imports; standalone/board shells
  webmcp/register.ts        # one common WebMCP adapter, feature-detected

apps/mcp/
  register-tools.ts         # one common MCP adapter, stateless server
  register-ui.ts            # optional versioned MCP Apps resources
~~~

For the first tool, a single workspace package is fine if it enforces the same import boundaries. Split packages only when a second runtime actually needs to consume them.

## 3. Proposed typed definition (illustrative API)

The exact TypeScript interface and schema library should be finalized with the first compiling fixture. The following shape describes the invariants, not pre-tested code:

~~~ts
type ExecutionSurface = "browser" | "server";
type AgentSurface = "remote-mcp" | "webmcp";

type OperationDefinition<Input, Output> = {
  id: string;                    // globally unique + stable: "text.normalize_lines"
  title: string;
  description: string;           // human / agent discoverability
  inputSchema: Schema<Input>;    // one source of truth; JSON Schema export
  outputSchema: Schema<Output>;
  runtimes: readonly ExecutionSurface[];
  exposeTo: readonly AgentSurface[]; // explicit opt-in, not by default
  effect: "read" | "write";
  dataClass: "public" | "user-private" | "file";
  inputLimit: number;
  execute(input: Input, context: OperationContext): Promise<Output>;
};

type UtilityDefinition<Config> = {
  kind: string;                  // stable and distinct from instanceId
  version: string;               // version of tool/operation definitions
  metadata: ToolMetadata;       // reuse existing Board/Metadata schema
  config: {
    schemaVersion: number;
    defaults: Config;
    migrate(input: unknown): Config;
  };
  operations?: readonly OperationDefinition<unknown, unknown>[];
  ui?: {
    widget?: boolean;
    standalone?: boolean;
    mcpApp?: { operationIds: readonly string[]; resourceVersion: string };
  };
};
~~~

Schema<Input> is illustrative, not an SDK type. Choose one validation/schema source (e.g. Zod 4.2+ for current MCP SDK v2 / ext-apps 2.x) in the implementation, and derive server and browser tool schemas from that source. Always validate runtime args/results on the executing side; TypeScript alone does not validate untrusted JSON.

The OperationContext must expose **narrow, injected ports** (e.g., authenticated task repository, explicit request cancellation, clock, limits) rather than an ambient global database/window. Browser-local and Worker-backed contexts can execute a common operation only when their provider semantics intentionally match. Adapter-specific network/auth glue must not leak into the core function.

### Example: simple pure function (not a production tax spec)

~~~ts
export function normalizeLineEndings(
  text: string,
  ending: "lf" | "crlf"
): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  return ending === "crlf" ? normalized.replace(/\n/g, "\r\n") : normalized;
}
~~~

The same fixture must produce exactly the same result when invoked directly, via a WebMCP adapter, and via remote MCP **for a platform-compatible operation**. Browser-only file APIs are excluded from server support unless a distinct, explicit server input/transport has been designed.

## 4. Registry and adapter policy

- **One handwritten registration point per utility**: its definition and entry in a first-party static catalog. The catalog lists utilities, not installed copies/instances. Do not create a second independent MCP schema registry for the same operation.
- Shared adapters enumerate only supported operations; e.g. remote MCP selects operations with "server" in runtimes and "remote-mcp" in exposeTo; WebMCP selects browser + webmcp operations.
- If framework/build tooling makes lazy UI discovery straightforward, map UI components through build-time glob or static imports. **Do not force Vue UI into the Worker bundle** or make runtime filesystem discovery a requirement.
- Do not dynamically execute third-party modules, install remote plugins, or allow users to paste arbitrary operation source. Registry is first-party and build-time for v2.
- Keep UI flags and executable capabilities distinct. UI-only widgets do not create fake model tools.
- UI app resources are **explicitly associated only with selected operations**. The common MCP Apps adapter handles ui:// registration, iframe bridging and result forwarding. A utility supplies its small view/entry bundle, not a duplicate server.
- MCP Apps may need a separate render-only operation for heavy, multi-step flows. That is an opt-in design per utility, not a mandatory extra endpoint for every operation.

### No silent cross-surface state

Pass results as JSON-serializable data, not live browser component references or open local file handles. MCP App tool input/results are delivered through the host bridge; the iframe must not assume it can call the web dashboard's localStorage or authenticated origin directly.

For write operations, the same application-service validation, permissions and commit boundaries must hold whether invoked from UI, WebMCP or remote MCP. Avoid exposing write operations before their data provider and auth are real.

## 5. State separation and migrations

Use the existing four-layer persisted schemas as the basis; do **not** add protocol details to the Board schema.

| Category | Sample | Ownership |
| --- | --- | --- |
| Board layout | x/y/w/h, page, collapsed state | Board schema |
| Instance config | clock format, color preference, version | Tool extension config, board-bound instance |
| Tool data | tasks, saved text rules, history | Tool-specific repository/store |
| Runtime state | open panel, loading, current timer tick | UI host only by default |
| Host connection | MCP session, iframe theme, browser tool registration | Adapter, never board persistence |

- Enforce one canonical config store. Existing docs suggest both embedded config and independent localStorage keys. With IndexedDB now being considered, **a normalized config store keyed by explicit board instance/standalone identity is the leading candidate**, not an accepted final choice. Resolve with actual import/export, multi-instance and migration tests before writing final schema; no shadow writes. See [platform-and-data-v2.md](./platform-and-data-v2.md).
- Each standalone tool must behave even if it has never been on a board. A deterministic namespace for its config/data must not require an instanceId.
- Preserve unknown widget kinds during import/export, display an "unavailable tool" placeholder instead of deleting their board instances, and do not execute unrecognized operations.
- Separate protocol/operation version changes from persisted config/data migrations; they are not equivalent.
- A sync provider must never overwrite local-only data without explicit opt-in and a conflict policy. Do not assume a Worker alone solves cross-device sync.

## 6. UI composition rules

Design one focused ToolView that can receive typed ViewModel data and emit intents/actions. Hosts provide their own surrounding chrome. Visual styling belongs to reusable design tokens, optional semantic part manifests and host shells; see [design-system-and-parts-v2.md](./design-system-and-parts-v2.md). A schema-driven renderer is optional for simple forms/results, not a mandatory generic UI engine:

~~~text
                  ToolView.vue (when reuse makes sense)
                           |
                  +--------+---------+
                  |        |         |
          WidgetShell  Standalone  MCPAppShell
             Vue        Vite/Vue    MCP iframe
                  |
          BoardRoot and layouts
~~~

The Widget shell owns drag/resize/Edit Mode; Standalone owns page-level navigation and settings; MCPAppShell owns host capabilities/bridge and fits a constrained iframe. Do not embed BoardRoot in MCP Apps.

Optional shortcut/link-style widgets to existing standalone applications are acceptable; integrating a utility must not require moving its original repository. External iframe embedding requires explicit security/UX justification and may be forbidden by the target site's frame policy.

## 7. Adding a new utility (desired developer experience)

1. Define kind, metadata, configuration defaults/schema/migration in one local module. Mark whether it has Widget and/or Standalone views.
2. Implement actual pure operations **only when needed**. Declare runtime compatibility, input/output schemas, privacy class, effect and explicit agent exposure.
3. Implement a focused Vue ToolView or use the small set of semantic UI primitives/parts if the UI is simple. Board/Standalone shells wrap it; the loader adds it to the picker/catalog. Changing the visual theme must not change tool operation code.
4. If MCP Apps UI adds value, build its iframe entry using the shared ToolView and bridge. If it does not, ordinary MCP JSON/text results are enough.
5. Add fixtures, permission/limits tests, config migration/offline tests and relevant browser + MCP smoke coverage. Adapters must require no bespoke protocol handler per utility.

Web-only tools stop after step 3 and appropriate tests. Operations-only tools need no UI. The framework must not create empty stub files or cloud resources to fill unused channels.

## 8. Required automated consistency checks

- Duplicate kind and duplicate operation ID fail the build.
- Each exposed operation has an input and output schema, size/cost limits, effect annotation and a tested error mode.
- Server-registry tests prove browser-only operations are **not** accidentally published by remote MCP.
- WebMCP registration and teardown are feature-detected and do not double-register across mount/unmount.
- One operation's direct execution, MCP tools/call and WebMCP adapter use identical golden fixtures where semantics should match.
- For UI-enabled operations, MCP tools/list advertises the intended ui:// resource; resources/read returns an embeddable HTML document, and unsupported hosts receive a useful text/structured fallback.
- MCP App iframe displays an explicit failure when the host tool call fails; it must not display success before the backend confirms it.
- Board export/import and invalid config migration never silently remove unknown kinds or stored user data.
- Mobile Safari/WebKit and desktop keyboard/focus/drag behavior are part of E2E acceptance; static screenshots alone are insufficient.

## 9. What is deliberately not decided here

- Final widget backlog and MVP priorities: earlier clock, task/loop task, image/file tools, color picker, cross-device transfer, and existing bulk-text-replacement-tool are **candidates**, not all committed deliverables.
- Optional sync provider, sign-in experience, long-term storage and transfer retention: require their own feature specification.
- Exact schema library/SDK versions and repo packaging: pin after a minimal compiling tool and supported-host connection test.
- Whether MCP App view is visually the same as a website view: UX-per-host tests decide; only business logic reuse is mandatory.
