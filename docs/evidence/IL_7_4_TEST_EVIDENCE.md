# IL-7.4 Readiness and Passport API/UI Evidence

**Story:** `IL-7.4`  
**Checkpoint:** `READINESS_PASSPORT_API_UI_READY`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06  
**Boundary:** Strict Mission-scoped assessment/Passport transport and presentation; no validation/review intake, release approval, signing, deployment or provider authority

## Result

`IL-7.4` adds closed `v1` resource contracts, seven Mission-scoped Fastify operations, a fail-closed browser client and the accessible `/missions/:missionId/passport` workspace. Assessment creation accepts exactly `{}` and delegates all input derivation to the repository-owned readiness service. Passport creation identifies one exact assessment revision and delegates projection to the existing one-assessment service. The UI renders the returned current state and never calculates readiness.

The workspace exposes ordered obligations and blockers, finding counts, validation requirements/evidence, explicit review, immutable snapshot/reconciliation/rule/digest bindings, structural citations and assessment/Passport history. It presents `BLOCKED`, candidate `READY` and historical `STALE` distinctly. Passport JSON download uses the server's `release-passport-export.v1` response; fixed safety metadata denies source bodies, private absolute paths, credentials, signature, release approval and deployment authority. Printing uses the same verified browser resource.

## Acceptance evidence

| Acceptance | Executable evidence | Result |
|---|---|---|
| Browser `BLOCKED` / `READY` / `STALE` | Chromium workflow cycles strict mocked server resources through all three current states, selects history, creates a Passport and downloads JSON | `PASS` |
| API contracts | Route tests prove all seven operations, exact empty command bodies, revision paging, current-state mapping and safe export headers/body | `PASS` |
| No caller-authored readiness | Fastify schemas reject status/obligation/review/validation additions; production routes call repository-derived services | `PASS` |
| No UI recomputation | Browser client validates server-owned `currentStatus`; component renders that value and has no readiness evaluator dependency | `PASS` |
| Integrity and scope | Client rejects unknown members, malformed digests, scope drift, blocker/citation inconsistency, private paths and elevated authority | `PASS` |
| Historical Passport | List/detail selection retains assessment revision, status-at-projection, derived current state, stale reasons and immutable digests | `PASS` |
| Safe print/export | Export contract is structural-only with explicit unsigned/non-approval warnings; browser verifies before download | `PASS` |
| Authority boundary | No validation/review intake, update/delete, provider, credential, signature, approval or deployment operation is added | `PASS` |

## Focused observations

- API readiness/Passport contract suite: `4/4` passed.
- Browser client and shell suites: `21/21` passed, including cross-Mission list-envelope rejection.
- Isolated Chromium workflows: `9/9` passed, including the new three-state readiness/Passport flow.

## Full repository gate

The completed gate passed:

- all workspace TypeScript checks;
- `374/374` unit/component tests across 42 files;
- `157/157` API/integration tests across 31 files;
- the production API/web build with 92 transformed web modules;
- `EV-REPO-SAFETY`, `EV-PRIVACY`, `EV-TWIN`, `EV-CODEMAP`, `EV-RECONCILE`, `EV-CITATIONS` and `EV-OPENAI-EVAL` regeneration;
- the AI-safety documentation contract;
- 78 Markdown files with zero broken local targets; and
- `9/9` isolated Chromium workflows.

The first unit invocation was blocked before collection by the Windows sandbox's esbuild child-process restriction. The authorized rerun passed every assertion; after the final Mission-scope regression was added, the complete suite passed all 374 assertions. This was an execution-permission condition, not a test failure.

## Honest limits and next authority

- `READY` remains a deterministic candidate assessment over exact persisted inputs; it is not approval or a claim that underlying evidence is true.
- Normal browser users cannot yet author validation results or explicit reviews. The screen therefore exposes blockers honestly rather than offering a bypass.
- The Passport is unsigned local structural evidence, not a waiver, certificate, signed attestation or deployment authorization.
- JSON download is not a general evidence exporter and performs no external transfer.
- Full cross-layer fixture, restart, Project isolation, tamper and zero-controlled-false-`READY` proof remains intentionally owned by `IL-7.5`.

The next dependency-eligible story is `IL-7.5`, Readiness/Passport integration, restart and safety proof.
