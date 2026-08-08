# Controlled Retail Cancellation Fixture

**Audience:** Demo maintainers, reviewers and developers  
**Status:** `G5_CORE_DEMONSTRABLE`; Phase 8 complete through `IL-8.6`  
**Fixture:** `intelliloop-retail-cancellation-fixture.v1` / `loopmart-expanded-cancellation-v1`  
**Evidence date:** 2026-08-06

## Purpose

This IntelliLoop-authored fixture defines the fictional LoopMart cancellation change used by the competition demonstration. It contains no personal, employer, client or production data. The package remains an inert definition; the separately bounded API service materializes its fixed revisions under an API-owned generated root and loads them through normal product services. The service initializes and commits fixed Git content but never executes repository code or installs its dependencies.

The fixture declares the expected `BLOCKED → READY → STALE` sequence but does not hard-code product state. `IL-8.3` now obtains every transition through normal domain, persistence, API and browser paths; [EV-GOLDEN-FLOW](../evidence/EV_GOLDEN_FLOW.json) records that controlled proof.

## Scenario

The synthetic requirement expands cancellation from `BEFORE_PICKING` to `BEFORE_DISPATCH` and requires inventory release, refund initiation, fulfilment stop and customer notification. The initial state deliberately contains:

- an older ADR that still limits cancellation to `BEFORE_PICKING`;
- a second conflict about which component owns inventory release;
- cancellation-window and refund validation drafts only;
- no post-picking inventory-release or fulfilment-stop validation;
- code that imports the affected components but completes only the refund consequence; and
- a synthetic release note that calls the change `READY` despite the missing support.

The correction state adds:

- an ADR that explicitly supersedes both older conflicting claims;
- inventory release, fulfilment stop, notification and cancellation orchestration changes;
- a post-picking integration-test source file;
- attributed inventory and fulfilment validation drafts; and
- an explicit synthetic human-review draft that is visibly not a real approval.

## Fixture inventory

| Class | Count | Boundary |
|---|---:|---|
| Initial repository files | 9 | TypeScript/JSON strings only; no Git metadata or executable setup |
| Correction changes | 5 | Deterministic `UPSERT` declarations; corrected tree contains 10 files |
| Evidence drafts | 9 | Strict Markdown/JSON inputs with logical synthetic locators |
| Claim drafts | 7 | Five initial claims and two same-key explicit successors |
| Validation drafts | 4 | `PASSED` but permanently `executed: false` controlled inputs |
| Support requirements | 5 | Decision plus order/refund/inventory/fulfilment support expectations |
| Impact requirements | 5 | Order, inventory, refund, fulfilment and notification aliases |

The repository aliases and impact declarations are logical references. The loader resolves actual Git snapshot, evidence, claim, Twin member, code-map asset, reconciliation and assessment identities from persisted product results; none is hard-coded in the fixture.

## Validation semantics

The JSON validation drafts use `SYNTHETIC_FIXTURE`, `executed: false` and `ATTRIBUTED_CONTROLLED_RESULT_NOT_PRODUCTION_PROOF`. They state what the controlled demo will import; they do not claim that package code executed, that a real test runner observed a result, or that production behavior is safe.

Initially present:

- `test:order/cancellation-window`;
- `test:refund/initiation`.

Added during correction:

- `test:inventory/post-picking-release`;
- `test:fulfilment/post-picking-stop`.

The expected availability matrix is fixture metadata only. Reconciliation and readiness remain responsible for calculating findings and status from the materialized current state.

## Deterministic integrity and provenance

Run:

```powershell
npm.cmd run evidence:retail-fixture
```

The command builds only `@intelliloop/demo-fixtures`, validates structure/ownership/privacy, computes SHA-256 for every repository/evidence item and writes [EV-RETAIL-FIXTURE](../evidence/EV_RETAIL_FIXTURE.json). The report currently binds:

- fixture digest `sha256:bfc7189f28dd5bcffb4888ec3e9e69c0a86d95a6b3fc06fcefa7cbc449b8ac40`;
- initial tree digest `sha256:0085d0861ca95e66f3b33558f88a6a75136917b63ab332d30668e1a0b5c42b6c`;
- corrected tree digest `sha256:5e3bd1ca47b9d4f1af0ce0fc073490167dbe7dc510649f6c925085be06c1e4d0`; and
- evidence-set digest `sha256:cce7fe82f08da418b9020a3c30f4d3e9f3907fd9f232a915e95cfe2eb3dff357`.

The source strategy is `SOURCE_INDEPENDENT_BUILD`, external source transfer is `NONE`, ownership is `INTELLILOOP_AUTHORED_SYNTHETIC_ONLY`, and the fixture license classification is `PROJECT_INTERNAL_SYNTHETIC_FIXTURE`.

## Loader and reset operation

The local API exposes:

- `GET /api/v1/demo` for the current fixed-fixture lifecycle summary;
- `POST /api/v1/demo/setup` to create or reuse the initial real-path `BLOCKED` workspace; and
- `POST /api/v1/demo/reset` to remove only that owned workspace.

Both POST routes reject request bodies. Reset therefore has no caller-controlled path, Project ID or arbitrary fixture selector. Migration `013` records exact fixture ownership and gates deletion of otherwise immutable history behind an internal authorization for the one recorded demo Project. The filesystem marker is stored outside the generated repository and must match the fixed fixture ID, version and ownership before removal.

## Safety and next boundary

- No private absolute paths, credential-shaped values or company identifiers are permitted.
- Logical source locators use the fictional `synthetic:loopmart/...` namespace.
- No network access or external AI is needed.
- Repository source is stored as inert strings and is not executed by IntelliLoop.
- No fixture value is evidence truth, readiness, review approval, signature or deployment authority by itself.
- The fixture package itself remains inert; materialization/reset live only in the API's dedicated service.
- Ordinary registered repositories remain read-only and ordinary Project histories retain no hard-delete route.

`IL-8.3` proves the browser golden workflow, correction application and real product `BLOCKED → READY → STALE` sequence. Those states remain computed from exact persisted inputs rather than precomputed by the fixture. `IL-8.4` proves the accessible competition presentation; `IL-8.5` proves combined safety, restart, recovery, reset and a 5.8-minute rehearsal; `IL-8.6` adds the tested static fallback, exact asset metadata, judge Q&A and synchronized narration. Phase 8 is complete without turning any fixture value into production truth or release authority.
