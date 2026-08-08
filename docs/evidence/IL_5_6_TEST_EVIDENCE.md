# IL-5.6 Test Evidence - Findings and Impact UI

**Story:** `IL-5.6` - Findings and impact UI  
**Checkpoint:** `RECONCILIATION_REVIEW_READY`  
**Result:** `PASS`  
**Evidence date:** 2026-08-06  
**Authority:** R2 Reconcile Core boundary and dependency-eligible R3 `IL-5.6` acceptance criteria

## Delivered outcome

The Mission route `/missions/:missionId/reconciliation` now provides the bounded judge-facing workflow for deterministic findings and impact review. It loads one exact compatible persisted Twin/code-map pair, accepts only explicit operator support/impact declarations, runs the existing `IL-5.5` pipeline, selects immutable assessment history and presents:

- `CONFLICT`, `AMBIGUOUS`, `MISSING`, `STALE` and `IMPACT_GAP` reasons and stable identities;
- exact basis citations and stale dependency changes;
- deterministic impact paths with direction, relationship type, endpoint/member revision, digest and provenance; and
- explicit loading, empty, ordinary error, integrity error and bounded-partial states.

There is no dismiss, resolve, waive, approve, block or readiness control. Correcting a conflict still requires a persisted explicit `SUPERSEDES` successor, a successor Twin and a deterministic rerun. Historical assessment revisions remain immutable.

## Contract and integrity coverage

The strict browser client rejects unknown fields and malformed identifiers/digests as well as success-shaped semantic contradictions:

- finding counts that do not equal their variant totals;
- conflict/ambiguity or missing-support reasons incompatible with their finding type;
- AI-advisory impact citations;
- impact-gap basis citations that differ from the declared requirement;
- impact-gap reason/critical-asset/supporting-path combinations that violate domain semantics;
- stale dependency changes with incoherent added/changed/removed digest shapes;
- discontinuous path steps, invalid terminal-validation/status pairs and paths that do not visit the critical asset; and
- complete finding pages that cite a supporting path absent from the complete path page.

Twin node and relationship resources now expose `memberDigest`, computed from the exact canonical selected-revision member. The run form uses this digest for the root basis citation instead of incorrectly reusing the underlying source digest. The Twin source-type schema also includes the already-supported `SoftwareAsset` variant.

## Audit findings corrected

The story included an exhaustive regression audit through `IL-5.5`. Real-browser execution exposed and permanently corrected two integration defects:

1. Code-map asset scope/binding relationships used the `code-map-edge:` source-reference prefix. New projections use `code-map-asset:` for asset provenance while retaining `code-map-edge:` only for actual code-map edges.
2. Exact code-map binding verification treated every relationship with the legacy edge-shaped prefix as an actual dependency edge. Consequently a real nonempty map could fail every reconciliation run with `409`. Verification now compares only references derived from actual code-map edge identities and remains backward-compatible with already-persisted legacy asset citations.

A dedicated API regression builds a Twin with a legacy asset citation plus a real dependency edge and proves the exact edge is accepted without admitting an extra or missing edge. Internal API failure logs may include only a bounded uppercase stable domain-error code; declarations, canonical JSON, raw errors and paths remain excluded.

## Executed verification

| Gate | Observed result |
|---|---|
| Focused strict web client/routes | `21/21` passing across reconciliation client, Twin client and route/component suites |
| Focused reconciliation service regression | `4/4` passing |
| Workspace TypeScript | All five workspaces passing |
| Aggregate non-browser gate | `261` unit/component and `143` API tests passing; production packages/API/web builds passing |
| Generated safety evidence | Repository-safety, privacy, Twin and code-map generators passing |
| Documentation integrity | `64` Markdown files, zero broken local links |
| Isolated Chromium | `8/8` workflows passing on fresh loopback ports at the 1366x768 baseline |

The new real-browser workflow creates two incompatible active claims, verifies an initial `CONFLICT` and cited depth-zero implementation path, appends an explicit correction through the API, materializes a successor Twin, reruns assessment, preserves revision 1 and verifies revision 2 contains `STALE` without the corrected active conflict. It also covers loading, keyboard execution/history controls, absence of decision controls, ordinary findings-request failure/retry and desktop overflow.

The default Playwright ports were already occupied by the operator's manual development session, so final browser verification used isolated loopback ports rather than stopping or modifying that process.

## Trust boundary and remaining work

Persisted validation-result intake/reconstruction remains unavailable. A declared validation key therefore fails closed as absent, and a selected Twin containing validation nodes that the service cannot reconstruct is rejected. The UI does not convert finding presence/absence, validation status, static code structure or path reachability into readiness.

No AI/provider call, prompt, credential, external transfer, repository write, schema migration or canonical finding mutation was introduced. The Phase-5 prohibition remains intact: AI cannot create, dismiss or resolve a canonical finding. `IL-5.7` remains the next story and owns `EV-RECONCILE`, deterministic aggregate rerun proof and controlled metrics limitations; this record does not pre-claim that gate.
