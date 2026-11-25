# Agent entrypoint

Read [README.md](README.md) and the applicable canonical product and quality documents before changing this repository.

## Optional system QA

For an explicitly requested independent product QA task, read [the projected System QA workflow](docs/agent-workflows/system-qa.md) (Claude Code: /system-qa). This is not a new required product gate or an authorization to merge, deploy or modify production. Existing product requirements, tests, operating rules and human acceptance retain authority. Use canonical v2 contracts. First charter: local board placement, resize, undo, draft save/reload and stale-state recovery; check only implemented behavior at the target revision. Reuse npm run test:e2e and disposable browser storage. Design prototype observations are not product QA passes.

Projection integrity: run node scripts/agent/check-projection-integrity.mjs and node scripts/agent/verify-projection.js from the repository root; trusted canonical projection is the source, never hand-edit generated files. Before ready-for-review, confirm the merged canonical revision, reproject and run relevant existing gates. A receipt check does not establish product quality.
