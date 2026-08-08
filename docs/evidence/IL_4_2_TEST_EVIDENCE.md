# IL-4.2 Twin Projection Test Evidence

**Story:** `IL-4.2` - Twin projection, revisions and invalidation graph  
**Capability:** `DC-03`, `SUP-05`  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Execution boundary:** Pure domain materialization and canonical restart representation

## Implemented result

The production domain now projects validated Project, Change Mission, evidence, claim, explicit supersession, Git snapshot and structured validation entities into immutable `twin-projection.v1` revisions. Nodes retain source bindings; relationships retain endpoint revisions and attribution; dependency bindings support exact direct/transitive invalidation.

This is real production projection code over existing domain entities, not a hard-coded demo graph. IL-4.3 still owns SQLite persistence, revision APIs and the accessible authoritative list.

## Acceptance evidence

| Acceptance | Observed result | Status |
|---|---|---|
| Same input deterministic | Independent and reordered inputs produce identical IDs, revisions, digests, graph order and canonical bytes; replay returns the prior object | `PASS` |
| Changed digest invalidates dependents | Mission revision/digest change creates projection revision 2 and an exact transitive dependent set | `PASS` |
| Exact isolation | Removing the requirement branch does not invalidate the separate validation node | `PASS` |
| History unchanged | Projection revision 1 canonical bytes remain identical after revision 2 is produced | `PASS` |
| Restart equality | Canonical serialization/hydration returns exact object and byte equality; tampering rejects | `PASS` |
| Validation projection | Validation binds exact evidence and Git snapshot with a versioned digest and explicit non-readiness status | `PASS` |
| Scope | Cross-scope input rejects before any projection value is returned | `PASS` |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd run typecheck -w @intelliloop/domain` | 0 | Strict domain TypeScript passed |
| `npm.cmd run build -w @intelliloop/domain` | 0 | Production domain compilation passed |
| Focused Twin vocabulary/projection Vitest run | 0 | 2 files, 19 tests passed |
| `npm.cmd run check` | 0 | 173 unit/component and 91 API tests passed; all workspace typechecks/builds passed; Vite transformed 62 modules; repository-safety/privacy proofs regenerated; 49 Markdown files had zero broken links |
| `npm.cmd run test:e2e` | 0 | 5 existing Chromium workflows passed |
| `npm.cmd audit --omit=dev --json` | 0 | 0 vulnerabilities across 104 production dependencies |

## Manual-review handoff

At this stage reviewers can inspect canonical projection objects and deterministic source/path bindings in domain tests, but there is intentionally no browser Twin screen. IL-4.3 will persist and expose the list projection; IL-4.7 will provide the complete judge-ready manual review checkpoint, UI and evidence records.

No migration, route, filesystem scan, repository mutation, provider call or credential path was added. Official Avishkar rules remain unverified; this record does not claim compliance.
