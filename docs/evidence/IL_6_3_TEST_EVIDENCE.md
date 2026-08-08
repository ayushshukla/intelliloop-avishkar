# IL-6.3 provider-neutral adapter and mocked-validation evidence

**Story:** `IL-6.3`  
**Status:** `PASS`  
**Capabilities:** `DC-06`, `SUP-04` bounded usage controls  
**Evidence date:** 2026-08-06  
**Execution boundary:** Pure `@intelliloop/domain`; controlled mock transport only; external calls off

## Outcome

IntelliLoop now has one provider-neutral request and response-validation contract without a live provider integration. A request binds one canonical UUID to the exact verified redacted pack, Project/Mission/question identities, citation allowlist, structured-output schema, policy and resource limits. A mock response is accepted only when every identity, section, citation and usage field passes strict validation.

The adapter defaults to `DISABLED`; the only executable transport kind is `MOCK_VALIDATION`. Every execution retains the verified `IL-6.2` deterministic explanation. Any disabled, concurrency, budget, timeout, transport, schema, identity, citation, authority or usage failure returns that complete offline result with a stable non-retryable reason.

This story adds no migration, persistence, API route, browser screen, credential, environment lookup, network client, live provider call or readiness field. `IL-6.4` owns product orchestration, disclosure UI and `EV-CITATIONS`.

## Frozen contract

| Contract | Implemented behavior |
|---|---|
| Modes | `DISABLED` default; injected `MOCK_VALIDATION` only |
| Request | Exact UUID, scope/question, full redacted pack, pack digest, allowlist, output schema/digest, policy/digest and limits |
| Response sections | Answer, facts, inferences, conflicts, gaps, next actions, citations, safe mock-provider metadata and usage |
| Identity | Response request UUID/digest, pack digest and schema version must exactly match |
| Citations | Every statement has 1-64 unique allowlisted citations; top citations equal the exact pack-ordered used union |
| Authority | Unknown and readiness/approval/waiver/Passport/finding-mutation-shaped keys reject |
| Response privacy | Text requiring known-secret redaction or containing a private absolute path rejects without rendering |
| Metadata | Provider/model/response IDs use a narrow 64-character non-path grammar and must match the injected mock identity |
| Usage | Nonnegative integer input/output/total values, coherent total and configured ceilings |
| Limits | 16,384 response bytes, 256 statements, 4,096 bytes/statement, one concurrent request, 20 s, one retry, 12,000 input units, 1,200 output tokens, 50,000 session units |
| Retry | Timeout and transport failure only; validation failures never retry |
| Fallback | Complete digest-verified `DETERMINISTIC_EXPLANATION` / `AI_OFF` answer remains available in every result |

## Acceptance evidence

| Acceptance | Executable evidence | Result |
|---|---|---|
| Mock success | Strict response validates, receives a canonical digest and retains offline fallback | `PASS` |
| Mock failure | Repeated transport failure stops after the single permitted retry and exposes no raw error | `PASS` |
| Request identity | Wrong UUID or request digest rejects without retry | `PASS` |
| Pack/schema identity | Wrong pack digest or output schema rejects without retry | `PASS` |
| Unknown citations | Unknown statement citation and incoherent citation union reject | `PASS` |
| Strict shape/authority | Unknown ordinary field and `readinessStatus` field reject under distinct stable reasons | `PASS` |
| Timeout/retry | Two timed-out attempts each receive abort; one transient failure retries once and succeeds | `PASS` |
| Concurrency | A second in-flight request returns offline without a second transport call | `PASS` |
| Token/session budgets | Input overflow and exhausted cumulative session budget reject before transport | `PASS` |
| Safe metadata/usage | Unsafe provider identity, incoherent totals and output overflow reject | `PASS` |
| Response privacy | Known token pattern and private absolute path reject without retry or rendering | `PASS` |
| Mock-only source | Static test rejects fetch, HTTP(S), process environment, credential and authorization references | `PASS` |

## Focused verification

```text
npm.cmd run typecheck -w @intelliloop/domain
  PASS

npx.cmd vitest run --config vitest.unit.config.ts packages/domain/test/provider-adapter.test.ts packages/domain/test/boundaries.test.ts
  PASS - 2 files, 21 tests (19 adapter + 2 domain-boundary)
```

## Repository verification

```text
npm.cmd run check
  PASS - 35 unit/component files, 297 tests
       - 28 API files, 143 tests
       - all five workspaces typechecked
       - production API and web builds passed; 80 web modules transformed
       - EV-REPO-SAFETY, EV-PRIVACY, EV-TWIN, EV-CODEMAP and EV-RECONCILE passed
       - 70 Markdown files checked; 0 broken local targets

npm.cmd run test:e2e
  PASS - 8 Chromium workflows
```

The browser regression run covers the already implemented Phase-1 through Phase-5 product workflows. `IL-6.3` itself is deliberately domain-only, so this result proves that its exported contract did not regress the application; it is not evidence of a cited-question screen or provider call.

The mock provider identifiers, response bodies and token counts are controlled synthetic fixtures. Their presence is not a claim that OpenAI, another provider or any external model was called.

## Manual-QA preparation

The contract is now ready for `IL-6.4` to add the user-visible cited-question workflow without inventing its safety rules inside the UI. The next story can consume one exact request, show the outbound disclosure, render the offline answer unconditionally and expose a validated advisory result only when this boundary accepts it. Provider-disabled, timeout, wrong-digest, wrong-schema and unknown-citation paths already converge on the same safe fallback.

The current localhost application intentionally shows no cited-question screen yet. Manual reviewers should continue using the Phase-5 workflow and should not provide a key or enable external calls.

`G3_DETERMINISTIC_CORE_PROVEN` remains pending until `IL-6.4` proves the full cited-question API/UI and end-to-end citation path. The next authorized story is `IL-6.4`.
