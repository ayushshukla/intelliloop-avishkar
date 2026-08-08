# IL-6.1 redacted evidence-pack and citation-registry evidence

**Story:** `IL-6.1`  
**Capability:** first bounded seam of `DC-06`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06

## Outcome

`@intelliloop/domain` now compiles one Mission question and one exact verified Twin/reconciliation binding into a deterministic, minimized, second-pass-redacted evidence pack. Every selected assessment, source-attribution, claim-excerpt, supersession, finding and impact-path item receives a stable allowlisted citation locator and digest.

The story is domain-only. It adds no API, persistence, UI, provider adapter, credential access, network operation, explanation text or readiness authority.

## Executable acceptance record

| Acceptance | Observed result | Status |
|---|---|---|
| Same input | Exact inputs and reversed source/claim collection order produced byte-equal packs and one pack digest | `PASS` |
| Ordering | Items sort by fixed kind order then logical key; citations and allowlist remain index-coherent | `PASS` |
| Exact binding | Mismatched scope/Twin identity and incomplete Twin source inputs fail closed | `PASS` |
| Minimization | Source attribution is retained while full evidence `normalizedContent`, repository roots and source code are omitted | `PASS` |
| Transfer redaction | Question, JSON keys and JSON values receive a second secret pass; Windows/UNC/private POSIX paths receive `PRIVATE_PATH` redaction | `PASS` |
| Bounds | Question, pre-item, redacted-item, item-count, serialized-byte and conservative 12,000-unit transfer ceilings reject rather than truncate | `PASS` |
| Stable citations | A question change changes question/pack digests but preserves unchanged locator-derived citation IDs | `PASS` |
| Locator validity | Every allowlisted citation resolves to exactly one matching item digest; malformed/unknown citations reject | `PASS` |
| Integrity | Canonical question/item/pack digests and registry relationships are recomputed; tampered bytes reject | `PASS` |
| Authority | The pack contains no explanation, provider response, finding mutation, readiness or Passport field | `PASS` |

## Focused verification

```powershell
npx.cmd vitest run packages/domain/test/evidence-pack.test.ts --config vitest.unit.config.ts
```

Observed: 1 test file and 5 tests passed.

## Complete repository verification

```powershell
npm.cmd run check
npm.cmd run test:e2e
```

The final aggregate gate passed with 266 unit/component tests, 143 API tests, strict typechecking, API/domain/contracts/demo-fixture builds, a 78-module Vite production build, regenerated passing `EV-REPO-SAFETY`, `EV-PRIVACY`, `EV-TWIN`, `EV-CODEMAP` and `EV-RECONCILE` reports, and 68 Markdown files with zero broken local targets. `EV-RECONCILE` retained 6/6 authored truth cases and 25/25 deterministic replays.

The first Chromium attempt passed 7/8; the final long reconciliation workflow reached a successful `201` response at the 30-second whole-test ceiling before its success message rendered. A clean isolated rerun passed all 8 workflows in 30.0 seconds, with the long workflow completing in 6.2 seconds. No product or test timeout was widened. The host-safe launcher used distinct temporary loopback ports and did not take over the operator's existing port 4173 process.

## Contract versions

- `evidence-pack.v1`
- `evidence-pack-digest.v1`
- `evidence-pack-item.v1`
- `evidence-pack-citation-registry.v1`
- `evidence-pack-citation-locator.v1`
- `evidence-pack-compiler-policy.v1`
- `evidence-pack-question-digest.v1`

## Residual boundaries

> **Later integration correction:** `IL-6.4` versions the selection contract as `evidence-pack-compiler-policy.v2`. Complete exact inputs are still verified, but fixed questions select only their relevant compact projections. This preserves the 12,000-unit ceiling on the aggregate reconciliation fixture; it does not alter this historical `IL-6.1` observation or widen the provider budget. See [IL-6.4 evidence](IL_6_4_TEST_EVIDENCE.md).

- The compiler performs deterministic structural selection; it does not use semantic search or claim that selected evidence is sufficient.
- The 12,000-unit gate uses serialized UTF-8 bytes as a conservative provider-neutral upper bound, not a provider tokenizer estimate.
- The redaction corpus is not complete DLP and does not authorize sensitive production data.
- No product pack endpoint or persisted pack exists.
- Deterministic offline cited explanation is next in `IL-6.2`; the provider adapter and API/UI remain later stories.
- `G3_DETERMINISTIC_CORE_PROVEN` remains pending through the required cited-explanation and citation/mock path ending at `IL-6.4`.

See [AI safety and data transfer](../security/AI_SAFETY_AND_DATA_TRANSFER.md) for the outbound-control and authority model.
