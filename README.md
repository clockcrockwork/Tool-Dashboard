# Tool-Dashboard

Shared documentation lives in `docs/`. When deciding where processing should run (client JS, Web APIs, Wasm, or server-side), refer to the client-first/serverless priority order in [Project Principles §9](./docs/principles.md#9-client-vs-server-processing-priorities) so humans and agents follow the same policy.

## Architecture v2 — accepted decisions in a Draft PR, not merged or implemented

The project is revisiting its independent widget/tool design to support a common implementation across the Web standalone UI/board, remote MCP, MCP Apps, and experimental browser WebMCP. The local-only Web experience must remain usable without a remote Worker.

- [Architecture and runtime boundaries](./docs/architecture-v2.md)
- [Utility/module and operation contract](./docs/tool-module-contract-v2.md)
- [Staged implementation and acceptance plan](./docs/implementation-plan-v2.md)
- [Frontend platform / local-data recommendation](./docs/platform-and-data-v2.md)
- [UI design tokens and reusable part schema](./docs/design-system-and-parts-v2.md)
- [**Canonical four-layer contracts v1**](./docs/four-layer-contracts-v2.md)
- [**Schema evolution, typed lint/typecheck and CI policy**](./docs/quality-gates-v2.md)

## Normative v2 map (for this branch; effective on merge)

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

This remains documentation-only: accepted rules are not equivalent to compiled contracts, host tests or deployment. The branch is unmerged; main remains v1.

The four-layer type contract and quality-gate policy are accepted design decisions; the code, exact tool versions, host behavior and runtime verification are not yet complete. Until this Draft PR is reviewed/merged, the existing `docs/principles.md`, `docs/basic-design.md`, `docs/schemas.md`, and `docs/dev-guide.md` remain the published main-branch specification. The React `prototype.jsx` is an optional inspiration only, not a packaged deployable application.
