# IL-6.6 AI safety, transfer and course-correction documentation evidence

**Story:** `IL-6.6`  
**Status:** `PASS`  
**Capability:** `DC-06`, `SUP-04`  
**Finale posture:** `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`  
**Evidence date:** 2026-08-06

## Outcome

The canonical AI safety and AI-use documents are finalized for the implemented Phase-6 provider boundary. They distinguish AI-assisted development, deterministic product behavior, controlled mock validation and the personal-provider checkpoint; enumerate data that remains local versus data that could leave only after a new authorization; state the closed authority boundary; and record the offline finale posture without inventing provider results.

This story changes documentation and its executable contract only. It adds no HTTP route, database field, provider transport, credential input, model output, external call, finding mutation, readiness state or Release Passport authority. At this historical checkpoint, `IL-6.7` was the next implementation story; it is now completed and documented separately.

## Acceptance evidence

| Acceptance criterion | Implemented evidence | Result |
|---|---|---|
| Authority boundary is explicit | Canonical authority matrix states what each deterministic/advisory surface may display and denies canonical mutation/readiness/Passport authority to AI | `PASS` |
| Data transfer is explicit | Data-disposition inventory records current location/lifetime, current `NOT_SENT` state, eligible future payload and never-transfer data | `PASS` |
| Checkpoint/finale posture is explicit | Reviewer record binds `NOT_RUN_NOT_AUTHORIZED` and `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE` to the canonical IL-6.5 digest | `PASS` |
| Evaluation limitations are honest | All provider quality, latency, usage and difference fields remain `NOT_MEASURED`; deterministic/mock evidence is not relabeled provider performance | `PASS` |
| Credential/private bodies are absent | EV report integrity plus the documentation checker reject credential-like text, private absolute paths and raw normalized/provider-response body markers | `PASS` |
| Professional disclosure is reconciled | AI-use ledger separates development assistance, current product runtime and the provider experiment that did not run | `PASS` |

## Executable documentation contract

```powershell
npm.cmd run check:ai-safety-docs
```

The check parses generated `EV-OPENAI-EVAL` and the implementation backlog, then verifies:

- G4 remains `PASS_OFFLINE_DECISION` and the run remains `NOT_RUN_NOT_AUTHORIZED`;
- current transfer is `NOT_SENT` with `externalCallMade: false`;
- the exact frozen decision and checkpoint digest appear in the canonical safety document;
- provider credential, prompt/response and exact-pack bodies remain absent from the generated report;
- required reviewer, transfer, authority and governance sections exist;
- the AI-use ledger contains the three distinct contexts and truthful no-call disclosure;
- the documentation index and consolidated dossier link this story; and
- at story completion, backlog progress was exactly through `IL-6.6`, with `IL-6.7` next; the checker now preserves that checkpoint while allowing later authorized progress.

The text scan is a bounded regression guard, not universal data-loss prevention. Its stronger supporting evidence is the already verified architecture: production uses the disabled adapter, the offline checkpoint accepts no credential/body, and no live transport exists.

## Source evidence

- [AI safety and data transfer](../security/AI_SAFETY_AND_DATA_TRANSFER.md)
- [AI-use disclosure](../governance/AI_USE_DISCLOSURE.md)
- [IL-6.5 checkpoint evidence](IL_6_5_TEST_EVIDENCE.md)
- [EV-OPENAI-EVAL](EV_OPENAI_EVAL.json)
- [EV-CITATIONS](EV_CITATIONS.json)
- [EV-PRIVACY](EV_PRIVACY.json)

## Verification record

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

AI documentation contract
  PASS

Documentation links
  PASS - 73 Markdown files, zero broken local targets

Isolated Chromium workflows
  PASS - 8/8
```

The complete checked-in `npm.cmd run check` gate passed in 198.4 seconds after the Windows sandbox-only `spawn EPERM` was resolved by allowing the existing Vitest/Vite child processes; no product code, assertion, timeout or test limit changed. `EV-OPENAI-EVAL` rescanned 293 repository text files and retained the same checkpoint digest and offline decision. The isolated browser suite used fresh loopback ports and shut down its temporary servers after all eight workflows passed.

## Residual boundaries

- No live-provider semantic quality, latency, token cost or usefulness evidence exists.
- Redaction and bounded pattern scans do not certify arbitrary real content as safe to transmit.
- Official Avishkar AI-use/disclosure rules remain unverified until `IL-9.5`.
- A future live branch requires a new explicitly authorized, versioned checkpoint; current configuration cannot enable it.
- Advisory synthetic edge-case suggestions belong to `IL-6.7` and are not implemented here.
