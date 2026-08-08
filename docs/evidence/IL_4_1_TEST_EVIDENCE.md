# IL-4.1 Twin Vocabulary Test Evidence

**Story:** `IL-4.1` - Twin node/relationship domain vocabulary  
**Capability:** `DC-03`  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Platform:** Windows 11, Node.js 22.22.0, npm 10.9.4

## Decision

The domain package now implements the frozen `twin-vocabulary.v1` representation: ten node types and thirteen directed relationship types with stable identities, positive revisions, exact Project/Mission scope, source attribution, canonical time, extraction method and explicit epistemic metadata. Every variant round-trips through the canonical serializer. Every relationship binds exact endpoint revisions and rejects cross-scope construction.

This closes only the `IL-4.1` vocabulary acceptance. No existing entity is projected into the vocabulary, no graph is persisted, and no Twin API, UI, traversal, invalidation, reconciliation or readiness behavior exists.

## Acceptance evidence

| Acceptance | Executable observation | Result |
|---|---|---|
| Ten node types | Exact vector and uniqueness assertions cover `Project` through `ReleasePassport` | `PASS` |
| Thirteen relationship types | Exact vector and uniqueness assertions cover `SCOPED_TO` through `BLOCKS` | `PASS` |
| Metadata invariants | Stable ID, positive revision, exact scope, all six origins, logical source reference, revision/digest union, recorded/effective time, extraction method and both epistemic labels validate | `PASS` |
| Exhaustive serialization | All 10 node and 13 relationship variants canonically serialize, deserialize and reserialize byte-for-byte | `PASS` |
| Endpoint revisions | Relationship serialization requires the exact supplied node identities and revisions; substitution rejects | `PASS` |
| Scope isolation | Every one of the 13 relationship types rejects both cross-Project and cross-Mission endpoints; edge metadata must also match | `PASS` |
| Confidence semantics | Node confidence is extraction quality, edge confidence is relationship-match quality, scores are integer 0-10,000 basis points, and semantics are fixed to `QUALITY_ESTIMATE_NOT_TRUTH_PROBABILITY` | `PASS` |
| Fail-closed parsing | Unknown fields, types, versions, invalid revisions, unsafe source references and malformed metadata reject with stable non-revealing errors | `PASS` |
| Package boundary | Domain source continues to reject application, infrastructure, contract, web and API dependencies | `PASS` |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd run typecheck -w @intelliloop/domain` | 0 | Strict TypeScript checks passed |
| `npm.cmd run build -w @intelliloop/domain` | 0 | Production domain compilation passed |
| `npx.cmd vitest run packages/domain/test/twin-vocabulary.test.ts --config vitest.unit.config.ts` | 0 | 1 file, 12 tests passed |
| `npm.cmd run check` | 0 | 166 unit/component and 91 API tests passed; packages/API/web built with 60 Vite modules; safety/privacy/doc gates passed |
| `npm.cmd run test:e2e` | 0 | 5 Chromium workflows passed |
| `npm.cmd audit --omit=dev --json` | 0 | 0 vulnerabilities across 104 production dependencies |

## Negative vectors

- unknown node or relationship variants and unsupported vocabulary versions;
- zero or unsafe entity revisions;
- unknown serialized properties, including a truth-probability-shaped field;
- invalid origin, epistemic, timestamp, extraction and source revision/digest metadata;
- absolute/private or traversal-capable source references without value echo;
- node confidence mislabeled as relationship-match quality, invalid score range or altered semantics;
- relationship endpoint identity/revision substitution; and
- cross-Project, cross-Mission and mismatched relationship-metadata scope across every relationship variant.

## Security, privacy and authority observations

- The implementation is domain-only and adds no database migration, route, browser state, filesystem/process operation, external call, log field or credential dependency.
- Serialized input is bounded to 16 KiB and exact plain JSON; unknown data fails rather than being retained ambiguously.
- Relationship scope checking prevents a generalized edge from silently joining records across Project or Mission boundaries. It is not user authorization.
- A valid serialization proves structural fidelity only. It does not prove source authenticity, factual truth, semantic relationship correctness, freshness, approval or readiness.
- Official Avishkar rules remain unverified; this record is implementation evidence, not an eligibility or compliance claim.

## Scope stop

`IL-4.2` owns deterministic materialization of existing domain entities and revision/invalidation behavior. This story intentionally adds no projection repository, relationship pair policy, migration, API resource, UI state or generated Twin data.
