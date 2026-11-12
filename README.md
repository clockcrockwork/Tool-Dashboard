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

The four-layer type contract and quality-gate policy are accepted design decisions; the code, exact tool versions, host behavior and runtime verification are not yet complete. Until this Draft PR is reviewed/merged, the existing `docs/principles.md`, `docs/basic-design.md`, `docs/schemas.md`, and `docs/dev-guide.md` remain the published main-branch specification. The React `prototype.jsx` is a visual/interaction reference, not a packaged deployable application.
