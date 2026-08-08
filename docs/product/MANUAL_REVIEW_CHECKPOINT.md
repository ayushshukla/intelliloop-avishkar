# IntelliLoop Manual Review Checkpoint

**Checkpoint:** Phase-8 demonstrable core and support-package review / `IL-8.6`  
**Status:** `READY`  
**Audience:** Product owner, Avishkar reviewer and demo operator  
**Evidence date:** 2026-08-06

## What is ready to review

The localhost application supports one complete bounded workflow:

The competition route is also verified at 1366×768 for keyboard focus continuity, semantic headings, explicit non-color status cues and loading/empty/error/trust states. See the [competition accessibility review](../evidence/ACCESSIBILITY_REVIEW.md).

The combined [IL-8.5 gate](../evidence/IL_8_5_TEST_EVIDENCE.md) additionally proves a 5.8-minute paced path, deliberate API outage/recovery at `READY`, reset/restart to `EMPTY`, source/repository equality, loopback-only browser traffic and secret-sentinel absence.

The [IL-8.6 support gate](../evidence/IL_8_6_TEST_EVIDENCE.md) captures and visually verifies seven 1366×768 release-candidate frames, records exact metadata/hashes and loads the script-free [fallback sequence](../demo/fallback/index.html) from local files with the API stopped. The [judge Q&A](../demo/JUDGE_QA.md) and [pitch/demo script](../submission/PITCH_AND_DEMO_SCRIPT.md) are ready for presenter rehearsal.

1. Create a Project and current Change Mission.
2. Register an absolute path to an existing local Git repository.
3. Capture a read-only Git observation.
4. Preview and import redacted evidence, then review its immutable timeline and claims.
5. Materialize the attributed Twin.
6. Map the registered TypeScript/JavaScript/JSON repository and refresh the Twin.
7. Review static-inference labels, attributed software assets and explainable dependency paths after reload.
8. Explicitly run deterministic reconciliation, inspect all returned finding reasons/citations and cited impact paths, then reopen immutable assessment history.
9. Ask one of six fixed questions, review the deterministic `AI_OFF` answer, follow its citations and inspect the exact redacted pack disclosure marked `NOT SENT`.
10. Review the cited synthetic retail edge cases and verify each is visibly `SYNTHETIC`, `ADVISORY ONLY` and `NOT EVIDENCE`.
11. Create a repository-derived readiness assessment, inspect exact obligations/blockers and historical state, then create and inspect its unsigned Release Passport.
12. Verify the structural JSON download and print view retain the non-approval warnings and contain no source body, credential or private absolute path.

This checkpoint is usable locally through the visible `IL-7.4` workflow and exposes exact readiness/Passport state, not a release verdict. There is still no supported validation/review intake, approval/signing, live provider transport or external AI call. Edge cases are deterministic test ideas derived from cited pack items; they are not observations, findings or evidence. `EV-RECONCILE` and `EV-CITATIONS` jointly close `G3_DETERMINISTIC_CORE_PROVEN`; `EV-OPENAI-EVAL` preserves `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`.

## Start locally

Prerequisites are Node.js 22.22.0, npm 10.9.4 and Git. From the repository root:

```powershell
# Run from the IntelliLoop repository root.
npm.cmd ci
npm.cmd run dev:demo
```

Open `http://127.0.0.1:4173`. The web application proxies local API requests to `http://127.0.0.1:3100`; both bind to IPv4 loopback only. Stop both with `Ctrl+C` in the terminal.

`dev:demo` stores the controlled schema-14 database outside the source tree below the operating system's temporary-data directory. For a caller-selected isolated development database instead, set an absolute directory before launching the normal development command:

```powershell
$env:INTELLILOOP_DATA_DIRECTORY = "C:\temp\intelliloop-demo-data"
npm.cmd run dev
```

Do not place that directory inside the repository you plan to register.

## Recommended manual path

Use an IntelliLoop-controlled synthetic Git repository containing small `.ts`, `.tsx`, `.js`, `.jsx` or `.json` files. Avoid employer, client or credential-bearing repositories. In the application:

1. Select **Open Project workspace**, create a Project, then create its Mission.
2. Enter the repository's absolute root once and select **Register read-only repository**.
3. Select **Capture current Git observation** and confirm the UI says observation-only and `NOT ASSESSED`.
4. Open **Evidence timeline**, import a harmless synthetic evidence note through preview, and inspect the redacted persisted view.
5. Open **Twin**, choose **Materialize Twin**, then **Map repository and refresh Twin**.
6. Confirm the code-map mode says `STATIC INFERENCE`, every item has attribution, and the dependency paths are text-readable without a graph.
7. Reload the page. Confirm the same Twin/code-map revisions and paths return.
8. Open **Findings and impact**, optionally declare a missing support locator, then run the deterministic assessment. Confirm the five finding counters, exact reasons and immutable revision selector are visible.
9. Enable one impact obligation, choose an attributed root and critical software asset, rerun, and inspect each cited step. Confirm there is no dismiss, resolve, approve, block or `READY` control.
10. Activate **Open cited explanation**, select each fixed question as time permits, and confirm the answer says `AI_OFF`, provider `DISABLED` and `ADVISORY ONLY - NO RELEASE DECISION`.
11. Follow a statement citation into the used-citation registry and expand **Exact redacted pack JSON**. Confirm the disclosure says `NOT SENT` and no private absolute repository root appears.
12. In **Synthetic retail edge cases**, confirm every card shows the three warning labels, a cited scenario and expected deterministic observation. Confirm there is no accept, create evidence, resolve finding, approve release or Passport action.
13. Open **Readiness and Passport**, activate **Assess current persisted evidence**, and inspect all nine obligations, blockers, findings, validations, review and digests. A normal manual Mission is expected to remain `BLOCKED` because validation/review intake is not yet exposed.
14. Create the selected assessment's unsigned Passport. Confirm its status matches the assessment, citations are visible, authority says reproduced rather than recomputed, and no approval/sign control exists.
15. Download the structural JSON and use the print view. Confirm both retain `UNSIGNED` / `NOT RELEASE APPROVAL` semantics and reveal no repository source, credential or private root.

If the repository exceeds a scanner limit, the normal action fails honestly. The UI deliberately does not auto-enable declared fixture fallback. That fallback exists only for controlled verification through an explicit API consent body and must not be used to disguise personal-repository scan failure.

## Expected limitations

- No authentication; use only on a trusted local machine.
- No repository source browser or code execution.
- No graph; the accessible list is authoritative.
- Static extraction does not observe runtime behavior and can miss dynamic imports, aliases or computed routes.
- Logical paths, identifiers, literal routes and package specifiers may be sensitive structural metadata.
- No browser authoring for claims, successors or runtime observations.
- Findings, cited impact, cited-question review, advisory synthetic edge cases and readiness/Passport history are visible. Supported validation/review intake, Passport signing, release approval, deployment authority and external AI remain unavailable.
- Production provider execution is `DISABLED`; `MOCK_VALIDATION` exists only in controlled automated evidence, never as a live transport. Manual reviewers should not set an AI key or enable the protected external-call flag.
- Official Avishkar rules remain unverified; this checkpoint does not claim competition compliance.

## Automated evidence

Before relying on this checkpoint, run:

```powershell
npm.cmd run check
npm.cmd run test:e2e
npm.cmd run check:demo-support
npm.cmd audit --omit=dev
```

The supporting reports are [EV-TWIN](../evidence/EV_TWIN.json), [EV-CODEMAP](../evidence/EV_CODEMAP.json), [EV-RECONCILE](../evidence/EV_RECONCILE.json), [EV-CITATIONS](../evidence/EV_CITATIONS.json), [EV-READINESS](../evidence/EV_READINESS.json), [EV-PASSPORT](../evidence/EV_PASSPORT.json), [EV-GOLDEN-FLOW](../evidence/EV_GOLDEN_FLOW.json), [EV-DEMO-GATE](../evidence/EV_DEMO_GATE.json) and [EV-DEMO-SUPPORT](../evidence/EV_DEMO_SUPPORT.json). Use the [competition demo runbook](../demo/DEMO_RUNBOOK.md). The checkpoint remains `READY` for controlled manual review only; that capitalized word is a checkpoint disposition, not a product readiness assessment. Assessment/Passport records have no release authority. Use only controlled synthetic data and keep the documented limitations visible.

The final story smoke test runs the complete conflict-to-correction sequence against the real localhost API and a fresh Windows-controlled Git fixture, then enters the cited-explanation screen. It verifies a real `AI_OFF` answer and `NOT SENT` disclosure, provider-unavailable fallback, client rejection of an injected unknown citation, keyboard operation, absence of decision controls/private-root leakage and no desktop overflow.
