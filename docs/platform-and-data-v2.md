# Platform and data architecture for Tool-Dashboard v2

Status: **Draft recommendation** for PR #10, 2026-11-12. The creator explicitly reopened the earlier Astro + Vue assumption. **Do not treat the UI framework choice as decided until the thin implementation confirms it.** This ADR complements [architecture-v2.md](./architecture-v2.md) and [design-system-and-parts-v2.md](./design-system-and-parts-v2.md).

## 1. Baseline and decision criteria

The existing repository has a large React design prototype (~94KB JSX) that was never split into production modules, while original documents expected Astro + Vue. The existing design is not an approved visual target; preserve it only as an optional reference. Requirements prioritized for a new choice:

1. A persistently interactive, configurable personal board and standalone utility pages.
2. Browser-local processing and data with optional offline/PWA support, no required cloud login.
3. Potentially extensive IndexedDB data, some compute-heavy Dedicated Web Workers.
4. A shared operation model that can be exposed via remote MCP, optional MCP Apps and experimental WebMCP.
5. Independently replaceable board themes/visual components, accessible phone UI, simple addition of tools.
6. Cheap Cloudflare hosting, minimal infrastructure, existing standalone project reuse, no forced server sync.

## 2. Options

| Option | Fit | Tradeoff | Recommendation |
| --- | --- | --- | --- |
| Astro + Vue islands | Many static SEO pages with a few dynamic widgets | Most of this board stays hydrated/interactive; extra islands/ownership boundaries, cf beta reports Astro 6+ incompatibility | **Deprioritize**, preserve for a separate content/marketing site if ever needed |
| **Vue 3 + Vite + TypeScript SPA/PWA** | High-interactivity widget board, IndexedDB, browser workers; existing planned Vue model | New production code; React prototype not directly reusable | **First implementation candidate** |
| React + Vite + TypeScript SPA/PWA | Equally capable, some prototype JSX reusable and mature ecosystem | Prototype has monolithic logic and visual design needs rework; reuse may be misleading | **Valid fallback** if a tiny spike demonstrates significant advantage |
| Hono (+ JSX / SSR) alone | Cloudflare HTTP routing, server-rendered forms, API | Not a direct substitute for rich browser UI; does not make IndexedDB/Web Workers easier | **Not the primary UI framework** |
| Vue + Vite with optional Hono Worker | Client-first UI plus API/MCP routes with optional future sync | Adds a server framework and configuration only when /api warrants it | **Preferred optional server evolution** |

Recommendation: choose Vue 3 + Vite + TypeScript for the vertical slice, **not because framework X enables IndexedDB**, but because a consistently interactive SPA has little to gain from an Astro islands shell. Re-evaluate after implementing one human-facing tool + one board instance and one MCP App iframe. Avoid porting the whole React prototype.

## 3. What "Worker" means — do not mix runtimes

- **Cloudflare Worker**: remote HTTP execution, MCP endpoint and optional authenticated API. Can serve static assets and handle /mcp without making the browser dashboard call it. No persistent data unless backed by a store.
- **Dedicated Web Worker**: background browser thread for CPU-intensive tool operations. No direct DOM. May access IndexedDB. Use lazily per heavy utility, not for every widget.
- **Service Worker**: offline asset caching/update lifecycle for installable PWA, **not** a guaranteed running task scheduler or an HTTP remote MCP server.
- **WebMCP**: browser page API exposing currently available operations in that page, conditional on experimental browser implementation. Not another hosting worker.

Static SPA routes can be served as Workers Static Assets without invoking application code for every UI navigation in SPA asset routing mode. /mcp and later /api are runtime routes; test routing and CORS rather than assuming all paths are served the same way.

## 4. Cloudflare deployment / CLI

**New CLI**: cf entered beta on 2026-09-28. For this *new repo with no Wrangler config*, prefer **cf + cloudflare.config.ts + Cloudflare Vite plugin v2 beta** as a controlled spike, with tested/pinned versions and explicit reversal option. This matches Cloudflare's new-project guidance, not an assertion of GA stability.

- cf's typed config requires Node.js >=22.18; use a supported Node release pinned via engines/tooling.
- cf's Vite plugin v2 is beta and uses cloudflare.config.ts. Do not accidentally combine it with v1 Wrangler config snippets or run cf automatic setup on an existing wrangler.jsonc project.
- If the beta blocks the app, keep Web as a standalone Vite build and run remote MCP on the stable Workers deployment path temporarily, maintaining the operation boundary. Treat as a reversible deployment decision, not an architectural rewrite.
- Important CI nuance: cf build invokes the framework's build; it will not automatically execute arbitrary package.json build-script steps such as type-check/lint. Set separate explicit validation commands in CI.
- A single Cloudflare Worker deployment **may** serve /mcp, optional /api, and static SPA assets. Start with direct MCP handler/route switch; introduce **Hono only if route/middleware complexity earns it**. No one-Worker-per-widget or database solely because MCP exists.
- Authentication, rate/input limits and Cloudflare CPU cost must be measured independently for public versus private operations.

### Primary source verification

- [cf announcement and beta warning](https://developers.cloudflare.com/changelog/product/cf/)
- [cf project setup](https://developers.cloudflare.com/cf/get-started/first-worker/)
- [cf build behavior](https://developers.cloudflare.com/cf/projects/)
- [cf typed configuration / Node requirement](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
- [Vite plugin v2 beta](https://developers.cloudflare.com/workers/vite-plugin/v2-beta/)
- [Workers SPA static assets](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Hono Cloudflare Vite](https://hono.dev/docs/getting-started/cloudflare-workers-vite)

## 5. Local data, IndexedDB and isolation

Adopt a **LocalRepository abstraction** for tool data, instance configuration, board layout, and migrations. Use IndexedDB as the proposed canonical local persistence rather than layering an ever-growing collection of localStorage keys. Dexie.js is a reasonable first adapter because it supports declarative IndexedDB versions and migration handlers; do not force Dexie imports into every utility operation.

Proposed logical object-store categories (not mandatory DB tables until usage exists):

- Board: pages, instance references, layout per breakpoint, per-board design options.
- Tool instance config: per-instance preferences with explicit version and migration.
- Tool data: tasks, conversion history, other substantive user records (only when needed).
- System metadata: migration version, backup/export metadata, explicit sync cursors (when sync exists).
- Files: consider Blob storage or OPFS only for a concrete file tool; do not casually retain large raw files as board state.

Legacy v1 docs conflict on whether widget config is embedded inside the board state or stored separately. **Resolve canonical source of truth and an independent standalone tool ID before building migration logic.** The prototype was not a deployed app, so don't claim real-user data migration is needed; support imported/exported legacy-shaped JSON if that format is published.

Storage reliability:
- IndexedDB quota and eviction behavior vary by browser, particularly Safari; use try/catch around writes and expose storage errors.
- Backup/export and restore are required for irreplaceable personal records; consider navigator.storage.persist() as a best-effort request, not a guarantee.
- Handle two open tabs and IndexedDB versionchange/blocked events. Avoid concurrent migrations that cause partial UI data.
- Design cancellation and transfer of ArrayBuffer for heavy jobs; don't clone huge payloads on every progress update.
- Web Worker may access indexedDB, but tool operations must still have a deterministic, injected storage/compute port. Not all operations should run inside a Worker.
- Service Worker and Dedicated Web Worker have different lifecycles; do not rely on the former for ongoing Pomodoro alarm guarantees when all tabs are closed.

**Remote state is separate.** A ChatGPT MCP tool cannot access browser IndexedDB directly. If shared tasks/data are introduced, Web and MCP must use the same authenticated server-side repository, and the Web must retain a true local-only mode. Synchronization/merge/auth/retention are separate feature requirements and cannot be inferred from the existence of /mcp.

Sources: [MDN IndexedDB in workers](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/indexedDB), [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), [MDN storage eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [Dexie migration](https://dexie.org/docs/Tutorial/Understanding-the-basics).

## 6. First implementation proof / decision gate

1. Scaffold a tiny Vue 3 + Vite TypeScript app (not the entire board), using cloudflare.config.ts and cf beta **only as a pinned platform spike**.
2. Implement a utility with one pure transformation, one widget/standalone presentation, one typed operation; test directly, browser and remote MCP.
3. Store two distinct instances' settings and one tool's data in IndexedDB; test refresh, migration, quota failure, unknown kind, and two-tab interaction.
4. Offload one synthetic expensive transform to Dedicated Web Worker; measure responsive UI and request cancellation; keep trivial operations inline.
5. Verify offline access via Service Worker caches and static assets: Web works while remote MCP is unreachable.
6. Compare Vue reuse with a minimal React+Vite counterexample **only if** JSX prototype reuse or library compatibility produces an actual blocking issue.
7. Test one MCP Apps UI with host styles and one browser WebMCP registration using shared operation schema. Record unsupported hosts honestly.
8. Measure and document Free-tier Worker CPU and deployment tooling behavior before treating cf beta / Hono / storage choices as production validated.

**Acceptance:** A second tool can be added by authoring its module (metadata + optional operation + optional view) without touching protocol routing code, and the user can switch a visual theme without changing any domain operation.
