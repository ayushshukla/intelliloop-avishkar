# IL-3.4 Evidence and Claim API Contract Evidence

**Evidence ID:** `EV-IL-3.4`  
**Story:** `IL-3.4` - Evidence and claim API contracts  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Execution boundary:** Localhost JSON API over the existing evidence and claim repositories

## Scope and authority

The frozen R3 outcome requires bounded, schema-validated preview, commit, retrieval, timeline and supersession APIs. Acceptance requires a passing Fastify injection suite, stable errors and request IDs, no secret or raw-path leaks, and bounded pagination. `IL-3.2` and `IL-3.3` are the implemented dependencies. DOC-06 is the [Local API reference](../api/API_REFERENCE.md).

The story exposes existing deterministic preparation and append-only persistence; it does not add a schema migration, browser import control, automated extraction, filesystem upload, arbitrary command, repository write, external provider call, conflict winner, Twin projection, validation or readiness decision. A source, claim, `FACT` label or successor link remains evidence, not truth or release authority.

## Implemented proof surface

| Surface | Implemented boundary |
|---|---|
| Shared contracts | Versioned request/response/resource types and converters for prepared evidence, sources, timeline events, claims and supersession links |
| Preview | Mission existence check plus pure strict-UTF-8 preparation; redacted response and no persistence |
| Commit | Server-side re-preparation, server-owned Project scope/extraction method/time/IDs and idempotent source/event persistence |
| Retrieval | Exact and bounded Mission-scoped source, timeline, claim and supersession reads |
| Claims | Bounded JSON intake against an explicit evidence-source path with inherited immutable attribution |
| Corrections | Explicit predecessor in `/claims/:claimId/successors`; atomic successor/link append and exact replay |
| HTTP safety | Strict schemas, unknown-field rejection, 1-100 pagination, request IDs and stable non-revealing errors |
| Privacy | Only redacted normalized evidence is returned/persisted; raw request content and absolute paths are excluded from successful resources, errors and structured logs |

## Route inventory

| Method and path | Proof purpose |
|---|---|
| `POST /api/v1/missions/:missionId/evidence/preview` | Stateless normalization/redaction preview |
| `POST /api/v1/missions/:missionId/evidence-sources` | Idempotent attributed commit |
| `GET /api/v1/missions/:missionId/evidence-sources` | Bounded identity-cursor source retrieval |
| `GET /api/v1/missions/:missionId/evidence-sources/:evidenceSourceId` | Exact scoped source retrieval |
| `GET /api/v1/missions/:missionId/timeline-events` | Bounded sequence-cursor import timeline |
| `POST /api/v1/missions/:missionId/evidence-sources/:evidenceSourceId/claims` | Idempotent normalized claim intake |
| `POST /api/v1/missions/:missionId/claims/:claimId/successors` | Explicit successor and `SUPERSEDES` link |
| `GET /api/v1/missions/:missionId/claims` | Bounded identity-cursor claim retrieval |
| `GET /api/v1/missions/:missionId/claims/:claimId` | Exact scoped claim retrieval |
| `GET /api/v1/missions/:missionId/claim-supersessions` | Bounded identity-cursor link retrieval |

## Acceptance evidence

| R3 acceptance | Observed proof | Result |
|---|---|---|
| Fastify injection suite passes | Six focused workflows cover preview, commit/get/list/timeline, claim/get/list/successor, privacy/errors, four collection cursors and absent mutation routes | `PASS` |
| Stable errors and request IDs pass | Valid inbound UUID propagates; generated IDs cover ordinary calls; schema/domain/not-found/conflict cases use the fixed envelope | `PASS` |
| No secret or raw path leaks | Sentinels remain absent from success/error bodies and safe logs; the secret remains absent from the closed SQLite file | `PASS` |
| Pagination is bounded | Default 20 and 1-100 limits, identity cursors and timeline sequence cursors traverse deterministically; invalid limits/cursors/extra query fields reject | `PASS` |

## Focused verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd run build:packages` | 0 | Domain, contracts and demo-fixtures packages compiled |
| `npx.cmd vitest run packages/contracts/test/evidence-api.test.ts --config vitest.unit.config.ts` | 0 | 2 resource-conversion and serialization tests passed |
| `npm.cmd run typecheck -w @intelliloop/api` | 0 | Route schemas, runtime wiring and injection tests typechecked |
| `npx.cmd vitest run apps/api/test/evidence-api.test.ts --config vitest.api.config.ts` | 0 | 6 Fastify injection tests passed |

The resource tests additionally prove optional-field omission, nested JSON preservation and explicit `INFERENCE`/`SUPERSEDES` serialization. Injection proves first-write `201`, exact-replay `200`, redacted-only retrieval, inherited attribution, stable multi-page ordering and rejection of caller-supplied `prepared` content.

## Aggregate verification record

| Gate | Observed result | Result |
|---|---|---|
| `npm.cmd run check` | Five workspaces typechecked; 19 unit/component files with 143 tests and 14 API files with 86 tests passed; all production builds passed | `PASS` |
| Production web build | Vite transformed 56 modules and emitted the production bundle | `PASS` |
| Repository safety | `EV-REPO-SAFETY` regenerated with exact status/tree equality and the negative corpus | `PASS` |
| Documentation | 43 Markdown files checked with zero broken local targets | `PASS` |
| Browser | 3 Chromium workflows passed against managed localhost API/web processes | `PASS` |
| Production audit | 0 vulnerabilities across all severities and 104 production dependencies | `PASS` |
| Runtime cleanup | No listener remained on ports 3100 or 4173; no current-run evidence/API/E2E fixture remained | `PASS` |

The previously disclosed schema-only operating-system temporary directory from an `IL-3.2` pre-final failed assertion remains subject to the execution-policy cleanup exception recorded in the [IL-3.2 evidence](IL_3_2_TEST_EVIDENCE.md). It was not created or modified by this story and contains no product data.

## Trust decisions

- Preview is useful for review but conveys no persistence, truth, validation or readiness result.
- Commit re-runs preparation from request content; prepared bytes, digests, attribution scope, IDs and recorded time cannot be forged through the route.
- Successful retrieval exposes the redacted normalized representation used for evidence identity and claim excerpts, never the original request bytes.
- Logical locators are reviewable attribution and reject absolute/private path syntax; they are not filesystem-read instructions.
- `created: false` means an exact idempotent replay, not a failed write.
- The predecessor route makes correction intent explicit. A later timestamp, compatible comparison key or list position does not infer supersession.
- API response schemas serialize arbitrary bounded JSON claim values without converting booleans, arrays, objects or nested values.
- Unsupported update/delete methods stay outside the contract; stored sources, events, claims and links remain immutable.

## Data and runtime evidence

`IL-3.4` adds no migration. The runtime still opens schema version 6, then constructs the Project, evidence and claim repositories before registering the routes. Mission lookup derives Project scope on the server. Evidence and claim repositories continue to own current-Mission, cross-scope, idempotency and append-only enforcement under immediate transactions.

## Limitations and handoff

`IL-3.5` is the next bounded story and owns the browser evidence-import workflow. `IL-3.6` owns the later cross-surface privacy evidence gate. `IL-5.1`/`IL-5.2` own compatibility, applicability overlap, conflict, ambiguity and the semantic effect of supersession. `IL-4.1` owns generalized Twin vocabulary.

Official Avishkar rules remain unverified. This evidence demonstrates the frozen local story acceptance only; it is not an eligibility, security, privacy or competition-compliance certification.
