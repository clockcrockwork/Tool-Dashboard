# Quality gates and schema evolution workflow v1

Decision date: 2026-11-12.
Status: **ACCEPTED DEVELOPMENT POLICY** for implementing [four-layer-contracts-v2.md](./four-layer-contracts-v2.md), pending setup of executable code/CI. These commands are **target script names**, not evidence that the current repository can run them: \`main\` still has no package.json.

## 1. The source of truth

- **Zod 4** is the runtime schema authority for external operation inputs/outputs and persisted config/data. \`z.infer\` provides matching TypeScript types. Generate JSON Schema for MCP consumers from Zod; no manual duplicate types/schemas. If a Zod feature cannot serialize faithfully, fail schema generation and redesign that external boundary.
- **TypeScript interfaces/types** are the authority for internal ViewModels, typed intents, the static Parts discriminated union and design-token registry. Only the parts serialized over MCP Apps/iframe, import/export or persistence need a runtime schema.
- **CSS custom properties** are the rendered design-token interface. Their semantic keys are typed in TS. Runtime user theme values are checked with a narrow Zod schema/allowlist.
- A **single build-time tool catalog** owns \`kind\` and operation registrations; WebMCP and remote MCP adapters project only declared capabilities, not a separate hand-maintained registry.
- **Persisted data** has independent per-tool/store schema versions and a sequential migration registry. Data/config shape changes do not automatically bump Operation/Parts/Theme versions.

## 2. TypeScript and lint baseline

On the first runnable code PR, introduce **one lockfile** and TypeScript project boundaries for shared core, Web Vue SFCs, and Cloudflare Worker.

### TypeScript settings

Required by policy (adjust exact tsconfig project references to the chosen repo layout):

~~~json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "useUnknownInCatchVariables": true,
    "noEmit": true
  }
}
~~~

- Use \`tsc\` to typecheck shared core and Worker; use \`vue-tsc\` for Vue SFCs. Vite/\`cf build\` alone does **not** typecheck the application.
- Prefer \`unknown\` at runtime boundaries and narrow after validation. Ban \`any\` and unchecked casts in contracts, operations and adapters. Explicit exceptions need a reviewer-visible comment and a targeted runtime guard.
- Tool metadata and part IDs should use \`satisfies\`/narrow string-literal unions so invalid IDs fail at compile time. Use discriminated unions and exhaustive switches; no stringly-typed magic for tool actions or semantic parts.

### ESLint configuration

- ESLint **flat config** with \`eslint-plugin-vue\` + Vue's \`@vue/eslint-config-typescript\` (or equivalent proven Vue SFC parsing), and \`typescript-eslint\` type-aware rules. The first PR must prove that .ts and .vue both receive rules; a .vue parser configuration mismatch is a blocking failure.
- Base application: \`recommended-type-checked\` (or Vue-equivalent); for contracts/operations/adapters enforce stricter \`no-explicit-any\`, unsafe assignment/call/member access, unhandled promises, and exhaustive union handling. Do not add dozens of stylistic lint rules that hinder additions without protecting correctness.
- Prevent illegal dependencies through import restrictions: core schemas/operations cannot import Vue, Hono, browser DOM/storage, Cloudflare binding packages or the board; Worker adapters cannot import UI bundles; design tokens/parts cannot import executable business operations. Verify module boundaries with lint and, if necessary, one small dependency graph test.
- Keep generated outputs, build files and bundled iframe HTML out of hand-edited lint targets. Generated schema artifacts are tested by regeneration/diff, not edited by hand.

Current sources:
- [Vue TS and vue-tsc](https://vuejs.org/guide/typescript/overview.html)
- [Vue ESLint integration](https://github.com/vuejs/eslint-config-typescript)
- [typescript-eslint typed configs](https://typescript-eslint.io/users/configs/)
- [typescript-eslint typed linting](https://typescript-eslint.io/getting-started/typed-linting/)
- [TypeScript tsconfig](https://www.typescriptlang.org/tsconfig/)

## 3. Test gates per contract

| Layer | Type/lint | Runtime/compatibility | UI / host |
| --- | --- | --- | --- |
| Operation | Zod-derived input/output, no \`any\`, exhaustiveness, isolated core | valid/invalid input and output, exported JSON Schema snapshot, bounded payload, error code and effect/auth tests, direct vs MCP/WebMCP fixture equality | non-MCP client gets useful structured/text fallback |
| ViewModel | typed projection and intents, error union exhaustive | idle/working/ready/error transitions and serialized boundary parse (only if transported) | no premature success, correct async cancellation and focus feedback |
| Parts | discriminated union, unique IDs, binding/action key checks | manifest schema/version, duplicate/missing keys, unknown kinds, cross-host fallback | compact/detailed widget, phone, MCP iframe, no hidden required controls |
| Tokens | typed required semantic keys and safe override types | required-token completeness, user override rejection, no operation fixture changes | light/dark, contrast/focus, reduced motion and MCP host fallback |
| Persisted data/config (orthogonal) | versioned record types, repo interface | migration fixtures, import-export round trip, unknown/future versions preserved read-only, backup/restore, two-tab IndexedDB behavior | no silent reset or lost layout/instance settings |

Schema snapshots are **review signals**, not self-justifying truth: a change must be accompanied by a declared compatibility classification, fixture changes, version decision and migration when needed. CI must never blindly update golden snapshots and accept them.

### Compatibility rule

- **Compatible**: add new operation/tool/part/token, or optional field with tested default and identical behavior for existing input. Keep prior artifacts valid.
- **Potentially breaking**: rename/remove/repurpose \`kind\` / operation / part / token name; change required field, enum meaning, result shape, permission, dataClass/effect or persistence identity. Require explicit review and versioned adapter/migration.
- **Published operation breaking**: prefer a new operation ID or supported compatibility adapter; do not silently retarget old MCP clients. Keep old IDs documented until retirement is intentional and checked.
- **Data migration**: migrate sequentially by stored schema version in an atomic IndexedDB transaction when feasible; backup raw export before destructive changes. Failure must preserve the old bytes and surface a recoverable error. Unsupported *newer* versions must not be written over.
- **ViewModel**: purely internal compatible type changes have no transport version requirement. If serialized across an iframe/Worker boundary, independently version and validate the transmitted shape.
- **Visual-only**: changing a CSS value, theme preset or visual arrangement does not bump the operation contract version; still run UI/a11y smoke tests.

## 4. First code PR must establish a working \`check\` command

Target package scripts (actual implementations and dependency versions are chosen and tested when creating the first package.json):

| Script | Purpose | Required |
| --- | --- | --- |
| \`npm run lint\` | Type-aware ESLint for TS + Vue, no new unsafe boundary code | Yes |
| \`npm run typecheck\` | \`tsc\` for core/Worker + \`vue-tsc\` for Web | Yes |
| \`npm run test:unit\` | Vitest runtime tests for operations, ViewModels, parts/tokens | Yes |
| \`npm run test:contracts\` | Schema generation, snapshot drift, migration/fixtures, IDs/registry boundaries | Yes |
| \`npm run check\` | Combined lint → typecheck → unit → contracts, fail-fast | **Required before build/deploy** |
| \`npm run build\` | Web and MCP build including iframe resources | Required for code PR |
| \`npm run test:e2e\` | Playwright browser/small host smoke as soon as relevant surfaces exist | Required when UI/adapter is implemented; not inventable before then |

Run order: \`npm ci\` → \`npm run check\` → \`npm run build\` → focused integration/E2E when applicable. Every failed command must block calling a feature \`PASS\`.

**Cloudflare cf caveat:** \`cf build\` (and \`cf deploy\`) runs the framework's build, **not arbitrary npm build scripts**. Therefore put \`npm run check\` explicitly in CI and release workflow before \`cf build/deploy\`; do not assume a successful deployment means typed lint was run.
Source: [cf projects/build behavior](https://developers.cloudflare.com/cf/projects/).

## 5. One tool addition / schema change workflow

1. **Check existing tool and schema** in the first-party catalog and any already maintained standalone repository. Reuse rather than clone.
2. **Define the change category**: new utility; compatible field/part/token; or breaking schema/data change. Record IDs, \`contractVersion\`, stored \`configVersion\`/\`dataVersion\`, allowed runtimes, side effects and privacy.
3. **Write or change the authoritative Zod/TS types first**, including defaults and migration where needed. Validate cross-layer dependencies. No unbounded \`Record<string, any>\` for public data.
4. **Add negative and positive fixtures first** (invalid input, old records, unknown kind, unsupported future version, side-effect permission) and type-level checks. Avoid test-only copies of business schemas.
5. **Implement core application service**, then optional Vue view / parts / theme integration, then only the declared MCP/WebMCP adapters. No new hand-written protocol endpoint per utility.
6. **Run check and build**. Verify on relevant hosts; UI-only tools need no MCP server. Worker-backed ops require protocol smoke and resource/performance measurements. Report actual commands and results.
7. **PR review**: include schema diff, compatibility decision, data migration and rollback behavior, evidence (unit, type, lint, build, browser host, Workers). Any permission/auth change receives explicit security review.
8. **Merge only when required evidence passes and the repo's independent-review/merge rules permit it.** This policy does not authorize automatic merge.

### Lightweight CI despite limited GitHub Actions budget

- One small PR check for lint/types/unit/contracts/build with dependency caching and **concurrency cancellation for superseded commits**. Avoid multiple matrix runs or repeating the same build.
- Run Playwright/MCP host E2E only on changed relevant surfaces or explicitly requested verification; do not claim a skipped test passed.
- Docs-only PRs can verify references/format without installing a large browser stack; the first code PR must establish an actual lockfile and scripts.
- Keep an independent local/remote validation command runnable without GitHub Actions in case quotas are exhausted. No expensive periodic workflow is required just to enforce these design contracts.

## 6. Required acceptance criteria for freezing v1 source types

These policies are **accepted today**, but implementation is not yet complete. A runnable "contract v1" implementation is accepted only when:

- [ ] TS and Vue SFC typechecking both execute successfully.
- [ ] Type-aware ESLint actually analyzes core, adapters and .vue files, including a negative fixture that must fail.
- [ ] All external schema JSON generation succeeds from the single Zod source; incompatible Zod-only types fail generation.
- [ ] Registry rejects duplicate \`kind\` and operation IDs and undeclared agent exposure.
- [ ] Part renderer rejects invalid data/action bindings; one custom view works without the generic parts renderer.
- [ ] Two separately configured widgets of the same \`kind\` survive IndexedDB reload/migration and import-export; new unknown entries are preserved.
- [ ] Theme changes alter only presentation; core fixture results are unchanged.
- [ ] A public read operation works via core + MCP with matching fixtures, and text-only fallback if no MCP Apps UI is available.
- [ ] The \`check\` command is wired into a build gate; test/lint/typecheck/build evidence is attached to the implementation PR.

Do not mark the current documentation-only PR "build verified": it has no runnable app.
