# Stage 1a — executable foundation PR

This is a first implementation after the merged v2 design. It intentionally has **no** IndexedDB persistence, board drag/resize, Cloudflare Worker/MCP endpoint, PWA, or final visual design yet.

## Implemented in this branch

- Vue 3 + Vite + TypeScript verification shell (not a finished dashboard).
- Zod 4 schema-first `defineOperation`, runtime input/output validation and fail-closed JSON Schema generation.
- Single build-time registry with duplicate tool/operation ID checks and independent UI-only clock registration.
- Typed `Part`/draft change intents and negative `@ts-expect-error` fixtures.
- TypeScript strict mode, `vue-tsc`, typed Vue ESLint, Vitest unit/contract scripts.
- Non-sensitive bounded `color.hex_to_rgb` test operation; **not** a deployed MCP endpoint.

## Must verify before marking Stage 1a complete

1. Generate and review one `package-lock.json` on a network-enabled runner (`npm install --package-lock-only`).
2. `npm ci`
3. `npm run check` (ESLint / TypeScript / Vue / Unit / contract tests)
4. `npm run build`
5. Fix any real compatibility/runtime errors and attach command evidence to this PR.

The authoring environment could verify pure TypeScript contract files and hex conversion, but cannot connect to the npm registry. Do not claim dependency-based lint, typecheck, build or UI E2E PASS until an actual runner proves them. Production CLI, MCP Apps, remote access and CI setup follow the gates in `docs/implementation-plan-v2.md`.
