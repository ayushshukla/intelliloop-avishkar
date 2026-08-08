# IntelliLoop

> **Audience:** Developers, reviewers, demo operators and competition evaluators  
> **Status:** `G5_CORE_DEMONSTRABLE` - canonical release documentation complete through story `IL-9.3`  
> **Verified on:** Windows 11, Node.js 22.22.0, npm 10.9.4
> **Evidence date:** 2026-08-06

IntelliLoop is being developed as an evidence-reconciled Active Software Twin for bounded software changes. The intended product will connect requirements, decisions, repository observations and validation evidence so contradictions and missing support can be inspected before release readiness is trusted.

This repository contains the clean-room application foundation plus Project and Change Mission lifecycle, local persistence, bounded JSON APIs, safe local repository registration, immutable read-only Git snapshot capture, bounded redacted evidence preparation/persistence with an append-only timeline, normalized claim/supersession intake, imported historical runtime-observation summaries, generated cross-surface privacy evidence, the generalized Twin vocabulary, deterministic immutable Twin/code-map revisions, the deterministic Reconcile Core and cited impact paths, immutable reconciliation/impact history, the findings-and-impact browser workflow, deterministic cited explanations and synthetic edge-case suggestions, the fail-closed `readiness.v1` evaluator, immutable ReleaseAssessment persistence and the thin `release-passport.v1` projection. The `/demo` workspace now drives the fixed synthetic LoopMart scenario through the real persisted `BLOCKED → READY → STALE` sequence, including conflict/impact review, an AI-off cited answer and an unsigned Passport whose historical state is never rewritten. The browser never recomputes readiness. Live provider integration, public validation/review intake, release approval, signing and deployment authority are not implemented.

## What works now

- A localhost Fastify API exposes `GET /api/v1/health`.
- Typed startup configuration rejects non-loopback binding and invalid ports or log levels.
- Every API response carries a validated or generated `x-request-id`.
- Unknown, invalid and internal failures use stable, non-revealing JSON errors.
- Structured logs contain only an explicit safe-field allowlist; request bodies, headers, query values and raw errors are excluded.
- External AI and every experiment flag are frozen off by default.
- A dedicated `/demo` control room materializes the controlled retail fixture, applies its fixed correction, and demonstrates exact dependency staleness through normal product services.
- The four-test serial Chromium golden workflow observes zero external requests and zero credential-bearing requests; failure traces and screenshots are retained only on failure.
- Infrastructure-free primitives provide canonical JSON, SHA-256 digests, UUID v4 identities and injected UTC clocks.
- Immutable Project and Change Mission entities enforce one current mission per project, exact project scope, monotonic lifecycle time, terminal archival and deterministic revisions.
- Project and mission heads persist in API-owned SQLite with immutable revision history, atomic transitions and exact restart equality.
- Versioned Project/Mission JSON routes enforce strict schemas, stable errors and bounded cursor pagination.
- A Project can register one canonical local Git root read-only; traversal, symlinks, duplicate scope and database containment reject without exposing the raw path.
- A current mission can capture immutable branch/HEAD/dirty-summary Git observations through fixed read-only commands; clean, dirty, unborn and detached states are covered without repository mutation.
- The Projects route creates or selects persisted Projects; each Project change overview creates or retrieves its current Mission, registers one controlled repository and captures attributed snapshots through the real API.
- The browser clears the one-time repository path after registration and renders only path-free metadata, counts and digests; no root or changed filename is returned to the page.
- Snapshot presentation says `NOT ASSESSED`, observation only and not a readiness decision; later product stages remain unavailable rather than fabricated.
- Shared metadata contracts preserve project/mission scope, origin, source revision or digest, recorded time and epistemic label.
- `twin-vocabulary.v1` defines exactly ten node types and thirteen directed relationship types. Every value carries stable identity, a positive revision, exact Project/Mission scope, bounded source attribution, recorded/effective time, extraction method and `FACT`/`INFERENCE` metadata.
- Canonical node and relationship serializers reject unknown versions, fields and variants. Relationships bind exact endpoint revisions and reject any endpoint or relationship metadata crossing Project or Mission scope.
- Optional confidence is typed only as extraction quality for nodes or relationship-match quality for edges and fixes its semantics to `QUALITY_ESTIMATE_NOT_TRUTH_PROBABILITY`.
- Structured validation results bind one attributed evidence source to one exact Git snapshot with an immutable digest and `PASSED`, `FAILED` or `INCONCLUSIVE` outcome; they are evidence, not readiness.
- `twin-projection.v1` materializes Project, Change Mission, evidence, claims, Git snapshots, validations and explicit claim supersession into deterministic nodes, relationships and source bindings.
- Equivalent inputs produce byte-identical projection revision 1 regardless of collection order. Changed inputs append a successor revision, retain the predecessor digest and enumerate only the direct/transitive dependents of changed or removed members.
- Projection serialization is canonical and integrity-checked. Migration `008` stores the complete canonical document with exact scope, predecessor, counts and digests under append-only constraints.
- Mission-scoped Twin routes materialize current persisted sources idempotently and page immutable revision summaries, attributed nodes and exact-revision relationships. Stored tampering returns `INTEGRITY_ERROR` without partial data.
- The accessible Active Software Twin route provides empty/loading/error/integrity states, keyboard materialization, immutable revision selection, bounded-page disclosure and exact logical path citations.
- The Mission-scoped code-map scanner revalidates the registered canonical root and reads only `.ts`, `.tsx`, `.js`, `.jsx` and `.json` through a read-only filesystem adapter. It excludes `.git` and `node_modules`, reports unsupported extensions honestly and returns only relative paths.
- Code-map scanning fails closed beyond 2,000 encountered files, 256 KiB per accepted file, 5 MiB accepted bytes or five seconds. Traversal-shaped names, symlinks/junctions, root substitution, special entries, invalid UTF-8 and mid-read changes reject without executing scripts or installing dependencies.
- `code-map-extraction.v1` revalidates every scanned path, byte count, content digest and skip summary before using the TypeScript compiler API or strict JSON parser. It retains honest supported/unsupported coverage and emits deterministic file/package metadata, static imports/exports, exported interfaces/type aliases/enums, direct recognized Fastify route shapes and static-import-backed test associations.
- Extraction has its own five-second, 250,000-node, 20,000-record and 100-diagnostic ceilings. Syntax errors return a visibly `PARTIAL` bounded result; repository code, package scripts, dynamic imports, `require`, plugins and dependencies are never executed.
- Every extraction fixes `authority` to `STATIC_SYNTAX_ONLY` and `runtimeSemantics` to `NOT_OBSERVED`.
- `code-map-projection.v1` binds one source-free extraction to the exact post-extraction `GitSnapshot`, persists immutable revisions through migration `009` and projects files/packages/contracts/routes as attributed `SoftwareAsset` nodes. Every asset is `BOUND_TO` that snapshot; static code edges use only the existing bounded Twin relationship vocabulary.
- Mission-scoped code-map routes explicitly run static inference, page verified revision/asset/edge resources and return relative logical paths without source bodies or private roots. The web never requests declared fallback data.
- The Active Software Twin route includes **Map repository and refresh Twin**, explicit `STATIC INFERENCE` versus declared-fixture labels, bounded-page disclosure, attributed software assets and human-readable dependency paths. The accessible list is authoritative; no graph visualization is shipped in Phase 4.
- `EV-TWIN` and `EV-CODEMAP` are regenerated by a real temporary-repository, API, SQLite, Twin and restart proof. The proof also confirms repository-tree equality and per-run consent for the controlled declared fallback.
- Eligible bounded scanner/parser safe failures can use the explicitly supplied IntelliLoop-owned checkout manifest. Such records are labeled `DECLARED_INTELLILOOP_FIXTURE`, `UNAVAILABLE_SAFE_FAILURE`, `UNAVAILABLE`, `SYNTHETIC_FIXTURE` and `DECLARED_FIXTURE_MANIFEST`; they never alias inferred asset identities. Repository movement, scope/integrity errors and storage failures do not fall back.
- The API owns one local SQLite file, applies transactional migrations `001`-`010`, verifies migration checksums on restart and refuses unknown newer schemas.
- An accessible React/Vite trust shell exposes real Project, change-overview, evidence, Active Software Twin and findings-and-impact routes and labels every later product stage unavailable.
- The web client shows explicit loading, connected, error, empty and AI-off states, with keyboard skip navigation, real local-API retry and keyboard-operable Project workflow.
- The Phase-1 foundation gate has a reproducible clean-install, test, build, browser-smoke, audit and documentation-link dossier.
- Phase-2 capability `DC-01` has a generated repository-safety record proving exact status and complete-tree digest equality, the rejection corpus and operator-documentation fidelity.
- The domain accepts only declared Markdown, text or JSON evidence bytes up to 256 KiB, requires strict UTF-8, normalizes deterministically, redacts a named secret-pattern corpus and digests only the redacted normalized result.
- Malformed, oversize, binary-signature and structurally ambiguous inputs fail atomically. The pipeline has no persistence, API, UI, logging, network or readiness side effect.
- An in-process SQLite evidence repository stores only revalidated prepared values with exact Project/Mission scope, logical source locator, optional revision/effective time, origin, extraction method and epistemic label.
- Same redacted import plus exact attribution converges on one immutable `EvidenceSource` and one mission-sequenced `EVIDENCE_IMPORTED` event; distinct imports append history.
- Bounded structured claim intake normalizes subject/predicate terms, canonical JSON values and sorted applicability dimensions/time windows, then derives versioned comparison, applicability, claim and import digests.
- Every claim preserves a verbatim excerpt from its already-redacted evidence source, explicit `FACT`/`INFERENCE` metadata and source attribution. Conflicting claims are retained without an implicit winner.
- Corrections append a new immutable claim plus an attributed `SUPERSEDES` link. Cross-scope, mismatched comparison/applicability, self, forked and backwards-time successors reject; earlier claims remain readable.
- `reconciliation-rules.v1` deterministically compares only exact normalized subject/predicate identities in the same Mission and overlapping applicability. Shared dimension disagreements and non-overlapping half-open effective intervals are not comparable; equal canonical values are equivalent; unequal scalar values are incompatible; null, mixed-type and unequal structured values remain ambiguous. Fuzzy matching has no canonical authority.
- `reconciliation-decision-policy.v1` validates explicit exact-applicability supersession chains, rejects missing/forged/forked/cyclic topology, marks only claims with no valid successor active and deterministically emits open `CONFLICT` or `AMBIGUOUS` finding values for active pairs. Input order and timestamps cannot choose a winner.
- `reconciliation-reassessment.v1` composes those active findings with integrity-checked Twin/source/snapshot/relationship/validation dependencies and explicit support declarations. Absent exact required support emits `MISSING`; an exact dependency difference on a successor emits `STALE` for the predecessor without rewriting it.
- Reassessment replay is deterministic, restart-safe and input-order independent. An unrelated Twin revision appends a newly bound reassessment without falsely staling its predecessor; validation presence never means validation success.
- `impact-analysis.v1` traverses only explicitly declared roots and implementation/validation requirements. Its fixed policy follows `AFFECTS` forward, `DEPENDS_ON` in reverse, `IMPLEMENTS` toward a `SoftwareAsset`, and `VALIDATED_BY` forward as a terminal step.
- Impact traversal is deterministic breadth-first search with one canonical shortest path, exact node-revision cycle control and maximum depth 8. Every returned step preserves node/relationship identity, revision, digest and source attribution; unrelated relationship types are excluded.
- Impact gaps are emitted only for an explicit requirement whose critical asset, implementation path, validation result or validation path is absent. `FAILED` and `INCONCLUSIVE` validation results are structurally present but never treated as readiness, while declared/synthetic code-map support remains visible and emits `IMPLEMENTATION_SUPPORT_UNAVAILABLE`.
- AI-advisory roots and semantic relationships are rejected or excluded from canonical traversal. AI cannot create, waive or resolve an impact obligation or finding.
- `reconciliation-impact-revision.v1` binds the exact Twin, code map, target snapshot, reassessment and impact analysis into an append-only Mission revision. Exact input is idempotent; changed input appends a digest-linked successor and preserves history.
- Migration `010` and strict Mission-scoped reconciliation routes persist and page immutable revision summaries, findings and impact paths. Stored canonical JSON and duplicated envelope/count fields are revalidated on every read; cross-scope, binding, predecessor and transaction failures fail closed.
- The `IL-5.5` execution route reconstructs persisted evidence, claims and explicit supersession history from the selected Twin. Persisted validation-result reconstruction is intentionally unavailable at this checkpoint, so a Twin containing validation nodes is rejected rather than guessed.
- The Mission reconciliation route lets an operator explicitly declare optional evidence/validation support and one bounded impact obligation, run the deterministic pipeline, select immutable history and inspect `CONFLICT`, `AMBIGUOUS`, `MISSING`, `STALE` and `IMPACT_GAP` reasons plus cited path steps.
- The reconciliation browser consumes strict scope-checked resources, verifies complete-page counts and supporting-path references, exposes loading/empty/error/integrity/partial states, and provides no dismiss, resolve, approve or readiness control. Canonical Twin member digests are exposed so browser-authored declarations cite the exact persisted member rather than a source digest.
- `evidence-pack.v1` binds one redacted Mission question to one exact verified Twin and reconciliation/impact revision, selects compact source attribution, claim excerpts, supersessions, findings and paths, and omits full source content and private repository roots.
- The pack applies a second transfer-redaction pass, rejects silent truncation beyond fixed item/byte/conservative token-unit bounds, derives a canonical pack digest and provides one stable allowlisted citation locator per item. Compilation remains a pure local domain operation; `IL-6.4` returns its exact bytes only in the local `NOT SENT` disclosure and adds no provider call, credential or readiness authority.
- `offline-explanation.v1` answers only six fixed evaluation questions from the exact verified pack. It separates one cited answer from facts, inferences, conflicts, gaps and next actions, and labels the engine exactly `DETERMINISTIC_EXPLANATION` / `AI_OFF` with provider `NONE` and `externalCallMade: false`.
- The renderer marks superseded claim text as historical, never selects a conflicting claim, never emits a readiness field, and fails closed on unsupported questions or any explanation/pack/citation tampering. The value remains pure and unpersisted; the local API/UI only transports and verifies it, with no credential lookup or network call.
- `provider-adapter-policy.v1` constructs one digest-bound request containing the exact redacted pack, citation allowlist, strict structured-output schema and immutable limits. Runtime execution is either `DISABLED` or explicitly `MOCK_VALIDATION`; both record `externalCallMade: false`.
- Mock responses accept only exact request/pack/schema identity, strict answer/fact/inference/conflict/gap/action shapes, safe provider/usage metadata and the exact ordered union of resolvable allowlisted citations. Readiness/waiver fields, unknown members, forged citations, mismatched digests and resource overflow fall back to the complete `AI_OFF` explanation.
- The adapter fixes one concurrent request, a 20-second ceiling, one retry, 12,000 input-token units, 1,200 provider-reported output tokens and a 50,000-unit session budget. Timeout/transport failures retry only within policy; schema/identity/citation failures never retry.
- `POST /api/v1/missions/:missionId/cited-explanations` accepts only the six fixed questions and reconstructs the latest exact persisted reconciliation/Twin/source lineage. It always returns the deterministic explanation when the bounded inputs are valid; it accepts no provider mode, arbitrary prompt, finding mutation or readiness field.
- The browser cited-explanation route renders the `AI_OFF` answer, statement-level citation links, a used-citation registry and the exact redacted pack JSON with `NOT SENT` transfer status. Provider-disabled/failure state cannot hide the offline answer, while any response/citation-integrity failure clears prior content and renders no partial answer.
- Generated `EV-CITATIONS` proof covers all six fixed questions, citation resolution, mock/failure boundaries and zero canonical-state mutation for the `IL-6.4` surface.
- Production wiring uses the disabled provider-neutral adapter only. No product credential, network transport, provider body persistence or live call exists; controlled mock success/failure is test evidence, not a runtime AI claim.
- `openai-evaluation-checkpoint.v1` verifies the G3/citation/privacy/preview prerequisites and records exactly one frozen course-correction decision. `IL-6.5` selected `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE` because no transfer or runtime credential was explicitly authorized; provider grounding, citation quality, usefulness, latency and token metrics remain honestly `NOT_MEASURED`.
- `IL-6.6` records the professional AI safety, data-transfer and authority boundary: personal experimentation cannot widen product claims, canonical truth or release authority.
- Generated `EV-OPENAI-EVAL` binds that decision to the six exact `NOT_SENT` previews, scans repository text for non-fixture credential patterns, records zero credential access/external calls/canonical mutation and contains no pack or provider body. It adds no product route, config switch or live transport.
- Mission-scoped JSON routes expose stateless evidence preview, idempotent commit, source/timeline retrieval, claim intake, explicit successor creation and bounded retrieval without accepting caller-forged prepared values or server-owned attribution.
- All new request and response schemas are strict; collections are bounded to 1-100, stable request IDs/errors are preserved, raw submitted evidence and absolute paths are excluded from responses and structured logs, and no update/delete route is registered.
- The Mission evidence route previews deterministic redaction before import, commits only the exact current preview, clears raw content after success and reconstructs persisted sources, import events, claims and explicit supersession history after reload.
- The browser validates exact resource shapes and cross-resource scope/lineage before rendering. Malformed or contradictory payloads produce an explicit `INTEGRITY ERROR` with no partial evidence display.
- Source and claim cards render `FACT` or `INFERENCE` as text, preserve provenance/revision/effective-time context and state that no label, import or successor is truth, validation or readiness authority.
- `EV-PRIVACY` exercises all 11 named redaction rules and proves fixed raw sentinels absent from captured safe logs, API success/error bodies, the closed SQLite database/sidecars and offline verification-only export/AI-pack projections.
- The privacy generator records no raw sentinel, private path or temporary root, traps external fetch, reads no provider credential and removes its owned temporary fixture before writing a passing report.
- Versioned `runtime-observation-summary.v1` JSON accepts only a bounded subject/environment/kind, canonical UTC window, sample count and 1-32 ordered numeric measurements. Input is limited to 32 KiB and a 31-day window.
- Runtime summaries enter through mission evidence routes, reuse redaction and append-only source/timeline persistence, and add one immutable observation projection. Exact replay returns the original source, event and observation.
- Freshness is derived from strictly later windows in the same subject/environment/kind series. Older observations remain readable as `STALE_BY_NEWER_WINDOW`; every resource says `HISTORICAL_EVIDENCE_ONLY` and `liveFeed: false`.
- External AI is off and no credential is needed.

## Quick start

```powershell
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run dev
```

Open `http://127.0.0.1:4173`. The API defaults to `127.0.0.1:3100`; Vite proxies local `/api` requests.

For the fixed Avishkar workflow, prefer `npm.cmd run dev:demo`, then open `http://127.0.0.1:4173/demo`. It uses an isolated schema-14 controlled-demo directory so stale pre-release development data cannot interrupt the presentation; normal migration integrity remains fail-closed.

For the optional read-only Twin comparison, run `npm.cmd run dev:replay`. Complete setup/correction, open **Active Software Twin**, and use **Evidence Replay Lab**; normal startup keeps this stretch feature omitted.

Run the non-browser verification suite:

```powershell
npm.cmd run check
```

This aggregate also regenerates repository-safety, privacy, Twin, code-map, reconciliation/citation and offline OpenAI-checkpoint evidence and checks every local Markdown link. Run those checks independently with `npm.cmd run evidence:repo-safety`, `npm.cmd run evidence:privacy`, `npm.cmd run evidence:twin-code-map`, `npm.cmd run evidence:citations`, `npm.cmd run evidence:openai-eval` and `npm.cmd run check:docs`.

Run the Chromium smoke test:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

## Trust boundary

- Product runtime makes no external network request.
- No OpenAI key or other credential is read, stored or printed.
- No candidate application source was copied or adapted.
- `directSourceCopyAuthorized` remains `false`.
- Generated [EV-PRIVACY](docs/evidence/EV_PRIVACY.json) is a fixed synthetic sentinel proof, not complete data-loss prevention or a security certification.
- Official Avishkar rules are not verified; this project does not claim official eligibility or compliance.

## Workspace

```text
apps/api                  Fastify API, SQLite persistence and bounded static code-map pipeline
apps/web                  React/Vite Project, evidence-lineage, Twin, code-map, reconciliation and cited-explanation UI
packages/contracts        Shared API, Twin/code-map list and scoped metadata contracts
packages/domain           Deterministic lifecycle/evidence/Twin/reconciliation authority, evidence-pack, offline-explanation and mock provider-validation contracts
packages/demo-fixtures    Explicit IntelliLoop-owned declared code-map fixture evidence
docs                      Implementation and evidence documentation
planning                  Authoritative R1-R3 planning artifacts
```

## Documentation

Start with the [verified execution state](docs/product/EXECUTION_STATE.md), [durable product target](docs/product/PRODUCT_TARGET.md) and [documentation index](docs/INDEX.md). The implemented operator flow is documented in the [user guide](docs/product/USER_GUIDE.md); setup, architecture, testing, security, provenance, AI-use and evidence records remain first-class deliverables.

## Current release checkpoint

Phase 8 is complete. `IL-8.1` defines the versioned [controlled retail cancellation fixture](docs/product/CONTROLLED_RETAIL_FIXTURE.md); `IL-8.2` adds fixed loader/reset; `IL-8.3` runs the persisted golden workflow; `IL-8.4` adds the [competition accessibility review](docs/evidence/ACCESSIBILITY_REVIEW.md); `IL-8.5` closes [G5 demonstrable-core evidence](docs/evidence/IL_8_5_TEST_EVIDENCE.md); and `IL-8.6` completes the [tested demo support package](docs/evidence/IL_8_6_TEST_EVIDENCE.md). `IL-9.1` adds clean release-platform verification, `IL-9.2` completes the [release-security audit](docs/evidence/IL_9_2_TEST_EVIDENCE.md), and `IL-9.3` synchronizes the [canonical professional documentation](docs/evidence/IL_9_3_TEST_EVIDENCE.md). The `IL-9.4` [product-measurement dossier](docs/evidence/IL_9_4_TEST_EVIDENCE.md), [management proof guide](docs/product/MANAGEMENT_PROOF_AND_PILOT_GUIDE.md) and [claim matrix](docs/submission/CLAIM_EVIDENCE_MATRIX.md) are implemented, but final story acceptance correctly remains open for real paired developer/lead/manager timings and feedback. Optional `IL-10.1` [Evidence Replay](docs/evidence/IL_10_1_TEST_EVIDENCE.md), `IL-10.2` [advisory-output disagreement](docs/evidence/IL_10_2_TEST_EVIDENCE.md), and `IL-10.3` [Guarded Remediation Preview](docs/evidence/IL_10_3_TEST_EVIDENCE.md) are complete behind default-off flags. Phase-1 repository reconciliation confirms `58/62`: `IL-9.4`, `IL-9.6` and `IL-9.7` are partial, while `IL-9.5` is blocked on an official rules source. The development repository itself has an unborn `main` branch and every project path was untracked at verification entry, so it is not a frozen or tagged release candidate. The verified product is ready for controlled manual QA and leadership demonstration; the submitted `>20 hours/month` benefit remains an unvalidated pilot hypothesis. Linux is configured but not locally observed. A Passport remains unsigned and non-approving; no live provider call, credential access, live telemetry, public validation/review intake, release approval, signing, deployment authority, shell endpoint or execution of registered repository code exists. The officially submitted claim baseline is frozen in the [submission commitments](docs/governance/SUBMISSION_COMMITMENTS.md).
