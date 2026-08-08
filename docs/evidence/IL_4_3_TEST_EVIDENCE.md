# IL-4.3 Twin Persistence and List Test Evidence

**Story:** `IL-4.3` - Twin persistence, API and accessible list projection  
**Capability:** `DC-03`  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Execution boundary:** API-owned SQLite, bounded Mission APIs and the authoritative browser Twin list

## Implemented result

Canonical `twin-projection.v1` revisions now persist as immutable Mission-scoped SQLite records. The API materializes only from verified local Project, Mission, evidence, claim, supersession, Git-snapshot and validation inputs; it exposes exact revision summaries plus bounded node and relationship pages. The browser adds a keyboard-operable revision selector, attributed path citations, relationship endpoint revisions and a dedicated fail-closed integrity state.

Materialization is explicit and body-free. Callers cannot supply graph content, paths, timestamps, identities or a readiness decision. A same-input request returns the existing revision; changed input appends a successor linked to the exact predecessor digest.

## Acceptance evidence

| Acceptance | Observed result | Status |
|---|---|---|
| Database integration | Migration `008` stores the complete canonical projection with exact scope, predecessor, digest and count checks; updates and deletes reject | `PASS` |
| API integration | Five strict Mission-scoped routes materialize, list revisions, retrieve an exact revision and page nodes/relationships | `PASS` |
| Pagination | Revision, node and relationship collections use deterministic order, opaque continuation cursors and enforced `1..100` limits | `PASS` |
| Revision selection | The list selects a persisted positive revision and reloads its exact verified node/relationship resources | `PASS` |
| Path citations | Every source-backed node renders a logical source locator, source identity, source revision or digest, origin, epistemic label and recorded time | `PASS` |
| Relationship integrity | Relationship resources preserve type, identity, own revision and exact endpoint identity/revision pairs | `PASS` |
| Integrity failure | Canonical storage tampering and forged browser resources fail closed as `INTEGRITY_ERROR` without partial graph rendering or stored diagnostics | `PASS` |
| Restart and immutability | Exact revisions survive database reopen; direct SQL update/delete attempts reject and predecessor bytes remain intact | `PASS` |
| Manual usability | Chromium proves empty state, keyboard navigation, explicit materialization, attributed list review, relationship inspection and reload | `PASS` |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| Focused Twin repository/API Vitest run | 0 | 2 files, 4 persistence/API tests passed |
| Focused contracts/web Vitest run | 0 | 21 contract, client and component tests passed |
| Focused database/startup Vitest run | 0 | 15 migration lifecycle and startup tests passed at schema version 8 |
| API, web and contracts typechecks | 0 | Strict TypeScript passed in all changed workspaces |
| `npm.cmd run test:e2e` | 0 | 6 Chromium workflows passed, including the persisted Twin review and forged-integrity case |
| `npm.cmd run check` | 0 | 178 unit/component and 95 API tests passed; all workspace typechecks/builds passed; Vite transformed 65 modules; repository-safety/privacy proofs regenerated; 50 Markdown files had zero broken links |
| `npm.cmd audit --omit=dev --json` | 0 | 0 vulnerabilities across 104 production dependencies |

## Manual-review handoff

1. Start the supported local API and web development workflow.
2. Create or select a Project and current Change Mission.
3. Import at least one redacted evidence source through the evidence screen.
4. Open `/missions/{missionId}/twin`, confirm the honest empty state, then choose **Materialize Twin**.
5. Review the revision digest/counts, each node's path citation and each relationship's exact endpoint revisions.
6. Reload the page and select the persisted revision again; the authoritative data must remain identical.

The current materializer does not scan a checkout, run Git commands, call a provider or accept client-supplied graph content. Persisted validation-result intake, code-map filesystem safety, node-pair policy, reconciliation, traversal and readiness remain owned by later stories. A persisted `FACT`, confidence value, validation result or graph relationship is not automatically true and is not readiness authority.

Official Avishkar rules remain unverified; this implementation record does not claim competition compliance.
