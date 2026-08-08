# IntelliLoop Release Checklist

**Document ID:** `DOC-25`  
**Current checkpoint:** `IL-9.4` product proof pending human input; all optional Phase-10 stories pass  
**Status:** `ACTIVE_PRE_RELEASE_CHECKLIST`  
**Evidence date:** 2026-08-07

This checklist records release-critical evidence without implying that the prototype is approved, signed, deployed or production-ready. Items owned by later stories remain visibly pending.

## Demonstrable-core gate

| Requirement | Evidence | Status |
|---|---|---|
| Persisted `BLOCKED → READY → STALE` | [EV-GOLDEN-FLOW](EV_GOLDEN_FLOW.json) | `PASS` |
| Keyboard/semantic/responsive competition route | [EV-ACCESSIBILITY](EV_ACCESSIBILITY.json) | `PASS` |
| Registered repository before/after equality | [EV-REPO-SAFETY](EV_REPO_SAFETY.json) | `PASS` |
| Privacy and secret negative corpus | [EV-PRIVACY](EV_PRIVACY.json) | `PASS` |
| Restart at `READY` and browser recovery | [EV-DEMO-GATE](EV_DEMO_GATE.json) | `PASS` |
| Reset followed by restart returns `EMPTY` | [EV-DEMO-GATE](EV_DEMO_GATE.json) | `PASS` |
| Loopback-only browser path and AI off | [EV-DEMO-GATE](EV_DEMO_GATE.json) | `PASS` |
| Five-to-seven-minute paced rehearsal | [EV-DEMO-GATE](EV_DEMO_GATE.json) | `PASS` |
| Tested script-free fallback sequence | [EV-DEMO-SUPPORT](EV_DEMO_SUPPORT.json) | `PASS` |
| Seven release-candidate assets with metadata/hashes | [Demo asset manifest](../demo/DEMO_ASSET_MANIFEST.json) | `PASS` |
| Judge Q&A and synchronized pitch/demo script | [Judge Q&A](../demo/JUDGE_QA.md); [pitch/demo script](../submission/PITCH_AND_DEMO_SCRIPT.md) | `PASS` |

## Required before code freeze

| Item | Owning story | Status |
|---|---|---|
| Judge Q&A, fallback asset and final support package | `IL-8.6` | `PASS` |
| Clean install and supported-platform matrix | `IL-9.1` | `PASS_WINDOWS_LINUX_CI_CONFIGURED` ([evidence](IL_9_1_TEST_EVIDENCE.md)) |
| Final dependency, license, secret and provenance audit | `IL-9.2` | `PASS` ([evidence](IL_9_2_TEST_EVIDENCE.md)) |
| Final documentation consistency audit | `IL-9.3` | `PASS` ([evidence](IL_9_3_TEST_EVIDENCE.md)) |
| Controlled claim-evidence and benefit dossier | `IL-9.4` | `PRODUCT_PROOF_AND_MANUAL_QA_PASS / STRICT_PILOT_VALIDATOR_PASS / HUMAN_PILOT_INPUT_REQUIRED` ([evidence](IL_9_4_TEST_EVIDENCE.md)) |
| Optional read-only Evidence Replay Lab | `IL-10.1` | `PASS_OPTIONAL_FEATURE_FLAGGED` ([evidence](IL_10_1_TEST_EVIDENCE.md)) |
| Optional advisory-output disagreement | `IL-10.2` | `PASS_OPTIONAL_FEATURE_FLAGGED` ([evidence](IL_10_2_TEST_EVIDENCE.md)) |
| Optional Guarded Remediation Preview | `IL-10.3` | `PASS_OPTIONAL_FEATURE_FLAGGED` ([evidence](IL_10_3_TEST_EVIDENCE.md)) |
| Official Avishkar rules matrix | `IL-9.5` | `PENDING_RULEBOOK` |
| Submission/pitch/demo artifact manifest and hashes | `IL-9.6` | `PARTIAL_TEMPLATE_READY / PENDING_RULES_AND_APPROVAL` ([manifest](../submission/SUBMISSION_MANIFEST.md)) |
| Freeze, tag and final handoff record | `IL-9.7` | `PARTIAL / UNBORN_REPOSITORY_NOT_FROZEN` |

## Non-authority confirmation

- The fixture and review/validation records are synthetic.
- External AI remains disabled and no provider credential is required.
- Registered repositories remain read-only and are never executed.
- Candidate `READY` applies only to exact persisted inputs.
- The Release Passport remains unsigned, non-approving and non-deploying.
- A passing `G5_CORE_DEMONSTRABLE` gate is not production certification or final competition compliance.
- The current release proof directly observes Windows only; Linux remains configured pending a runner artifact.
- The prior development-tool advisories were remediated and both current npm audit scopes report zero; advisory data remains time-sensitive and must be refreshed at final freeze.
