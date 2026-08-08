# IL-6.4 cited-question API and UI evidence

**Story:** `IL-6.4`  
**Status:** `PASS`  
**Capability:** `DC-06`; closes `G3_DETERMINISTIC_CORE_PROVEN` with `EV-RECONCILE`  
**Evidence date:** 2026-08-06  
**Runtime boundary:** Local deterministic answer; production provider disabled; no external call

## Outcome

IntelliLoop now exposes one Mission-scoped cited-question workflow over the latest exact persisted reconciliation/Twin/source lineage. The request accepts only six fixed questions. Every valid response returns the digest-verified deterministic `AI_OFF` answer, exact redacted pack disclosure marked `NOT SENT`, and the citation details actually used by rendered statements. The browser validates the entire response before rendering and distinguishes the canonical offline explanation from an optional validated mock advisory.

Production construction uses `createProviderNeutralAdapter()` with its default `DISABLED` mode. No environment flag, credential, live transport, provider body persistence, finding mutation, readiness status or Release Passport capability was added. Controlled mock executions below are tests of the validation seam, not evidence that a model or external provider ran.

## Integration correction

The first aggregate run correctly failed closed because the earlier all-items pack projection reached 27,558 conservative units on the controlled full reconciliation fixture, above the frozen 12,000-unit boundary. The fix did not widen that boundary. `evidence-pack-compiler-policy.v2` now verifies the complete exact Twin-bound input first and then selects fixed-question-relevant compact source, claim, finding and path projections.

The final controlled packs range from 5,170 to 11,683 serialized UTF-8 bytes/upper-bound units. No item is silently truncated, source body is copied or provider budget is widened. The compiler-policy version change makes the selection correction explicit and digest-visible.

The first full unit gate then exposed that the compact claim projection had removed the `value` field used by the JSON-secret-key regression. The projection was corrected to retain the redacted claim value while omitting redundant assessment digests; the redaction regression passes and the largest controlled pack remains 11,683 units, 317 below the unchanged ceiling.

## Executable acceptance record

| Acceptance | Executable result | Status |
|---|---|---|
| Fixed questions | Contract/API accept exactly release, conflicts, impact, missing validation, next actions and post-correction; arbitrary/extra provider/readiness input rejects | `PASS` |
| Persisted orchestration | Service reconstructs the latest exact assessment, bound Twin, sources, claims and supersessions; absent source/assessment fails closed | `PASS` |
| Offline completion | All six questions return `DETERMINISTIC_EXPLANATION`, `AI_OFF`, provider disabled and a complete cited answer | `PASS` |
| Exact disclosure | Question/pack/explanation digests agree; canonical redacted pack JSON, counts, size and redaction summary are returned as `NOT SENT` | `PASS` |
| Citation integrity | Every rendered statement has a citation; every used citation resolves to one exact kind/key/item digest/payload | `PASS` |
| Client integrity | Unknown citations, pack mismatch, private absolute paths and readiness-shaped success fields reject with no partial/prior answer | `PASS` |
| Provider failure | Transport failure retries once, exposes no raw error and retains the offline answer | `PASS` |
| Controlled mock | Exact validated mock advisory renders separately; unknown mock citation rejects without retry | `PASS` |
| Canonical authority | Explanation execution appends no reconciliation revision and exposes no finding/readiness mutation | `PASS` |
| External boundary | Global fetch trap observes zero product calls; no credential is read or recorded | `PASS` |

## Generated `EV-CITATIONS`

```powershell
npm.cmd run evidence:citations
```

The generated [EV-CITATIONS](EV_CITATIONS.json) report records:

- 6/6 fixed questions passed;
- 56 rendered statements and 78 resolved statement-citation uses;
- exact redacted pack JSON returned locally with `transferStatus: NOT_SENT`;
- largest controlled pack: 11,683 conservative units;
- valid controlled mock accepted;
- unknown citation rejected without retry;
- repeated transport failure retried once then fell back;
- reconciliation revision count remained 2 before and after explanation runs; and
- no external call, credential, private root, provider body or canonical mutation entered the report.

The same generator refreshes [EV-RECONCILE](EV_RECONCILE.json). Its 6/6 authored truth cases and 25/25 deterministic replays remain passing. The two reports jointly close `G3_DETERMINISTIC_CORE_PROVEN`; neither establishes readiness or authorizes a live provider call.

## Focused verification

```text
Contract/web component focus
  PASS - 3 files, 20 tests

Cited-question API focus
  PASS - 1 file, 6 tests

Pack/offline/adapter/client regression focus
  PASS - 5 files, 41 tests
```

These suites cover strict public constants, all six route responses, deterministic replay, exact disclosure, safe mock acceptance, provider failure, unknown citations, missing persisted input, strict client parsing and the cited-explanation route shell.

## Browser workflow

The existing isolated Chromium conflict-to-correction workflow continues into the cited-explanation screen. It opens the screen with the keyboard, requests a real production-wired `AI_OFF` answer, follows citation links, inspects `NOT SENT` disclosure and proves no private-root or `READY` text appears. Interception then supplies a valid provider-unavailable response and confirms the offline answer remains. A final unknown-citation injection is rejected, and prior cited content is not rendered.

## Complete repository verification

The host command window timed out while the long aggregate wrapper was buffering output, so the same required gates were rerun and captured independently without weakening any assertion or limit:

- workspace typecheck: `PASS` across API, web, contracts, demo fixtures and domain;
- unit/component: `PASS`, 37 files and 304 tests;
- API: `PASS`, 29 files and 149 tests;
- production build: `PASS`, including 83 transformed web modules;
- generated proof: `EV-REPO-SAFETY`, `EV-PRIVACY`, `EV-TWIN`, `EV-CODEMAP`, `EV-RECONCILE` and `EV-CITATIONS` all `PASS`;
- documentation: `PASS`, 71 Markdown files and zero broken local targets; and
- isolated Chromium: `PASS`, 8/8 workflows.

The first browser attempt passed 7/8. Its failure screenshot showed the provider-unavailable notice, complete offline answer and citation all rendered correctly; the test had used an exact-text locator against a paragraph containing a child citation link. The assertion was corrected to verify the primary-answer container, with no timeout or product behavior changed, and the complete clean rerun passed 8/8.

## Residual boundaries and next authority

- Pattern redaction is not complete DLP; use controlled synthetic data.
- A citation proves exact pack reference integrity, not truth, completeness or semantic quality.
- The exact pack disclosure is local and explicitly not sent; it is not consent for future transfer.
- Explanation/provider results are stateless and are not stored in SQLite.
- Persisted validation-result intake, readiness and Release Passports remain absent.
- The next authorized story is `IL-6.5`, the mandatory personal OpenAI checkpoint decision. A live call remains conditional on explicit user enablement and runtime-only credential handling; no such call occurred in this story.
