# IL-6.5 personal OpenAI evaluation checkpoint evidence

**Story:** `IL-6.5`  
**Status:** `PASS_OFFLINE_DECISION`  
**Gate:** `G4_OPENAI_COURSE_CORRECTION`  
**Decision:** `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`  
**Evidence date:** 2026-08-06

## Outcome

The mandatory personal OpenAI checkpoint is complete through its frozen offline branch. The prerequisites passed, all six exact redacted pack previews remained locally inspectable and within the unchanged 12,000-unit bound, and production provider execution remained disabled. No explicit transfer authorization or runtime-only credential was supplied for this execution, so no personal OpenAI evaluation ran.

The decision is not recorded as a vague pending item. `openai-evaluation-checkpoint.v1` creates one canonical, digest-bound record using exactly the permitted decision `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`. It records provider grounding, citation validity, usefulness, latency, input tokens, output tokens and difference from the deterministic explanation as `NOT_MEASURED`; it does not substitute mock or deterministic values for a live-provider measurement.

## Entry checklist

| Entry control | Evidence | Result |
|---|---|---|
| Deterministic core | `EV-RECONCILE` and `EV-CITATIONS` close `G3_DETERMINISTIC_CORE_PROVEN` | `PASS` |
| Reconciliation proof | 6/6 controlled truth cases and 25/25 deterministic replays | `PASS` |
| Fixed evaluation set | The six exact approved questions pass through the cited-question API | `PASS` |
| Preview | Exact canonical redacted pack JSON is locally available for every question | `PASS` |
| Transfer state | Every preview remains `NOT_SENT` | `PASS` |
| Frozen input ceiling | Maximum controlled pack is 11,683 units against 12,000 | `PASS` |
| Citation boundary | Every deterministic statement citation resolves; unknown citations reject | `PASS` |
| Privacy proof | `EV-PRIVACY` OpenAI sentinel, logs and SQLite/sidecar checks pass | `PASS` |
| Production provider | Runtime outcome remains `DISABLED`; there is no live transport | `PASS` |
| Credential policy | A credential is required only for an explicitly enabled live branch | `PASS` |

## Executable checkpoint contract

The domain contract exposes exactly three allowed course-correction decisions:

- `USE_LIVE_PROVIDER_IN_FINALE`
- `CORRECT_PROMPT_OR_EVIDENCE_PACK_AND_RETEST`
- `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`

The offline constructor accepts no credential or provider body. It fails closed when G3/privacy/citation evidence is not passing, the question set is reordered or incomplete, transfer is not `NOT_SENT`, the pack exceeds 12,000 units, or production provider state is not `DISABLED`. The invariant recomputes the canonical checkpoint digest and rejects a changed decision or authority field.

## Generated EV-OPENAI-EVAL

```powershell
npm.cmd run evidence:openai-eval
```

Generated [EV-OPENAI-EVAL](EV_OPENAI_EVAL.json) records:

- one `PASS_OFFLINE_DECISION` gate result;
- 6/6 exact redacted previews with per-question serialized sizes;
- the deterministic 56-statement / 78-citation-use baseline, explicitly not provider metrics;
- every provider quality, latency and usage metric as `NOT_MEASURED`;
- no credential request, read, persistence or logging;
- a repository text scan that permits only the two known synthetic OpenAI-token fixtures;
- no provider prompt/response body or exact pack body in the report;
- zero external calls and zero canonical-state change; and
- `IL-6.6` as the next authorized story.

The repository pattern scan is a bounded guard, not complete secret detection. The stronger claim for this checkpoint is architectural: the selected branch has no credential input, environment lookup, network client or provider transport. `EV-PRIVACY` separately exercises the synthetic sentinel across logs and persistence.

## Focused verification

```text
Domain typecheck
  PASS

Checkpoint and static-boundary focus
  PASS - 2 files, 13 tests
```

The focused vectors cover canonical equality, the exact enum, missing prerequisites, wrong question order, incomplete fixed set, sent transfer, oversized input, enabled-provider rejection, digest tampering and absence of credential/network APIs from the checkpoint and generator.

## Complete repository verification

```text
Workspace typecheck
  PASS

Unit/component suites
  PASS - 38 files, 315 tests

API suites
  PASS - 29 files, 149 tests

Production build
  PASS - 84 Vite modules

Generated evidence
  PASS - EV-REPO-SAFETY, EV-PRIVACY, EV-TWIN, EV-CODEMAP,
         EV-RECONCILE, EV-CITATIONS and EV-OPENAI-EVAL

Documentation links
  PASS - 72 Markdown files, zero broken local targets

Isolated Chromium workflows
  PASS - 8/8
```

The browser suite ran on fresh loopback ports and shut down its isolated API and web children after completion. No product/test limit was widened, no live-provider substitute was introduced and no pre-existing workflow regressed.

## Authority and residual boundaries

- No live evaluation occurred; provider quality and cost are unknown.
- No ChatGPT subscription, browser session or personal account is treated as an API credential.
- No credential was requested, inspected, stored, logged or written to evidence.
- The checkpoint decision does not add a live provider transport to production.
- AI remains advisory and cannot mutate evidence, findings, readiness or a Release Passport.
- A later change from the frozen offline decision requires a new explicitly authorized checkpoint, not a configuration shortcut.
- `IL-6.6` is next and owns the consolidated AI safety, transfer and course-correction documentation.
