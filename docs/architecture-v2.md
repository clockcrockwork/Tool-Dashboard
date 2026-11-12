# Tool-Dashboard v2: AI-compatible architecture proposal

Status: **Draft design for review** (2026-11-12). This document records the accepted *direction* and concrete implementation proposals; it does not supersede existing principles until merged and reconciled.
Baseline: main at 56a7cac (last changed 2025-12-25). There is no packaged/runnable app yet; prototype.jsx is a React design prototype, whereas the accepted stack is Astro + Vue.

## 1. Decisions already accepted (keep)

1. Personal-use-first, public source, self-host/self-config; no shared managed SaaS assumed.
2. Every utility runs independently of the dashboard. The board is a host, not a business-logic dependency.
3. Astro + Vue, attractive custom start page/widget board, explicit edit mode and per-breakpoint layouts remain the Web direction.
4. Local-first/offline whenever feasible. The Web app must work with no backend or environment variables configured.
5. Phone and desktop need separately appropriate layouts, not just a scaled desktop board. Cross-device continuity (including temporary transfer of text/URLs/files) remains a product requirement; the precise sync implementation is **not yet chosen**.
6. The supported interface *targets* now include Web standalone/board, remote MCP, MCP Apps UI, and WebMCP. **Not every utility must implement all four**, and "target" does not mean "ship all four in the first release."
7. ChatGPT usability is the first external-AI priority. Other clients should work where they implement the relevant standards; do not assume uniform availability.

## 2. One core, multiple surfaces

~~~text
packages/tools/<kind>/             Web + Worker compatible behavior and schemas
  definition.ts                     Static metadata, config/data schemas, permitted operations
  operations.ts                     Pure, validated functions; no DOM, storage, secrets
  *.test.ts                         Shared fixtures

packages/tool-ui/<kind>/            Vue view (optional), host-independent presentation
  ToolView.vue                      Render data and emit intent; not responsible for transport

packages/board/                     Board model, placement, responsive layouts, migration
apps/web/                           Astro static pages + Vue board/standalone hosts
  WebMCP adapter                    Only in supported browsers, feature detected
apps/mcp/                           One optional Cloudflare Worker /mcp (Streamable HTTP)
  MCP tool adapter                  Registers only declared server-capable operations
  MCP Apps resource adapter         Serves versioned ui:// HTML resources as needed
apps/mcp-ui/                        Minimal iframe shell/assets per UI-enabled operation
  MCP Apps bridge                   Host context, tool input/result, explicit tool calls
~~~

The directory names are a **proposed target**, not instructions to scaffold empty packages now. Start with fewer physical packages if the first implementation is small; preserve these dependency boundaries.

- Pure tool operation code must not import Vue, Astro, Cloudflare APIs, window, document, localStorage, or host-specific MCP SDKs.
- Adapters, not tools, translate to MCP protocol, MCP Apps UI resources, and experimental WebMCP browser registrations.
- Board reads tool metadata/definitions and renders the selected UI. An MCP server must not import the board or a full browser UI bundle.
- Optional UI can be shared as a Vue component between standalone, widget, and MCP iframe **when its interaction model fits**. The iframe shell, auth/transport bridge and host chrome are separate.
- Existing independent tools in other repositories should default to a linked standalone integration or thin adapter. Do not duplicate or relocate their implementation merely to put them on the board.

## 3. A widget is not automatically an MCP tool

Model two orthogonal units:

- **Utility**: human-facing product (clock, task list, file tool), optional Widget and Standalone views, per-instance configuration.
- **Operation**: named, versioned callable capability (e.g., convert time, apply named text replacement), typed input/output, validated side effects and explicit exposure flags.

Expose only useful operations; a decorative clock display or image slider may have no MCP operation at all. There may be several operations per utility or several UI views over one operation. Avoid creating one opaque "run_any_tool" endpoint: explicit tools are discoverable, testable and permissionable. Also avoid registering every incidental control as a model-visible tool (context/tool-selection cost).

| Feature | Web standalone + board | Remote MCP | MCP Apps UI | WebMCP |
| --- | --- | --- | --- | --- |
| Clock/timer visualization | Primary | Only useful discrete operations | Optional if host benefits | Optional, only while page open |
| Pure conversion/calculation | Primary | Good candidate | Optional when visual/interactive | Browser capability |
| Color picker/visual comparison | Primary | Data-only operation if useful | Strong UI candidate | Browser capability |
| File-local transformation | Browser-first | Not implicitly available; needs explicit user-approved upload | Only after transport/privacy design | Can use current browser-selected files with explicit authorization |
| Tasks/recurring tasks | Local first, data separately stored | Only with a server-side per-user data provider | Useful interactive UI | Can act on current open page/session |
| Cross-device temporary transfer | Deferred product feature | Only after explicit server/auth/storage design | Possible view after backend | Page/session dependent |

Do not claim shared browser state: an MCP Worker cannot read the user's localStorage, tabs, or local files. An MCP Apps iframe cannot assume it shares storage/cookies with the regular site.

## 4. Runtime and deployment boundaries

### Web

- The Astro + Vue web output remains useful as static files and an installable PWA. No Worker call is required to start or use local utilities.
- Keep board layout, tool settings and local tool data separable. Browser functionality should fail gracefully without the MCP server.
- WebMCP is **not** remote MCP. Register only supported/appropriate operations in the current page via a small adapter, feature-detect the experimental browser API, unregister on teardown/page change, and preserve normal UI if unsupported. Do not make a browser preview API a hard dependency.
- WebMCP calls must use the same application service, permissions, validation and commit semantics as human UI actions; no alternate unguarded path.

### Remote MCP + MCP Apps

- Start with **one optional Cloudflare Worker** exposing the standard Streamable HTTP MCP endpoint at /mcp. No Worker per widget.
- Current Cloudflare docs (2026-10-27) recommend stateless createMcpHandler with a fresh McpServer per request. **No Durable Object, Queue or D1 is needed for a pure/stateless tool.** Add persistence only for a concrete stateful requirement.
- The MCP adapter registers a subset of explicit operations, validates inputs and outputs, returns concise text + structuredContent for data consumers, and supplies stable read-only/side-effect annotations where appropriate.
- For an interactive result, link the operation to a versioned ui:// resource with MCP Apps metadata. The host loads a sandboxed HTML app; the UI must also degrade to usable text/structured output when the client lacks MCP Apps support.
- Prefer a core UI contract and the standard MCP Apps postMessage bridge; ChatGPT-specific APIs/extensions are optional, isolated enhancements, not requirements for business logic.
- Split computational/data tools from dedicated rendering tools **when this prevents excessive iframe re-renders**. Do not attach a UI to every operation automatically.
- Web publishing, Worker deployment, and external ChatGPT connection are independent milestones. A private dev setup should not be mistaken for publicly available app-directory distribution.

### Security and resource policy

- Do not place API keys, user tokens, private notes, file contents or backend storage credentials in tool metadata, browser configuration or returned UI HTML.
- Stateless public calculation endpoints, if enabled, require input/CPU/size caps and abuse controls. Anything stateful or user-private requires authentication and per-user authorization from the start; never use one shared "anonymous" identity as private storage.
- Bind host credentials on the server, use least-privilege provider scopes, and re-check authorization on **each** mutating operation. Treat tool args and output as untrusted.
- Browser-local file operations do not silently upload files. An MCP operation requesting remote file processing must disclose/obtain the required user approval and bound bytes; never fabricate access to local paths.
- Declare narrow CSP and origin policies for embedded UIs, with no unreviewed third-party scripts or wildcard cross-origin access.
- Keep logs free of payloads and personal secrets by default.
- Keep heavy Wasm/bulk image processing browser-side unless a clear reason and budget justify moving it server-side.

## 5. Persistence: fix the existing ambiguity

Existing docs/basic-design.md and docs/schemas.md store per-instance config in WidgetBoardPage.instances, while docs/dev-guide.md also suggests a separate wb:v1:toolConfig:<instanceId> key. **Do not implement both as competing sources of truth.**

Proposed v2 separation (subject to validation with first tool):

1. Board state: pages, layouts, visibility, locks, per-instance references and presentation settings.
2. Tool instance config: versioned preferences attached to the instance **or** addressed by one canonical ID; pick one canonical store and document it. Initial preference: attach small config to instances, as existing schemas.md already describes.
3. Tool data: distinct from config (tasks, transfer payload metadata, histories). Stored only when that tool explicitly needs it; schema and retention are per tool.
4. Runtime transient state: not persisted by default. Persist a clock/timer deadline only if UX explicitly calls for recovery semantics, not every tick.
5. Sync projection: future opt-in backend copy of explicitly selected state/data, with conflict and migration rules. **Sync never becomes a prerequisite for local-only tools.**

Preserve the legacy board shape and migration constraints until an actual stored-data test proves a safe change. Cross-device continuity remains required as a goal even though its provider and rollout phase remain open.

## 6. Visual and accessibility behavior

- Keep the glassmorphism/neumorphism-inspired visual exploration from prototype.jsx as a **design reference**, not as production React code.
- Web board can support free placement/editing; UI embedded inside ChatGPT/Claude should present one focused tool, **not the full dashboard board**.
- Keyboard operation, focus visibility, screen-reader semantics and escape/cancel behavior remain part of the implementation contract.
- Mobile Safari/WebKit is a required validation surface; desktop visual layouts cannot be merely shrunken for phones.
- Do not force all UI hosts to look identical. Share the functional Vue view when sensible, but adapt shells, dimensions, navigation, and touch targets per host.

## 7. Trade-offs considered and rejected for initial design

- **All tools server-only**: rejected. Breaks local-first/offline and adds cost to trivial browser tools.
- **One Worker/Durable Object per widget**: rejected. Widgets are UI instances, not server processes.
- **Automatic model exposure of every widget**: rejected. Many widgets lack a meaningful AI operation; unnecessary tool registration harms discovery.
- **Duplicate code for Web, MCP, WebMCP**: rejected when operation semantics match; adapters should invoke a common validated core.
- **Mandatory central hosted account or automatic data synchronization**: rejected for first build; conflicts with self-config/local-only.
- **Copying all independent utility repositories into one monorepo**: rejected without proven reuse value.
- **A generic dynamic third-party plugin/marketplace platform**: out of scope. A build-time registry of first-party utilities is sufficient.

## 8. Reference specifications (recheck versions at implementation)

- [MCP Apps official extension / SDK](https://github.com/modelcontextprotocol/ext-apps) — ui:// resources, host capabilities, model/app visibility, sandbox, structuredContent.
- [OpenAI MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart) — ChatGPT client behavior, iframe UI and MCP endpoint.
- [OpenAI MCP UI guidelines](https://developers.openai.com/plugins/build/chatgpt-ui) — separate data and rendering tools, template versioning, CSP.
- [Cloudflare remote MCP server](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/) — stateless createMcpHandler, auth variants.
- [Cloudflare MCP tool definitions](https://developers.cloudflare.com/agents/model-context-protocol/protocol/tools/) — typed registration, stateful boundaries; experimental WebMCP adapter is not a stable requirement.
- [Chrome: WebMCP vs MCP](https://developer.chrome.com/docs/ai/webmcp/compare-mcp) — browser page/session tools versus remote server.
- [Chrome WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices) — shared service, tool registration and commit semantics.

See [tool-module-contract-v2.md](./tool-module-contract-v2.md) for an implementable module contract and [implementation-plan-v2.md](./implementation-plan-v2.md) for the first validation gates.
