# Stage 1a — executable foundation PR

This is the first implementation after merged design PR #10. It intentionally includes no IndexedDB persistence, board drag/resize, Cloudflare Worker/MCP server, PWA, or final visual design.

## Included

- Vue 3 + Vite + TypeScript minimal verification shell, not the intended dashboard.
- Zod 4 source-of-truth input/output schemas, runtime validation, generated JSON Schema and fail-closed unsupported types.
- Static utility catalog with duplicate-ID checks, UI-only clock registration and a bounded `color.hex_to_rgb` operation.
- Typed ViewModel and Part change intents, semantic token keys and negative compile-time fixtures.
- Strict TypeScript, `vue-tsc`, typed Vue ESLint, Vitest unit and contract tests, one npm lockfile.
- Single PR CI workflow with npm cache and concurrency cancellation; no deployment.

## Verified evidence

- Initial [Stage 1a bootstrap run](https://github.com/clockcrockwork/Tool-Dashboard/actions/runs/43198983479) passed npm install, lint, typecheck, 9 total tests and Vite build; its *final bot push* failed because protected branches require changes by PR.
- Corrected [bootstrap run](https://github.com/clockcrockwork/Tool-Dashboard/actions/runs/43199433162) **completed successfully** and published the exact generated package-lock Git blob. The user-authorized GitHub connector committed that lockfile to the PR branch without changing repository branch protection.
- One normal PR `npm ci → npm run check → npm run build` check must also pass with the checked-in lockfile. The PR must remain Draft until this evidence and independent review are available.
- UI browser E2E and remote MCP/ChatGPT connection are explicitly out of scope for Stage 1a and **not claimed PASS**.

## Follow-on stages

Stage 1b: local IndexedDB/Dexie, multiple widget instances, per-view draft and three removal modes. Stage 1c: stateless remote MCP. Stage 1d: MCP Apps. Stage 1e: authenticated ChatGPT multi-target state operation with continuously visible board. Stage 1f: experimental browser WebMCP.

See `docs/four-layer-contracts-v2.md`, `docs/quality-gates-v2.md`, `docs/implementation-plan-v2.md` for acceptance criteria.
