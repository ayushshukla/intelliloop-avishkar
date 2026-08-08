# IL-4.6 Code-Map Projection and Fallback Test Evidence

**Story:** `IL-4.6` - Code-map Twin projection and declared-manifest fallback  
**Outcome:** Code assets bind to one exact Git snapshot; eligible bounded failure can use explicitly declared IntelliLoop evidence without parser equivalence  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Required documents:** [DOC-04 Domain model](../architecture/DOMAIN_MODEL.md), [DOC-16 Trust model](../product/TRUST_MODEL.md)

## Delivered boundary

`code-map-projection.v1` is a canonical, source-free, append-only representation over one exact Project, Mission, repository registration and post-extraction `GitSnapshot`. It carries an input digest, snapshot digest, extraction/manifest digest, evidence kind, inference status, completeness, deterministic evidence-kind-specific assets/edges, predecessor and projection digest.

The run service captures Git before scanning and after extraction. It persists only when the two observations have identical scope, registration, head and status summary, and binds the projection to the second snapshot. A real controlled Git repository test exercises scanner, TypeScript extractor, migration `009`, repository restart and Twin materialization together.

Successful static output is `STATIC_INFERENCE`, `AVAILABLE` and `COMPLETE`/`PARTIAL`. Its Twin nodes are `SoftwareAsset` records with `REPOSITORY_OBSERVATION`, `STATIC_CODE_EXTRACTION` and `INFERENCE`; every asset is `BOUND_TO` the exact snapshot.

Fallback is constructor-explicit and accepts only `intelliloop-declared-code-map.v1` with `INTELLILOOP_CONTROLLED_FIXTURE_ONLY` ownership. It activates only for enumerated scanner/extractor limit or safe-failure codes. The persisted record is `DECLARED_INTELLILOOP_FIXTURE`, `UNAVAILABLE_SAFE_FAILURE`, `UNAVAILABLE`, with manifest identity and fallback reason; its Twin metadata is `SYNTHETIC_FIXTURE`, `DECLARED_FIXTURE_MANIFEST` and `INFERENCE`. Declared assets use different stable identities from inferred assets even when logical keys match.

Repository movement, missing/archived scope, registration/root errors, invalid extraction input, storage conflict/failure and integrity failures have no fallback path. No source text, absolute repository root, runtime-semantics claim, finding or readiness state is persisted. This story adds no HTTP/browser route; `IL-4.7` owns accessible presentation and `EV-CODEMAP`.

## Acceptance evidence

| Acceptance | Proof |
|---|---|
| Snapshot binding passes | Service tests assert post-extraction snapshot identity and reject changed head state; real integration persists snapshot `S2` and produces one `BOUND_TO` relationship per SoftwareAsset |
| Inferred and declared labels differ | Domain/Twin/service vectors assert evidence kind, status, completeness, origin, extraction method and evidence-kind-specific member identity differences |
| Fallback is explicit | Service requires `enabledForControlledIntelliLoopFixture: true`, exact manifest version/ownership and an allowlisted safe-failure code |
| No silent parser equivalence exists | Invalid inferred/unavailable combinations reject; declared results always keep inference unavailable and synthetic origin; repository movement and ineligible errors remain hard failures |
| Restart/integrity | Closed/reopened SQLite returns exact canonical equality; mutation triggers reject update/delete; canonical asset tampering fails with `CODE_MAP_STORAGE_SCHEMA_INVALID` |
| Twin projection | Real extraction creates `SoftwareAsset` nodes and bounded `SCOPED_TO`, `BOUND_TO` and static code relationships through the existing Twin vocabulary |

## Focused verification

| Command | Exit | Result |
|---|---:|---|
| `npx.cmd vitest run packages/domain/test/code-map-projection.test.ts packages/domain/test/twin-projection.test.ts --config vitest.unit.config.ts` | 0 | 2 files, 12 domain/Twin tests passed |
| `npx.cmd vitest run apps/api/test/code-map-projection-service.test.ts apps/api/test/code-map-repository.test.ts apps/api/test/database-lifecycle.test.ts apps/api/test/twin-repository.test.ts --config vitest.api.config.ts` | 0 | 4 files, 20 service/persistence/migration tests passed |

## Aggregate verification

| Command | Exit | Result |
|---|---:|---|
| `npm.cmd run check` | 0 | Strict typechecks; 183 unit/component and 117 API tests; all production builds; repository-safety and privacy proofs; 53 Markdown files with zero broken local targets |
| `npm.cmd run test:e2e` | 0 | 6 existing Chromium workflows passed; IL-4.6 intentionally adds no browser route |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities across 105 production dependencies |

The web production build transformed 66 modules. `EV-REPO-SAFETY` and `EV-PRIVACY` regenerated successfully; neither proof widened into a code-map API/provider surface.

## Manual checkpoint

The internal implementation is usable and restart-safe, but the judge-facing checkpoint remains after `IL-4.7`. That story must expose strict code-map retrieval, accessible attributed list presentation, honest unavailable/partial states and final `EV-TWIN`/`EV-CODEMAP` artifacts. Until then, manual review is developer-focused through the real-repository integration test and persisted canonical records.
