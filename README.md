# Tool-Dashboard

Shared documentation lives in `docs/`. When deciding where processing should run (client JS, Web APIs, Wasm, or server-side), refer to the client-first/serverless priority order in [Project Principles §9](./docs/principles.md#9-client-vs-server-processing-priorities) so humans and agents follow the same policy.

## Stage 1b — local board (in progress)

The project is revisiting its independent widget/tool design to support a common implementation across the Web standalone UI/board, remote MCP, MCP Apps, and experimental browser WebMCP. The local-only Web experience must remain usable without a remote Worker.

- [Architecture and runtime boundaries](./docs/architecture-v2.md)
- [Utility/module and operation contract](./docs/tool-module-contract-v2.md)
- [Staged implementation and acceptance plan](./docs/implementation-plan-v2.md)
- [Frontend platform / local-data recommendation](./docs/platform-and-data-v2.md)
- [UI design tokens and reusable part schema](./docs/design-system-and-parts-v2.md)
- [**Canonical four-layer contracts v1**](./docs/four-layer-contracts-v2.md)
- [**Schema evolution, typed lint/typecheck and CI policy**](./docs/quality-gates-v2.md)

## Normative v2 map

One authoritative contract per concern — no parallel sets of MUST rules:

| Concern | Normative v2 reference |
| --- | --- |
| Product/runtime boundaries and remote/local mode | [architecture-v2.md](./docs/architecture-v2.md) |
| Platform/CLI and local storage implementation | [platform-and-data-v2.md](./docs/platform-and-data-v2.md) |
| Tool identity, resource ownership, remote targeting, three deletion modes | [tool-module-contract-v2.md](./docs/tool-module-contract-v2.md) |
| Typed Operation / ViewModel / Parts / Design Tokens, compatibility | [four-layer-contracts-v2.md](./docs/four-layer-contracts-v2.md) |
| UI shells/semantic parts usage | [design-system-and-parts-v2.md](./docs/design-system-and-parts-v2.md) |
| Lint/typecheck/schema migration and test/CI gates | [quality-gates-v2.md](./docs/quality-gates-v2.md) |
| Delivery phases and Acceptance Criteria | [implementation-plan-v2.md](./docs/implementation-plan-v2.md) |

Legacy `docs/basic-design.md`, `docs/schemas.md`, `docs/dev-guide.md` are **historical v1 references**, not competing v2 contracts. The original `docs/principles.md` preserves independent tools, local-first/self-host, accessibility and client-first computation where not superseded by explicit v2 requirements. **For conflicts, v2 wins.** The 2025 unpartitioned Claude Design output `prototype.jsx` is **not** a migration/compatibility target or approved final UI.

Stage 1b builds on the Stage 1a operation and registry contracts with a local board for clock and color conversion. The UI and its state are browser-local. No account, remote Worker, MCP server, synchronization, or deployment is included. This is not the final visual design. See [Stage 1a handoff](docs/stage-1a-handoff.md) for the earlier foundation and [Stage 1b work plan](docs/stage-1b-work-plan.md) for remaining acceptance work.

### Using the local board

Add clock or color tools from the board. Each placement refers to an independently saved configuration; the color standalone view has its own settings and does not need a board placement. Changes remain drafts until saved. If another tab changes a configuration while it is being edited, the draft is retained and the stale save is rejected; load the latest settings to continue.

Turn on edit mode to move or resize tools and open the removal dialog. The dialog offers removal while retaining settings for re-addition, export followed by deletion, or deletion of the selected tool and its exclusive data. Export requires explicitly confirming that the downloaded file was saved; changes after the preview cause deletion to abort. Restore a supported export through the backup section. Unknown tool kinds and newer settings remain read-only; future-format backup files are retained as opaque files for later recovery.

The local repository uses IndexedDB through Dexie in the current browser and profile. Browser storage can be cleared by the user or browser and is not shared with other devices: export backups separately if needed. Once the app has loaded, its core operations do not require a Worker or account. A service worker / installable offline shell is not included, so starting or refreshing the app without access to its hosted assets is not guaranteed to work offline.

## Local development

Use Node **24.22.2** (pinned in `.node-version`) and npm with the committed lockfile:

```sh
npm ci
npm run dev
```

`npm run dev` starts the local Vite application. Validate changes before building:

```sh
npm run check
npm run build
npm run preview
```

`check` runs typed ESLint, core TypeScript and Vue typechecking, unit tests, and contract tests. Contract tests include negative lint/type fixtures and reviewed input/output JSON Schema snapshots. Do not automatically update snapshots in CI; review schema changes and their compatibility/version implications.

Focused browser tests run against a local Vite server. Install the Playwright browser binaries and their system dependencies, then run:

```sh
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

The browser suite uses desktop Chromium, mobile Chromium and mobile WebKit. Downloading browser binaries and npm dependencies requires network access. Browser execution results and independent review are tracked separately from the design contracts; this README does not assert that every Stage 1b acceptance criterion has passed.

External operation schemas use the deliberately restricted vocabulary in `src/core/json-schema.ts`. Always call `operationJsonSchema(schema, 'input' | 'output')` for exported schemas; unsupported/custom refinements, transforms, coercion, catch fallbacks and non-strict objects are rejected. Built-in string formats (including URL normalization), conditional checks, and length checks are also currently unsupported; ordinary strings, flag-free regex, numbers with bounds/multipleOf/safe integers, booleans, enums/literals, arrays, strict objects, optional/nullable fields and static primitive defaults form the initial vocabulary. Construct defaults with `operationDefault(schema, value)`; raw Zod `.default(...)` is rejected because Zod does not retain whether its argument was a dynamic callback. Add parity fixtures before extending this vocabulary or upgrading Zod.

Operation failures expose only `INVALID_INPUT`, `PAYLOAD_TOO_LARGE`, `INVALID_OUTPUT`, or `EXECUTION_FAILED`. Adapters should use `OperationError.code` and never publish exception stacks, submitted payloads, or raw executor errors. These codes do not implement authorization or transport error handling.
