# Tool-Dashboard v2: staged redesign and acceptance plan

Status: draft plan, 2026-11-12. This plan accompanies [architecture-v2.md](./architecture-v2.md) and [tool-module-contract-v2.md](./tool-module-contract-v2.md).
Do not merge/implement unconfirmed product scope as if all requested widgets were approved for the same MVP.

## A. Confirmed baseline (2026-11-12)

- Public repo clockcrockwork/Tool-Dashboard, main HEAD 56a7cac; last commit 2025-12-25.
- Existing files: README.md, prototype.jsx (~94KB React concept), docs/principles.md, docs/basic-design.md, docs/schemas.md, docs/dev-guide.md. **No package.json, lockfile, deployable Astro/Vue app, or actual Worker in root.**
- No open issues or PRs, one branch (main) at time of review.
- Existing docs already specify standalone + board, per-breakpoint layouts, localStorage, config migrations, keyboard accessibility, clock v1, optional providers.
- Existing design conflict: board per-instance config in docs/schemas.md versus a separate wb:v1:toolConfig:<instanceId> key in docs/dev-guide.md.
- There is no deployed ChatGPT MCP integration to verify. Avoid claiming operational status based on design docs.

## B. Freeze the *principles* before choosing individual widgets

**Already accepted and not to reopen casually:**
- Independent tools; dashboard as an optional host; personal/self-config first.
- Web UI remains visually important as a usable portfolio/start page.
- Local-only/offline is supported without the Worker.
- Four supported delivery targets: Web standalone/board, remote MCP, MCP Apps UI, browser WebMCP (feature-dependent).
- One reusable tool operation contract with adapters; not one server/widget.
- Desktop and smartphone need independently designed composition; cross-device continuity is an explicit product requirement.
- ChatGPT is the first external AI host to test.

**Proposals requiring validation by runnable vertical slice, not blanket adoption:**
- Web framework selection is **reopened**: Vue 3 + Vite is the leading candidate, React + Vite is a fallback; Astro + Vue is no longer a mandatory default. Keep the React file as a visual/interaction reference only, not production code to port wholesale.
- A TypeScript workspace with one static first-party utility catalog, and optional per-tool Vue views.
- Stateless Cloudflare Workers createMcpHandler for /mcp, no DB/DO initially.
- IndexedDB-based local repository (Dexie candidate) for board/config/tool-data is preferred for validation. **Choose and prove one canonical per-instance + standalone config store** before migration; do not assume embedded-board config is accepted. Keep runtime state separate.
- MCP Apps UI built from the shared Vue view when ergonomically suitable; otherwise host-specific shell/view.

**Explicit nondecisions:**
- Final wanted-widget inventory/prioritization and which old widgets now have standalone applications.
- Sync provider, account flow, temporary file transfer storage and retention.
- Product-wide visual system, actual mobile layout composition and theme choice.
- Public app-directory listing, third-party marketplace, generic plugin SDK, commercial SaaS.

## C. Implementation order (each stage can be one or more small PRs)

### Stage 0 — architecture decision and repo hygiene (this draft PR)

1. Preserve the original docs for provenance; add v2 proposal docs without silently overwriting existing contract.
2. Identify legacy schema conflicts and define one candidate config/data separation.
3. Require a new tool to be addable through a manifest + optional view/operations, without new hand-authored protocol endpoint per tool.
4. Review security, environment boundaries, existing independent tool reuse and mobile-first constraints.
5. Do not claim tests/build passed: this repository still has no installable project.

**Gate:** architecture review separates accepted decisions, experimentally validated assumptions and deferred product choices. The v2 PR stays Draft pending this review.

### Stage 1 — cross-surface vertical slice (thin proof, no big board yet)

1. Scaffold minimal **Vue 3 + Vite** app with local-only zero-env mode; evaluate cf + cloudflare.config.ts + Vite plugin v2 beta as a pinned and reversible deployment experiment. Compile one pure TypeScript operation with a JSON schema and fixtures. Prefer bounded synthetic text normalization for architecture proof, without duplicating the full existing bulk-text-replacement-tool.
2. Expose the operation via a minimal standalone UI and a single stateless remote MCP Worker. Verify tools/list, tools/call, invalid input handling, structured output and no stateful binding.
3. Create **one** small MCP Apps iframe view from the same reusable Vue presentation when possible. Use mutually compatible MCP SDK v2 / MCP Apps ext-apps 2.x packages and a Worker-safe prebundled HTML resource (not Node fs at request time). Verify ui:// discovery, resource loading, host bridge, interactive value updates, text-only fallback and sandbox/CSP constraints.
4. Implement a feature-detected WebMCP adapter over the same operation. Test in an environment with a supported API; lack of API in production browsers must not prevent the Web page from functioning.
5. Use MCP Inspector/SDK integration tests before any client connection. Verify actual ChatGPT connection and UI if the account's app-development controls permit it; connection may require an explicit human setup step.
6. Validate that server build contains no Web DOM/Vue board or secret browser config. Capture build sizes/cold path and free-tier resource usage when measurements become possible; do not assume zero hosting cost.
7. Prove one IndexedDB schema upgrade, two-tab behavior, storage error/backup, and one optional Dedicated Web Worker with cancellation/transferable payloads. Also verify cf's beta commands do not skip type-checks in CI.

**Gate:** one operation produces comparable validated results directly, from the Web, from /mcp, and through WebMCP where available. MCP Apps UI is a distinct test, not assumed to be automatically compatible with every client.

### Stage 2 — usable local widget board

1. Implement a clock as first **human-facing** widget/standalone tool (the original accepted v1 example), with optional network time fallback and versioned config.
2. Build one board page, add/remove widgets, edit-mode-gated drag/resize, IndexedDB persistence/recovery and breakpoint-specific layouts. Test keyboard and touch flows. Include an isolated design-token/semantic-parts contract so visual redesign does not change domain logic.
3. Keep advanced grouping, layering, multiple layouts and elaborate widget picker features as documented future capabilities; no need to implement everything before the first usable board.
4. Support a "shortcut/link to independent utility" entry, so mature external tool repos can be reached without copying code.
5. Ship the installable PWA/offline shell and verify standalone/tool assets are cached appropriately without requiring /mcp. Verify desktop Chrome/Firefox and mobile Safari/WebKit layouts are intentionally adapted.

**Gate:** Web works disconnected and without a Worker; refresh/import does not lose instances or personal settings; mobile is usable and not just scaled desktop.

### Stage 3 — cross-device continuity (separate feature spec)

1. Define what must sync: layout, settings, saved tool data and temporary transfers are **different data classes**.
2. Define device identity, authentication, opt-in, encryption/retention, conflict recovery, offline merge and provider cost before provisioning storage.
3. Preserve local-only as an option; do not equate "the Worker exists" with "sync is implemented."
4. If temporary file transfer is implemented, choose an explicit expiration/deletion policy and a storage channel with scoped access (possibly R2); do not store raw files in board state.
5. Validate PC↔phone bidirectional updates, offline edits, conflicts, deletion and account loss/recovery.

**Gate:** cross-device continuity is demonstrated through a real second device/browser, not asserted from data-model similarity.

### Stage 4 — expand the utility collection by measured need

Consider the existing known candidates, without assuming a mandatory order: clock/calendar, tasks and recurring tasks, timer/Pomodoro, colors, file extension conversions, metadata removal/compression, image slider, and cross-device text/URL/file transfer. The independent text bulk-replacement app is a **reuse/integration candidate**, not a requirement to import its source.

For each candidate, answer:
- What human job requires a visible UI, continuous view or device interaction?
- Does it have a meaningful discrete AI-callable operation?
- Browser-only, Worker-safe or explicit remote-file flow?
- Does it need private persistent data or cross-device state?
- Can an existing maintained repo serve as the core instead of rewriting it?
- Which surfaces can be omitted now without undermining the feature?

Only after these answers, implement the minimal operation/view and derive host adapters from the common contract.

## D. Acceptance and test matrix

| Check | Local browser | Remote MCP | MCP Apps | WebMCP |
| --- | --- | --- | --- | --- |
| Pure result matches golden fixture | required | required | if surfaced | if supported |
| Invalid schema input rejected | required | required | bridge error shown | adapter error shown |
| User-private write requires per-user auth | when applicable | always if exposed | recheck on server | reuse current user's page permissions |
| Offline or unavailable-server fallback | required | n/a | useful host error | native UI unaffected |
| Responsive, keyboard, accessible interaction | required | n/a | required if UI | page UI unchanged |
| Unknown/unsupported host | normal Web | text/data fallback | no iframe expected | feature detected / no registration |
| Board/storage schema migration | required | n/a | n/a | n/a |

CI should include types, lint, unit tests for schema/operations/migrations, Workers integration test, and focused Playwright E2E for Web and iframe behavior. An external ChatGPT connection is a separate integration smoke, not a guaranteed CI environment. In the first PR that introduces a build, record exact commands and CI evidence.

## E. Principal risks to actively try to falsify

1. **False UI portability:** "same Vue component" does not imply identical storage, host UI bridge, CSP, responsive constraints or permissions.
2. **Hidden server dependency:** one dashboard widget calls /mcp in local-only mode and breaks offline.
3. **Registry drift:** one operation receives different schema/defaults in WebMCP and remote MCP.
4. **Tool explosion:** model tool list polluted with irrelevant widget controls; operation selection degrades.
5. **State confusion:** localStorage and Worker are portrayed as shared state without synchronization.
6. **Insecure writes:** an unauthenticated Worker shares task/user data among callers or accepts unbounded payloads.
7. **Import loss:** a legacy board export drops unsupported kinds, versions, or instance config.
8. **Mobile regression:** desktop board works but phone Safari cannot operate picker, settings or resized widgets.
9. **External-tool duplication:** an existing utility is cloned, creating two diverging sources of truth.
10. **Overbuilt infrastructure:** custom backend/queues/DB/DO introduced before a feature needs them.

## F. Reviewer checklist for this design PR

- [ ] Confirm no existing invariant was silently removed from principles.md, basic-design.md, schemas.md and dev-guide.md.
- [ ] Check original MyDashboard's cross-device and transfer needs are not demoted to "not needed".
- [ ] Review operation schema, exposure, runtime, effects, data privacy and UI coupling before starting code.
- [ ] Check optional Worker and local-only mode can be built/deployed independently.
- [ ] Verify the first integration test is realistically runnable under current MCP Apps/ChatGPT/WebMCP implementations.
- [ ] Decide whether the v2 documents supersede or link from the legacy ones **only after the design review**.
- [ ] No merge solely because these docs were added: this PR intentionally has no build/lint/test evidence yet.

## G. References

- [Current principles](./principles.md)
- [Current basic design](./basic-design.md)
- [Current schemas](./schemas.md)
- [Current development guide](./dev-guide.md)
- [New v2 architecture](./architecture-v2.md)
- [New v2 module contract](./tool-module-contract-v2.md)
- [Platform and browser-local data decision](./platform-and-data-v2.md)
- [Design system and UI parts contract](./design-system-and-parts-v2.md)
