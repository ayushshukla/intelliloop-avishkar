# IL-6.2 deterministic offline-explanation evidence

**Story:** `IL-6.2`  
**Status:** `PASS`  
**Capability:** `DC-06` deterministic offline path  
**Evidence date:** 2026-08-06  
**Execution boundary:** Pure `@intelliloop/domain`; controlled synthetic fixtures; external calls off

## Outcome

One exact integrity-checked `evidence-pack.v1` can now produce a deterministic, citation-grounded explanation without AI. The output separates its answer, facts, inferences, conflicts, gaps and next actions; labels itself exactly `DETERMINISTIC_EXPLANATION` and `AI_OFF`; and provides no release-readiness authority.

The story is domain-only. It adds no schema migration, persistence, HTTP route, browser surface, provider adapter, credential access or network operation. Product explanation delivery remains owned by `IL-6.4`, after the `IL-6.3` provider-neutral validation boundary.

## Frozen contract

| Contract | Implemented behavior |
|---|---|
| Input authority | One complete verified `EvidencePack`; input pack integrity is rerun before rendering |
| Questions | Release, conflicts, impact, missing validation, next actions and post-correction change only |
| Sections | One answer plus separate facts, inferences, conflicts, gaps and next actions |
| Grounding | Every statement carries at least one allowlisted pack citation; used citation entries retain pack order |
| Correction | Superseded claim text is explicitly historical; the successor and explicit correction remain cited |
| Engine | `DETERMINISTIC_EXPLANATION`, `AI_OFF`, provider `NONE`, `externalCallMade: false` |
| Identity | Versioned renderer-policy digest, statement digests and complete explanation digest |
| Limits | 256 statements, 4,096 UTF-8 bytes per statement, 64 citations per statement, 131,072 serialized UTF-8 bytes |
| Failure | Unsupported questions, invalid packs, overflow and explanation/citation tampering reject without partial output |
| Authority | No readiness field, provider payload, finding mutation, winner selection, waiver or release decision |

## Fixed question surface

| Question | Canonical answer basis |
|---|---|
| `Can we release?` | Open conflict/ambiguity and gap counts, with an explicit no-readiness-decision statement |
| `What conflicts are open?` | Canonical open conflict/ambiguity statements |
| `What is impacted?` | Canonical cited impact paths and open impact gaps |
| `What validation is missing?` | Canonical missing-validation and validation-path gap reasons |
| `What should happen next?` | Deterministic actions derived only from open findings |
| `What changed after correction?` | Explicit claim supersessions and stale predecessor findings |

Case, surrounding whitespace and repeated internal whitespace normalize only to match this fixed set. Arbitrary free-form questions fail with `OFFLINE_EXPLANATION_QUESTION_UNSUPPORTED`.

## Acceptance evidence

| Acceptance | Executable evidence | Result |
|---|---|---|
| Golden structure | Exact release answer, fact, inference, conflict, next action and limitation strings | `PASS` |
| Fixed follow-ups | All six question kinds execute against clear, conflict, impact, validation-gap and correction fixtures | `PASS` |
| Citations resolve | Every statement citation is allowlisted, present in used citations and resolves to its exact pack item | `PASS` |
| No invented evidence | Output is rebuilt only from pack item payloads; complete rerender equality rejects changed text or identity | `PASS` |
| Explicit correction | Real successor/supersession fixture labels predecessor historical and reports one correction | `PASS` |
| AI-off label | Exact engine tuple and absence of readiness status are asserted | `PASS` |
| Determinism | Repeated render returns equal JSON and explanation digest | `PASS` |
| Failure behavior | Unsupported question, altered answer and forged citation fail closed with stable errors | `PASS` |

## Focused verification

```text
npm.cmd run typecheck
  PASS - all five workspaces

npx.cmd vitest run --config vitest.unit.config.ts packages/domain/test/offline-explanation.test.ts
  PASS - 1 file, 11 tests
```

The golden fixture uses one active `FACT`, one active `INFERENCE` and one canonical conflict. The correction fixture creates a real predecessor, successor and explicit `SUPERSEDES` link through production domain constructors; it is not a hand-authored explanation object.

## Repository verification

| Gate | Observed result |
|---|---|
| Strict workspace typecheck | `PASS` across API, web, contracts, demo fixtures and domain |
| Unit/component suite | `PASS` - 34 files, 277 tests |
| API/integration suite | `PASS` - 28 files, 143 tests |
| Production build | `PASS` - all workspaces; web build transformed 79 modules |
| Generated proof | `EV-REPO-SAFETY`, `EV-PRIVACY`, `EV-TWIN`, `EV-CODEMAP` and `EV-RECONCILE` all `PASS` |
| Documentation links | `PASS` - 69 Markdown files, 0 broken local targets |
| Isolated Chromium | `PASS` - 8/8 workflows, including correction and stale-history review |

The complete non-browser command was `npm.cmd run check`; the final browser command was `npm.cmd run test:e2e`. No timeout, retry, schema, production route or browser assertion was widened for this story.

## Safety and scope conclusion

The renderer is useful as a transparent fallback because it presents exact canonical structures in readable sections with resolvable citations. It remains advisory. An empty conflict/gap set does not become `READY`; a conflict does not become `BLOCKED`; and an epistemic `FACT` label does not become proof of truth or approval.

`G3_DETERMINISTIC_CORE_PROVEN` is not claimed yet. The frozen R3 sequence still requires the provider-neutral mocked validation boundary and cited-question product path through `IL-6.4`. The next authorized story is `IL-6.3`.
