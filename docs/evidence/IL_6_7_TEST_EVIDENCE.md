# IL-6.7 advisory synthetic edge-case suggestion evidence

**Story:** `IL-6.7`  
**Status:** `PASS`  
**Capability:** `SUP-03`; AI-mastery trace `AM-08`  
**Evidence date:** 2026-08-06  
**Provider posture:** `OFFLINE` / provider `NONE`

## Delivered outcome

The cited-explanation workflow now produces deterministic synthetic retail edge-case suggestions from the already verified, minimized and redacted evidence pack. Each suggestion binds to the exact Project, Mission, question and pack digests and carries all three non-authority labels: `SYNTHETIC`, `ADVISORY_ONLY` and `NOT_EVIDENCE`.

The workflow is useful as a test-design aid without pretending that a generated scenario was observed, imported or validated. It cannot append or resolve findings, create evidence, change readiness, issue a Release Passport, write the registered repository or call a provider.

## Acceptance matrix

| Requirement | Evidence | Result |
|---|---|---|
| Structured output validates | Versioned suggestion/set/policy contracts, canonical digests, strict API JSON schema and fail-closed browser decoder | `PASS` |
| Citations validate | Every suggestion has one or more allowlisted pack citations; registry equality and pack resolution are checked | `PASS` |
| Synthetic/advisory labels are explicit | Domain constants, strict API/client checks and browser cards require `SYNTHETIC`, `ADVISORY_ONLY`, `NOT_EVIDENCE` | `PASS` |
| Provider-off behavior is safe | Production generation is `DETERMINISTIC_RULES`, provider `NONE`, `externalCallMade: false`; frozen finale decision is unchanged | `PASS` |
| Findings and readiness remain unchanged | Service is stateless; authority flags deny canonical, finding, readiness and Passport mutation; generated proof compares reconciliation revision counts | `PASS` |
| Empty/failure behavior is honest | A pack with no relevant finding/path yields an empty labeled set; malformed labels, identity, digest, reasons or citations fail closed | `PASS` |

## Executable proof

Focused verification passed:

- 14/14 domain/boundary assertions, including deterministic stability, empty output, tamper rejection, scenario coverage and static provider/network/environment exclusion;
- 5/5 strict browser-client decoder assertions;
- 10/10 cited API and production-wiring assertions, including all six fixed questions and production provider disablement;
- all workspace typechecks;
- generated [EV-CITATIONS](EV_CITATIONS.json), which records 6/6 fixed question sets, 23 synthetic suggestions, 23 resolved suggestion citation uses, provider `NONE` and zero authority.

Reproduce the focused and generated proofs from the repository root:

```powershell
npm.cmd run typecheck
npm.cmd run test:unit -- --run packages/domain/test/synthetic-edge-case-suggestions.test.ts packages/domain/test/boundaries.test.ts apps/web/test/cited-explanation-client.test.tsx
npm.cmd run test:api -- --run apps/api/test/cited-explanation-api.test.ts apps/api/test/production-wiring.test.ts
npm.cmd run evidence:citations
```

The repository-wide gate passed 327/327 unit/component tests across 39 files, 149/149 API tests across 29 files, all workspace typechecks, an 85-module production build, all generated evidence/AI-safety gates and 74 Markdown files with zero broken local targets. The isolated Chromium run passed 8/8 workflows and verifies the synthetic section and all three visible labels alongside existing provider-failure, unknown-citation, keyboard, private-root and non-readiness checks. The aggregate record is the [consolidated evidence dossier](TEST_EVIDENCE.md).

## Integrity and limitations

- All evidence uses IntelliLoop-authored controlled synthetic fixtures.
- No personal, Nisum, client or candidate repository content is copied into the report.
- No OpenAI/provider credential is requested, read, stored or logged.
- No provider request is sent; the IL-6.5 decision remains `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`.
- A citation explains why a case was suggested. It does not prove the synthetic outcome or the truth/completeness of its source.
- The suggestions are cancellation-domain templates tied to current finding/path categories, not a general test generator and not production-quality evidence.

Phase 6 is complete through `IL-6.7`. The next dependency-eligible story is `IL-7.1`, which alone may begin the fail-closed readiness evaluator; this story pre-claims no readiness behavior.
