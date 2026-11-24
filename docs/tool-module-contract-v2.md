# Tool-Dashboard v2: Utility module / operation contract

Status: **ACCEPTED module boundaries / draft runtime implementation**, 2026-11-12. Canonical four-layer types and schema lifecycle: [four-layer-contracts-v2.md](./four-layer-contracts-v2.md). Required quality gates: [quality-gates-v2.md](./quality-gates-v2.md). Companion to [architecture-v2.md](./architecture-v2.md).
The main goal is **quickly adding widgets without separately rewriting the same operation for WebMCP, remote MCP and MCP Apps**. This is an implementation design, not a claim that existing code already implements the interfaces below.

## 0. 適用範囲 / Scope (2026-11-24)

PR #22 のレビュー 8（[対応方針](./lgd/review-flow.md)）を受けて、この文書の適用範囲を次のとおり限る。

- **ブラウザの画面とデータには適用しない。** ボード・画面・配置・大きさ・全画面・未配置・置かずに使う・人前では隠す・保存（localStorage の区画と大きな記録の保存先）・書き出しと読み込み・元に戻すは、`design/claude-design/`（仕様書・実装ガイド・部品シート・プロトタイプ）と `docs/lgd/` の資料が正本。この文書の placement / instance / `standalone:<kind>` / view ごとの draft / 削除の三択 / IndexedDB の revision と CAS の規約は、そこには使わない。
- **将来の契約としては維持する。** MCP（remote・WebMCP・MCP Apps）に公開する Operation の型付き定義、公開範囲（`exposeTo`・visibility）、認可、remote の対象の発見、revision による CAS、冪等キー、部分失敗の報告、エラーの区別は、その機能を実装するときの契約として有効。
- **置き換え先:**

| この文書の規約 | ブラウザの画面での置き換え先 |
| --- | --- |
| `kind` / `placementId` / `instanceId`（§1） | 種類 ID と配置 ID（最初の1個は種類 ID、2個目以降 `<kind>#<n>`）。区画 `w:<配置ID>` が設定と記録を持ち、共有は未決定で既定は独立 — [widget schema v0 §0 R6](./widget-schema-v0.md)、[review-flow #5](./lgd/review-flow.md)、実装ガイド 7.4 |
| `standalone:<kind>`（§1・§5） | 置かずに使う（一時利用）は置いたときと同じ区画を使う — R12、仕様書 2章「置かずに使う」 |
| view ごとの draft と revision（§1・§5） | その場で反映し、元に戻す（タブごと、0.7秒で1手、最大40手）。記録は各ウィジェットの個別の元に戻す — R7、仕様書 7章 |
| IndexedDB の LocalRepository と revision、export v1 の封筒（§5） | `lgd.v1:global` と `lgd.v1:w:<配置ID>` の区画、区画の版（`v`/`dv`）、`lgd-dashboard` v1 の書き出しと反映前の検証。大きな記録は非同期の保存先 — R8、[review-flow #1・#7](./lgd/review-flow.md)、実装ガイド 5〜7章 |
| 削除の三択（§5） | 「このボードから外す」＋トーストの「元に戻す」。「初期状態に戻す」は最初の7個の配置に戻すだけで記録を消さない — R9、仕様書 1章・2章 |
| 追加の手順（§7）と自動チェック（§8） | [開発フロー](./lgd/development-flow.md)、スキル `lgd-add-widget`（`.claude/skills/lgd-add-widget/SKILL.md`） |

## 1. Canonical identity and ownership (accepted 2026-11-12)

> 適用範囲（§0）: この節の ID と所有者は MCP・remote の Operation の将来の契約。ブラウザの画面では種類 ID と配置 ID を使う（widget schema v0 R6）。

**A board placement, durable tool instance, data target, rendered view and operation are not the same thing.**

| Entity | Stable identity | Owner / lifetime |
| --- | --- | --- |
| Utility kind | `kind` (e.g. `clock`, `color`) | Build-time catalog; no user state |
| Board placement | `placementId` (UUID) | Board page's layout and visibility; can be detached |
| Durable tool instance | `instanceId` (UUID) | One config record; reusable across placements and retainable without a placement |
| Standalone default | `standalone:<kind>` config key | Exists without being added to a board |
| Addressable resource | `targetRef = { providerId, resourceType: "config" | "data", kind, targetId }` | Committed settings **or** data, each with its own revision. Multiple widgets may share data, but instance configs remain independent unless explicitly linked |
| View / editor | Ephemeral `viewId` | One mounted view owns one draft; not a persisted data identity |
| Operation | Stable `operationId` + contract version | Executable capability; stateless operations require **no instance/target** |
| Provider | `local` or authenticated remote provider ID | Owner of committed data; never implied by rendering surface |

- Board state stores `placementId → instanceId` and presentation layout; **not** a second copy of config or target data. Multiple placements may reference the same instance or data target.
- `instanceId` owns one versioned config key `instance:<UUID>`, while a standalone without a board uses `standalone:<kind>`. Store one canonical value in the IndexedDB LocalRepository, not both in the Board object and a config table. A future standalone multi-profile feature requires its own explicit IDs; do not prebuild it.
- Tool data records have `{providerId, kind, targetId, recordId, schemaVersion, revision, ...payload}` (exact table shape is a code detail), and are linked by explicit `targetRef`, never by a label or placement ID. **Tool-instance configuration itself is also an addressable resource** (`resourceType: "config"`, one stable config identity/revision per instance). This permits authorized AI updates to widget settings as well as saved tool data; remote participation must be separately approved per resource.
- A committed target/config record has a monotonic **revision** under the owning provider, used as the compare-and-swap precondition on writes/deletes. Remote target IDs are not secretly assumed equal to local IDs; an authorized mapping is explicit.
- Old v1 imports may use a `WidgetInstance.instanceId` for both layout and config. A versioned importer must map that legacy ID into the new placement+durable-instance records deterministically and preserve all unknown raw fields for recovery.
- Two widgets with the same title/kind may be different instances; two widgets with different instance IDs may display the **same data target**. Destructive operations deduplicate by data target, not the number of visible widgets.
- A runtime-only view draft must never be treated as committed tool data. External AI operations take validated explicit inputs, not the user's unsaved draft.

An operation is **not** a widget instance, and a view is not a datastore. Do not expose a generic `run_any_tool` endpoint that bypasses individual typed schemas.

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

## 3. Typed operation definition (accepted invariants)

The authoritative rules are in [four-layer-contracts-v2.md](./four-layer-contracts-v2.md). **Zod 4** input/output schemas define the public contract; TypeScript types are derived. The following describes a valid static descriptor; a reusable `defineOperation()`/registry helper is implementation work, not a new second schema.

~~~ts
import { z } from "zod";

const normalizeLines = {
  id: "text.normalize_lines",
  contractVersion: 1,
  title: "Normalize line endings",
  description: "Convert text to LF or CRLF line endings.",
  inputSchema: z.strictObject({
    text: z.string().max(50_000),
    ending: z.enum(["lf", "crlf"]),
  }),
  outputSchema: z.strictObject({ text: z.string() }),
  runtimes: ["browser", "server"],
  exposeTo: ["webmcp"], // example remains browser-local; private text is not sent to a public Worker
  effect: "read",
  dataClass: "public",
  inputLimit: 50_000,
} as const;

type NormalizeArgs = z.infer<typeof normalizeLines.inputSchema>;
type NormalizeResult = z.infer<typeof normalizeLines.outputSchema>;
~~~

- The operation implementation receives parsed, validated values and narrow injected context ports, not ambient global browser/server objects.
- `z.toJSONSchema` supplies the MCP input/output JSON schemas at build/registration time. No hand-maintained JSON schema or parallel TypeScript interface.
- This descriptor **does not** auto-publish to MCP: a build-time utility manifest and explicit surface exposure policy decide what adapters register.
- The server and browser implementations each validate untrusted input and output; current runtime compatibility and SDK versions must be confirmed by the first compiling/running vertical slice.

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
- Shared adapters enumerate only supported operations; remote MCP selects `server` runtime **and** explicit remote exposure; WebMCP selects browser + webmcp operations, subject to current host support. Browser-only capabilities never leak into remote tools/list.
- **Two independent exposure axes:** `exposeTo` decides transport (`remote-mcp | webmcp`), while an explicit MCP Apps `visibility` list decides caller audience (`model | app`). No remote operation is published without an explicit, nonempty `visibility`. Always emit `_meta.ui.visibility`; omission defaults to `["model", "app"]` in the protocol and is unsafe. A UI-only refresh/submit operation uses `["app"]`, not model visibility. Visibility controls *discoverability/caller channel*, not authentication; check identity/scopes per call. `resourceUri` and the UI itself are optional for a model-visible data tool.
- If framework/build tooling makes lazy UI discovery straightforward, map UI components through build-time glob or static imports. **Do not force Vue UI into the Worker bundle** or make runtime filesystem discovery a requirement.
- Do not dynamically execute third-party modules, install remote plugins, or allow users to paste arbitrary operation source. Registry is first-party and build-time for v2.
- Keep UI flags and executable capabilities distinct. UI-only widgets do not create fake model tools.
- UI app resources are **explicitly associated only with selected operations**. The common MCP Apps adapter handles ui:// registration, iframe bridging and result forwarding. A utility supplies its small view/entry bundle, not a duplicate server.
- MCP Apps may need a separate render-only operation for heavy, multi-step flows. That is an opt-in design per utility, not a mandatory extra endpoint for every operation.

### Local-only and remote-enabled modes

- The default **local-only** mode uses IndexedDB; Web remains fully usable with no remote endpoint, login or network. A remote MCP Worker **cannot** access IndexedDB, local files or current browser tabs, even while the dashboard is open.
- To let ChatGPT change widget settings or saved tool data, the user explicitly enables remote access to the selected **configuration or data resource** (and authorized operation scope). Its authoritative committed record then lives in an authenticated provider shared by Web and MCP. The board holds an explicit mapping from its local instance/target to the authorized remote target ID; local IndexedDB may cache a snapshot but is **not** an independent shadow write authority.
- Initial remote-enabled policy: online commits use provider revision/CAS. If offline, show cached data and preserve local drafts but **do not queue silent remote writes or promise automatic conflict-free sync**. Refetch and resolve stale revisions before commit. This preserves normal local-only functionality while avoiding an unimplemented sync engine.
- Remote target discovery returns only resources currently authorized for the authenticated principal, including stable targetRef (`resourceType: config | data`), kind, optional user-visible label, available typed operation IDs and revision. Display labels are not identity. No local-only/opt-out target is listed as callable; report it explicitly as unavailable rather than guessing a bridge.
- Future browser-local ChatGPT access requires a **separate explicit browser bridge** with consent and a defined lifecycle. Experimental WebMCP is a separate browser-host capability, not proof of ChatGPT remote access.
- Choose an actual remote provider/storage technology only when implementing the first stateful remote target. It must support per-user authorization, atomic conditional writes, revisions, deletion markers and bounded target discovery; a Worker alone is not a database. No blanket multi-device synchronization is implied.

### Remote MCP exposure metadata (two independent axes)

A published operation must set `exposeTo` (transport) **and** for remote MCP a nonempty explicit `mcpVisibility: readonly ("model" | "app")[]` (caller channel). A visibility array of `["model", "app"]` is allowed **only if intentionally declared**. The adapter generates `_meta.ui.visibility` and optional `ui.resourceUri`. Missing or empty visibility blocks registration; the MCP Apps protocol defaults to both audiences when omitted. A real caller still needs the correct identity/scope per request. Local and WebMCP operations do not gain remote rights through presentation reuse.

Example for a bounded structured color operation (schema omitted for brevity):

~~~ts
const remoteExposure = {
  exposeTo: ["remote-mcp", "webmcp"],
  mcpVisibility: ["model"], // AI can call; iframe cannot directly call this tool
} as const;
~~~

UI-only actions use `mcpVisibility: ["app"]`. Do not treat this metadata as authorization.

### Multiple-target AI operation contract (mandatory capability)

1. **Discover** authorized targets and their `providerId/kind/targetId/revision/operationIds`. Resolve ambiguous titles by stable IDs or explicit user selection; never silently choose the first matching name. Pure operations do not require a target.
2. **Plan using declared operations**. One instruction may affect two instances of the same kind, or pass operation A's typed result into operation B's typed input. Revalidate the receiving schema. The AI host may orchestrate sequential calls; no generic `run_any_tool`, generated code execution or custom workflow engine is required for v1.
3. **Validate and commit each call**: check target existence and principal authorization again (including `resourceType` and action scope), require `expectedRevision` on mutable targets and a scoped `idempotencyKey` for retries. Repeated requests with the same idempotency key and payload return the already-committed outcome; reusing a key with a changed payload is rejected. Deduplicate different widgets that reference the same data target.
4. **Partial failure is explicit**: each result reports `succeeded | failed | skipped` with affected target, committed revision (if succeeded), and stable error code. Stop dependent later steps after failure. **No implicit atomicity, automatic compensation, or automatic retry of successful earlier writes across separate tool calls.** Add one dedicated typed transactional operation only for a genuinely indivisible use case.
5. **Provider is the source for UI updates**. The board and standalone views observe committed data; AI need not simulate clicks or edit a ViewModel draft. Pages/hosts register WebMCP operations centrally: unmount of one widget must not unregister another's tools.
6. **Require real end-to-end proof**: a connected ChatGPT client operates two authorized, different board targets from one user instruction and changes appear on the persistently open Web board. Local-only/unconnected targets report not available. Test same-kind bulk changes, cross-kind A→B, duplicate labels, shared-target deduplication, replay, midway failure and deleted-target conflict.

### Minimal effect and error contract

- Distinguish `VALIDATION_FAILED`, `UNAUTHORIZED`, `NOT_FOUND`, `AMBIGUOUS_TARGET`, `CONFLICT`, `VERSION_UNSUPPORTED`, `RATE_LIMITED`, `UNAVAILABLE`, `UNKNOWN_OUTCOME`; messages must not expose user secrets. Errors carry structured status and bounded context; no stack traces.
- Mutations commit atomically **per owning data target** using the provider's revision precondition. Never claim operation success before confirmed commit; HTTP timeout/unmount does not imply rollback.
- For ambiguous outcomes, query the provider by idempotency key/target before attempting retry. A deleted record uses a tombstone/retired revision to reject stale delayed writes; no unintentional resurrection.
- Read calls with personal data still require authorization, and even pure text can be sensitive. The first public remote proof is a bounded non-sensitive structured color operation, not arbitrary text/files.
- Execution/cancellation/progress policy is a small typed application-service contract: cancellation stops work when possible, but cannot uncommit a prior mutation; no generic scheduler/job database until a real operation requires it.

## 5. Persistent state, export and the three delete choices

> 適用範囲（§0）: この節（IndexedDB の repository・revision・export v1・削除の三択）はブラウザの画面とデータには適用しない。置き換え先は widget schema v0 の R8・R9 と実装ガイド 5〜7章。remote provider の CAS・tombstone・冪等の規約は将来の契約として維持する。

The v2 canonical local store is **IndexedDB via the LocalRepository/Dexie adapter**. The v1 four-layer Board/Common/Metadata/Extension taxonomy remains useful but v1 localStorage and embedded-config placement details are historical, not a competing source of truth.

| Persisted concern | Identity and owner | Rules |
| --- | --- | --- |
| Board | boardId/pageId/placementId, Board repository | Positions, display and instance references; no duplicate config payload |
| Config | `instance:<UUID>` or `standalone:<kind>`, Config repository | One versioned value with migration; retained independently of placement; may map to a remote config resource only after explicit opt-in |
| Tool data | providerId + kind + targetId + recordId, Tool repository | Separate data schema/version, references, revision, retained/deleted state |
| Runtime view | viewId + draft/baseRevision | Controller only; not automatically persisted |
| Remote mapping | selected local config key / data target → authorized remote targetRef | Explicit opt-in per config/data resource, scoped operations, identity and revocation; no assumed global sync |
| Host session | MCP/iframe/WebMCP lifecycle | Adapter only, not Board persistence |

**Export v1** is a documented, JSON-serializable, versioned envelope (`format`, `exportVersion`, `createdAt`, `selected placements`, `instances/configs`, `targetRef + records + revisions`, `attachment manifest` where applicable). Include the full recovery-relevant subset, no secrets/tokens. Unknown versions/kinds/fields are kept losslessly in an opaque read-only section for re-import; no automatic rewriting of unsupported newer versions. Attachments are packaged where a tool actually creates them (e.g., a ZIP), not invented for simple tools. Export parser validates the envelope and per-record schemas and can preview recovery without changing the current DB. Migrations run sequentially/transactionally where feasible with rollback or raw-byte backup before destructive steps.

**Widget removal presents exactly three user choices:**

1. **Remove widget, keep data.** Detach only this `placementId`; keep the instance config and its data target. Show it in a "saved/unplaced tools" picker for restoration. If other placements reference it, they remain intact.
2. **Export, then delete.** Generate a restorable snapshot (config, selected data, attachments, versions); validate the package and initiate the user-chosen save action. A browser's download-start event is **not proof of saved bytes**: require explicit user confirmation of saved export before deletion. Re-read the current revisions, and if anything changed while exporting, **abort deletion and request a fresh export**. Failure/cancel leaves placement/config/data unchanged. Final revision comparison and local deletion occur in one IndexedDB transaction; download and DB deletion cannot be one atomic transaction. Remote deletion needs its own provider-side conditional commit and explicit outcome checks.
3. **Delete with data.** Show the exact placement, owned config and *exclusively owned* data to be deleted, require explicit confirmation and recheck revisions at commit. If a data target is referenced by another placement/standalone, **do not cascade**: explain the shared references and route deletion of shared data through a separate, explicit impact review. An ordinary removal cannot silently delete other users' or other widgets' data.

- The three choices apply to human UI and AI-requested deletion. The AI must present/obtain the user's specific mode and target confirmation; it cannot guess. A preview/confirmation tool is not the final commit.
- Deletion or export must also guard against concurrent changes from another tab or remote AI operation. Deleted resources get tombstones/retired revisions to reject delayed writes.
- Unknown widget kinds are preserved as read-only placeholders. **Removing a widget is not deleting its associated records**; save/export/restore and multi-instance behavior must be independently tested.
- No general file-sync or conflict-free offline remote-write engine is implied by these v2 data contracts.

## 6. UI composition rules

The [widget schema v0 working draft](./widget-schema-v0.md) maps page-single and board-widget presentation onto these identities and shells. It preserves placement/config/view ownership and the existing deletion/revision rules. The proposed page composition, locks, visibility and data-source descriptors are not yet persisted or implemented; see its [conformance checklist](./widget-schema-v0-checklist.md) before adding fields to the current repository/export format.

> 適用範囲（§0）: 2026-11-23 の §0 改訂で、widget schema v0 はページ単一表示・visible・三択の削除を廃止した。ブラウザの画面の構成は `design/` と `docs/lgd/` の資料に従う。

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

> 適用範囲（§0）: ダッシュボードにウィジェットを足す手順は [開発フロー](./lgd/development-flow.md) とスキル `lgd-add-widget`。ここに書いた Widget/Standalone view の印と config migration は使わない。純粋な計算を MCP に公開する Operation にするときだけ、この節の 2・4・5 を使う。

1. Define kind, metadata, configuration defaults/schema/migration in one local module. Mark whether it has Widget and/or Standalone views.
2. Implement actual pure operations **only when needed**. Declare runtime compatibility, input/output schemas, privacy class, effect and explicit agent exposure.
3. Implement a focused Vue ToolView or use the small set of semantic UI primitives/parts if the UI is simple. Board/Standalone shells wrap it; the loader adds it to the picker/catalog. Changing the visual theme must not change tool operation code.
4. If MCP Apps UI adds value, build its iframe entry using the shared ToolView and bridge. If it does not, ordinary MCP JSON/text results are enough.
5. Add fixtures, permission/limits tests, config migration/offline tests and relevant browser + MCP smoke coverage. Adapters must require no bespoke protocol handler per utility.

Web-only tools stop after step 3 and appropriate tests. Operations-only tools need no UI. The framework must not create empty stub files or cloud resources to fill unused channels.

## 8. Required automated consistency checks

> 適用範囲（§0）: placement→instance→target、三択の削除、revision の競合のテストは MCP・remote を実装するときのもの。ブラウザの画面とデータのゲートは [開発フロー 5章](./lgd/development-flow.md)（再現度と、機能・データのゲート）。

In addition to the original fixtures below: each operation's `exposeTo` and MCP Apps `visibility` are checked independently; no unlisted operation becomes model-visible. Test a stable local placement→instance→target mapping, two saved same-kind instances, three delete choices (including export confirmation + concurrent updates), authorized target discovery, two-target AI instruction, revision conflict and remote UI refresh. An unknown or disconnected target must not be inferred from a display name.


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
- **General** sync provider, account UX beyond the required per-target AI connection, long-term retention and temporary file transfer: require their own feature specification. Narrow authenticated remote target access for AI is **mandatory** for the Stage 1e integration, not an optional enhancement.
- Exact schema library/SDK versions and repo packaging: pin after a minimal compiling tool and supported-host connection test.
- Whether MCP App view is visually the same as a website view: UX-per-host tests decide; only business logic reuse is mandatory.
