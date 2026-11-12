# Tool-Dashboard v2: staged redesign and acceptance plan

Status: **accepted implementation direction, executable gates pending**, 2026-11-12. This plan follows the accepted [four-layer-contracts-v2.md](./four-layer-contracts-v2.md) and [quality-gates-v2.md](./quality-gates-v2.md), with architectural context from [architecture-v2.md](./architecture-v2.md).
Do not merge/implement unconfirmed product scope as if all requested widgets were approved for the same MVP.

## A. Confirmed baseline (2026-11-12)

- Public repo clockcrockwork/Tool-Dashboard, main HEAD 56a7cac; last commit 2025-12-25.
- Existing files: README.md, prototype.jsx (~94KB React concept), docs/principles.md, docs/basic-design.md, docs/schemas.md, docs/dev-guide.md. **No package.json, lockfile, deployable Astro/Vue app, or actual Worker in root.**
- No open issues or PRs, one branch (main) at time of review.
- Existing docs already specify standalone + board, per-breakpoint layouts, localStorage, config migrations, keyboard accessibility, clock v1, optional providers.
- Existing design conflict: board per-instance config in docs/schemas.md versus a separate wb:v1:toolConfig:<instanceId> key in docs/dev-guide.md. **Resolved for v2 by the normalized ConfigRepository/Board placement/targetRef contract**; v1 is preserved as an import format only.
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

**Accepted technology direction (actual tool versions and runtime compatibility still require validation):**
- **Vue 3 + Vite + TypeScript** for the first Web implementation, **IndexedDB + Dexie** for browser-local persistence. React + Vite is only a blocker-based fallback. Keep the React prototype as a visual/interaction reference, not production code to port wholesale.
- Cloudflare `cf`/Vite plugin v2 beta is the first **reversible deployment spike**; Hono is optional for real API-routing needs, not the UI stack.

**Proposals requiring validation by runnable vertical slice, not blanket adoption:**
- A TypeScript workspace with one static first-party utility catalog, and optional per-tool Vue views.
- Stateless Cloudflare Workers createMcpHandler for /mcp, no DB/DO initially.
- IndexedDB + Dexie is fixed; normalized instance/standalone config, Board placements, targetRef identity and per-view draft are **fixed in the module/four-layer docs**, with executable migration/round-trip proof still pending.
- MCP Apps UI built from the shared Vue view when ergonomically suitable; otherwise host-specific shell/view.

**Explicit nondecisions:**
- Final wanted-widget inventory/prioritization and which old widgets now have standalone applications.
- **General** cross-device sync provider, full account UX, temporary file transfer storage and retention. The narrow authenticated remote access for specifically opted-in AI targets is required separately in Stage 1e.
- Product-wide visual system, actual mobile layout composition and theme choice.
- Public app-directory listing, third-party marketplace, generic plugin SDK, commercial SaaS.

## C. Implementation order (each stage can be one or more small PRs)

### Stage 0 — accepted specification reconciliation (this Draft PR)

1. Mark old v1 implementation details as historical and establish one normative v2 map in README.
2. Freeze Board placement / durable instance / data target / mounted view IDs, one ConfigRepository, versions, migration/export/backup and **three removal modes** in [tool-module-contract-v2.md](./tool-module-contract-v2.md).
3. Freeze typed Operation, controller/ViewModel draft and committed state, Parts and Tokens, transport versus MCP model/app visibility, and remote target authorization/revision/idempotency. Keep actual provider and visual styling choices to the feature that needs them.
4. Verify [quality-gates-v2.md](./quality-gates-v2.md) contains executable acceptance checks for the above. The proposal PR remains Draft pending review; no actual app/build/CI has been executed.

**Exit:** a new implementer finds one canonical contract per concern and no contradictory v1 MUST rule.

### Stage 1a — runnable type/lint contracts (separate code PR)

1. Scaffold Vue 3 + Vite + TypeScript and one lockfile; Zod 4 JSON Schema generation must fail closed. Choose compatible MCP/Apps SDK versions when implementing relevant adapters; pin `cf` beta as a reversible experiment.
2. Compile `defineUtility/defineOperation`, typed ViewModel/draft and typed Parts fields/actions, one build-time registry, explicit remote model/app visibility, error taxonomy and token catalog. Include negative type fixtures.
3. Establish and run `npm ci → npm run check → npm run build`, with `check` including ESLint, `tsc`, `vue-tsc`, Vitest and schema contract/migration checks. Run check explicitly before `cf build`.

**Exit:** all actual commands PASS with evidence; second operation registration does not edit protocol adapters.

### Stage 1b — local Web + persistence + different views

1. Build a **minimal** board with one custom visual clock and one form/result color operation; do not port the obsolete unpartitioned `prototype.jsx`. Add two same-kind instances with separate configurations, plus standalone settings, and test explicit shared data references.
2. Prove IndexedDB/Dexie `placementId → instanceId → targetRef` ownership, revision CAS, migration/export/import, unknown/future version preservation, multi-tab and offline operation. No remote dependency.
3. Fields edit view-owned drafts through typed change intents. Submit snapshots and Zod-validates args; invalid/partial input remains draft. Provider changes update clean views, dirty drafts retain baseRevision and present conflicts.
4. Implement the **user-confirmed 3 deletion choices**: detach/retain/re-add, verified export+confirmation then conditional deletion/re-import, and explicitly scoped exclusive-data delete. Prevent shared-data cascade, unknown-target loss and export/delete races.
5. Verify adaptive phone/desktop shells, keyboard, basic PWA caching when implemented, re-render/unmount cleanup and no auto-rerunning operations on data notifications.

**Exit:** useful local Web MVP, independent of Cloudflare and ChatGPT. All data/draft/deletion tests PASS.

### Stage 1c — pure remote MCP gate

1. Publish a bounded, non-sensitive color operation through one stateless Cloudflare Worker. Verify schema validation, tools/list, tools/call, `structuredContent`, text fallback, rate/CPU limits and payload-free logs.
2. Explicit MCP visibility distinguishes `model` and `app`; published data tool has no accidental private/stateful access. Test MCP Inspector/SDK. Real ChatGPT pure-call smoke can be attempted when user connection permits.

**Exit:** direct and remote fixtures match. This does **not** establish ChatGPT access to browser IndexedDB or multi-widget data.

### Stage 1d — MCP Apps iframe gate

1. Serve one immutable/versioned `ui://` artifact from Worker-safe bundled HTML, test CSP, host resize/theme, `model` vs `app`, error/empty-state and text fallback.
2. Test cached old iframe with new strict output: supported versions work; incompatible versions show refresh **without losing dirty draft**. Old `prototype.jsx` has no backward-compatibility requirement.
3. Test in ChatGPT when supported and authorized. An unavailable external host is recorded as an external limitation, not as failure of a working local Web MVP.

### Stage 1e — **mandatory** stateful AI→multiple targets→visible board

1. Choose one authenticated transactional remote provider only at this milestone (required: owner scopes, target discovery, revision CAS, tombstones, idempotency). User explicitly opts in selected tool-instance configuration and/or data targets; others stay local-only. Remote-enabled Web and MCP use the **same committed provider**, not browser IndexedDB.
2. From one **real ChatGPT** instruction, discover/resolve two authorized board targets and run typed operations across both (same-kind multi-target and cross-kind A→B cases). Validate inputs at every boundary; do not create a generic workflow engine or simulate clicks.
3. Verify ambiguous names, shared-target deduplication, retry idempotency, revision conflict, deletion races, midway failure with per-target succeeded/failed/skipped results, and unavailable local-only targets.
4. The persistently displayed Web board follows committed AI updates within the chosen freshness target while preserving dirty local drafts and refusing stale saves. Test visibility regain, reconnect and subscription lifecycle. Offline remote-enabled drafts do not silently write or merge.
5. Explicit user account/app connection may be a HUMAN_GATE for real ChatGPT smoke; perform independent provider/contract tests first.

**Exit:** one ChatGPT instruction modifies two authorized remote-enabled configuration/data targets and the open board reflects both. Without this, **AI cross-widget requirement is NOT satisfied**, even if MCP Apps/WebMCP pure demos pass.

### Stage 1f — experimental WebMCP gate (non-blocking)

Register browser operations centrally per page/host and feature-detect support; one widget unmount cannot unregister a different target's tools. Test authorization, multi-instance selection and lifecycle in a supporting browser. Unsupported WebMCP must not block local Web or remote MCP and cannot substitute for ChatGPT's remote-state acceptance.

### Stage 2 — usable local widget board

1. Extend/polish the clock and color tools already proven in Stage 1b, with an optional network-time fallback and versioned configuration, without reintroducing the old JSX or a second UI/data model.
2. Extend the Stage 1b minimal board with edit-mode-gated drag/resize, layout persistence and per-breakpoint composition. Reuse the previously tested storage/three-delete-mode contracts; do not create a second identity or config store. Test keyboard and touch flows.
3. Keep advanced grouping, layering, multiple layouts and elaborate widget picker features as documented future capabilities; no need to implement everything before the first usable board.
4. Support a "shortcut/link to independent utility" entry, so mature external tool repos can be reached without copying code.
5. Ship the installable PWA/offline shell and verify standalone/tool assets are cached appropriately without requiring /mcp. Verify desktop Chrome/Firefox and mobile Safari/WebKit layouts are intentionally adapted.

**Gate:** Web remains fully functional without a remote Worker; browser refresh/import does not lose instances/config/data; mobile is usable and not a scaled desktop; the removal/restore choices remain consistent across hosts.

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

CI must run the canonical `npm run check` (lint, TS/Vue typecheck, unit and schema-contract tests) and build, with a focused Workers integration test and Playwright E2E for relevant Web/iframe behavior when executable. An external ChatGPT connection is a separate integration smoke, not a guaranteed CI environment. In the first PR that introduces a build, record exact commands and CI evidence.

## E. Principal risks to actively try to falsify

1. **False UI portability:** "same Vue component" does not imply identical storage, host UI bridge, CSP, responsive constraints or permissions.
2. **Hidden server dependency:** one dashboard widget calls /mcp in local-only mode and breaks offline.
3. **Registry drift:** one operation receives different schema/defaults in WebMCP and remote MCP.
4. **Tool explosion:** model tool list polluted with irrelevant widget controls; operation selection degrades.
5. **State confusion:** local IndexedDB and remote Worker are portrayed as shared state without explicit per-target remote opt-in/auth and a common provider.
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
- [Four-layer accepted contracts](./four-layer-contracts-v2.md)
- [Lint, typing, schema migration and CI gates](./quality-gates-v2.md)
- [Platform and browser-local data decision](./platform-and-data-v2.md)
- [Design system and UI parts contract](./design-system-and-parts-v2.md)
