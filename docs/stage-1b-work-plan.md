# Stage 1b implementation plan

Issue: https://github.com/clockcrockwork/Tool-Dashboard/issues/12
Base: merged Stage 1a, main commit e3380c47ba25e59612849f5cb548e10479194d80.

The implementation follows the existing Vue/TypeScript and Dexie decisions. It remains local-only; the old prototype is not the implementation target. Configs, placements and target data have separate identities. Changes to shared targets or removal previews must be checked in the same transaction as the mutation.

1. **Local repository:** versioned IndexedDB tables, independent instance and standalone configs, revision-checked mutations, retained unplaced instances, target references and tombstones. Define migration and failed-migration recovery before any destructive upgrade.
2. **Recovery and deletion:** a validated, versioned export/import envelope retaining unknown fields/kinds; preview without writes; verify export and require an explicit saved confirmation; recheck revisions and references transactionally. Keep shared targets unless a separate impact review authorizes their deletion.
3. **Controller:** per-view typed drafts and intents, committed revision and conflict state; validate a snapshot with the existing operation schemas on submit. Ignore stale async results and preserve dirty drafts on external updates.
4. **Board and standalone:** accessible clock and color views, re-add retained instances, three explicit removal flows, keyboard-operable edit mode and phone composition. Display unsupported kinds read-only.
5. **Verification:** pinned install, check and build; repository migration, race, export/import and unknown-kind tests; focused desktop and mobile WebKit flows including keyboard, two tabs, offline and no Worker. Obtain independent review and CI evidence before marking the issue complete.

The local board, repository, v3 recovery envelope, migration paths and focused tests are implemented. Unsupported future exports and unrecognized target references are stored as opaque original files; legacy layout reconstruction is approximate and the original is retained. Loaded pages work offline, but offline cold start requires the later PWA stage. Final acceptance still requires the PR's independent review and CI, including mobile WebKit.
