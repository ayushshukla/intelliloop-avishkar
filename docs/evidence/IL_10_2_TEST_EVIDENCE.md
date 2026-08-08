# IL-10.2 Imported Advisory-output Disagreement

**Story:** `IL-10.2`  
**Status:** `PASS_OPTIONAL_FEATURE_FLAGGED`  
**Evidence date:** 2026-08-07  
**Machine evidence:** [EV-ADVISORY-DISAGREEMENT](EV_ADVISORY_DISAGREEMENT.json)

## Delivered outcome

The default-off `experiments.agentDisagreement` lab accepts two to four operator-supplied `imported-advisory-output.v1` JSON objects in browser memory. Every object must carry bounded agent/provider/model/output attribution, match the current Mission, question digest and evidence-pack digest, remain `ADVISORY_ONLY`, and cite only the current explanation's allowlist.

The deterministic comparator reports normalized exact-text alignment, citation-set variance and text present in only a subset of outputs. It explicitly does **not** infer semantic agreement, contradiction, correctness or truth. The lab has no API client, persistence route, provider transport, credential, agent orchestration, finding mutation, readiness authority or Release Passport authority.

## Acceptance evidence

| Requirement | Observed proof | Result |
|---|---|---|
| Flag-off isolation | API and web flags default `false`, accept only exact booleans, and the lab is conditionally mounted only when the web flag is true | `PASS` |
| Outputs remain advisory | Strict schema requires `ADVISORY_ONLY`; authority-shaped text, cross-scope bindings and unknown citations reject before rendering | `PASS` |
| No live orchestration | The lab is browser-local and contains no fetch/request/provider surface; controlled Chromium comparison produced zero comparison requests | `PASS` |
| Readiness unchanged | Direct controlled comparison observed `READY` before and after; comparator authority fixes canonical/readiness/Passport changes to false | `PASS` |

## Verification

- Four focused web tests pass exact comparison, no-input-mutation, scope/citation/authority rejection, strict opt-in and non-authority presentation.
- Sixteen API configuration tests pass, including exact opt-in and malformed-value rejection.
- Direct in-app Chromium loaded two clearly labelled controlled imports and reported one citation variance plus two output-only text groups. It made zero requests during comparison and retained `READY`.
- `npm.cmd run check:advisory-disagreement` verifies source-bound machine evidence.
- `npm.cmd run dev:disagreement` launches an isolated schema-14 workspace with aligned API/web opt-in. Normal `dev` and `dev:demo` omit the lab.

## Honest limits

Imported attribution is operator supplied; IntelliLoop does not verify a provider or agent identity. Exact-text comparison cannot decide whether differently worded recommendations mean the same thing or whether identical text is good advice. The controlled example is synthetic demonstration data, not provider evidence or production validation.

`INTELLILOOP_IL_10_2_ADVISORY_DISAGREEMENT_PASS_OPTIONAL_FLAGGED`
