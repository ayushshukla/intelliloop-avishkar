# IL-10.3 Guarded Remediation Preview

**Story:** `IL-10.3`  
**Status:** `PASS_OPTIONAL_FEATURE_FLAGGED`  
**Evidence date:** 2026-08-07  
**Machine evidence:** [EV-REMEDIATION-PREVIEW](EV_REMEDIATION_PREVIEW.json)

## Delivered outcome

The default-off `experiments.remediationPreview` lab turns an already validated cited explanation into either a bounded controlled-test plan or a cited change-intent review. Every proposal remains in browser memory and carries `ADVISORY_ONLY`, `NOT_EVIDENCE` and `NOT_EXECUTED` labels.

The lab deliberately does not fabricate source code or a unified diff because the cited explanation does not expose repository source bodies. Patch-intent mode describes the smallest human-review intent; test-plan mode derives disposable-fixture steps from the existing cited synthetic edge cases. Neither mode can apply, validate, persist, execute or approve anything.

## Acceptance evidence

| Requirement | Observed proof | Result |
|---|---|---|
| Flag-off isolation | API/web flags default `false`, accept only exact booleans, and normal startup rendered the cited answer with zero remediation-lab elements | `PASS` |
| Repository unchanged | Controlled repository HEAD, clean status and all ten non-Git file SHA-256 values were exactly equal before/after browser generation | `PASS` |
| Proposal citations validate | Four focused tests cover allowlisted citations, scope, fixed labels, prohibited execution text, acquired-authority rejection and no input mutation | `PASS` |
| No execution or network action | Component contains no client/request surface; five previews reported zero writes/commands/network/canonical changes and produced no API log entry | `PASS` |

## Direct browser observation

The isolated launcher created the controlled LoopMart candidate through real product services and reached `READY`. The **What is impacted?** explanation resolved six citations and five synthetic impact-path edge cases. Generating the test-plan preview produced five proposals, each linked to its exact citation and labelled not executed/evidence. Repository equality held and the readiness screen remained `READY` at revision 2.

## Verification

- Four remediation-preview web tests pass.
- Sixteen API configuration tests pass after all three optional experiment flags became strict opt-ins.
- `npm.cmd run check:remediation-preview` verifies the source-bound machine record.
- `npm.cmd run dev:remediation` uses an isolated schema-14 directory and aligned API/web opt-in. Normal `dev` and `dev:demo` omit the lab.

## Honest limits

No disposable test was run, so the preview is not validation evidence and does not establish patch correctness. No provider generated the content. A human must use a separately authorized implementation/review workflow for any later change; autonomous repair remains post-competition.

`INTELLILOOP_IL_10_3_REMEDIATION_PREVIEW_PASS_OPTIONAL_FLAGGED`
