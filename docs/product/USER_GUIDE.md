# IntelliLoop User Guide - Current Local Workflow

**Audience:** Demo operators, reviewers and local evaluators  
**Status:** `IL-9.3_DOCUMENTATION_SYNCHRONIZED / DEMO_RUN_2_LOCAL_PILOT`  
**Browser workflow documented through:** `IL-8.6`; optional experiments through `IL-10.3`; Local Project Pilot through Demo Run 2  
**Product/API status:** `G5_CORE_DEMONSTRABLE`; Phase 8 complete through `IL-8.6`  
**Evidence date:** 2026-08-08

This guide covers the currently implemented browser workflow: choose the controlled LoopMart demo or the separately gated Local Project Pilot; preflight one configured local Git repository; create or select a Project and current Work Item; capture an exact committed revision; preview/import bounded evidence; inspect lineage; materialize the source-free Impact Map/Twin; run deterministic reconciliation; ask one of six fixed cited questions; and inspect stored Release Check/Release Evidence Report history. The personal-provider checkpoint remains `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`. Supported validation/review intake, release approval/signing, deployment and live provider behavior remain unavailable.

## Before you start

Follow [Setup](../development/SETUP.md), run `npm.cmd run dev`, and open `http://127.0.0.1:4173`.

The Local Project Pilot is default-off. Its API process must be explicitly enabled with at least one allowlisted absolute repository root as documented in [Setup](../development/SETUP.md). The browser cannot discover or enumerate that allowlist. Use only an explicitly authorized repository. For shared competition screenshots, use the controlled LoopMart synthetic repository rather than personal, employer or client material. A local pilot repository must:

- have an absolute local path;
- be a direct Git working tree with a real `.git` directory;
- be outside IntelliLoop's configured data directory; and
- require no credential or network access for status inspection.

IntelliLoop is localhost-only, has no authentication and should not be exposed beyond `127.0.0.1`.

## Routes

| Route | Current purpose |
|---|---|
| `/` | List persisted Projects and clearly separate **Use Demo Project** from the capability-aware **Open Local Project Pilot** entry |
| `/local-pilot` | Preflight one configured repository, create/select its Project and Work Item, and run exact-commit analysis |
| `/projects/:projectId` | Create or view the current Work Item and inspect path-free repository/snapshot history |
| `/missions/:missionId/evidence` | Preview/import evidence and inspect the Mission's sources, import events, claims and explicit supersession links |
| `/missions/:missionId/twin` | Map supported repository structure, refresh the Twin, and inspect immutable attributed nodes and relationships |
| `/missions/:missionId/reconciliation` | Explicitly run reconciliation and inspect immutable finding/path history |
| `/missions/:missionId/explanation` | Ask one fixed question and inspect the deterministic answer, citations and exact `NOT SENT` pack |
| `/missions/:missionId/passport` | Create/list repository-derived assessments, inspect exact status and create/list/download unsigned Passports |
| `/demo` | Operate the isolated IntelliLoop-owned LoopMart demonstration |

The application has nine routes. The Work Item navigation rail links the seven scoped workflow stages when the required Project and Work Item exist; `/local-pilot` and `/demo` are separate acquisition/operation surfaces. Reconciliation requires exact persisted Twin, code-map and snapshot identities plus explicit support/impact declarations; neither the browser nor API accepts caller-authored findings or paths. Cited explanation requires a persisted reconciliation revision and accepts no arbitrary prompt or provider choice. Readiness accepts no caller-authored evaluation fields and presents server-owned state only.

## Complete the local workflow

### 1. Confirm the local connection

The Projects page first checks the bounded local health contract.

- `LOADING` means the browser is waiting for the local API.
- `CONNECTED` means only that the browser and API agree on the operational health response.
- `ERROR` means no current response was accepted; use **Retry connection** after restoring the API.
- `AI_OFF` means the current runtime reads no provider credential and sends no evidence externally.

`CONNECTED` is not a readiness result.

### 2. Choose Demo or Local Project

On **Projects**, **Use Demo Project** always identifies the controlled LoopMart fixture. **Open Local Project Pilot** is actionable only when the API capability is `READY`; otherwise the page truthfully shows loading, unavailable or configuration-required state without a dead control.

An `EMPTY` Project panel means no persisted Project exists. The application never substitutes sample or fallback records, and LoopMart controls never operate on Local Project records.

### 3. Run the safe repository preflight

Open **Local Project Pilot**, enter one configured absolute local Git root and activate **Run safe preflight**. Preflight first enforces server-side lexical and canonical allowlist containment, then fixed read-only Git inspection. Missing, relative, network/device, traversing, sibling-prefix, symlink/junction-directed, non-Git, bare or uncommitted-HEAD roots fail closed with a sanitized recovery message.

Success shows only the repository display name, actual ref, exact commit and commit time, read-only/source-free mode, and whether working-tree changes will be excluded. The raw root is hidden after preflight and cleared after registration. The allowlist, changed filenames and source contents are never returned.

### 4. Create or select the Project and Work Item

Under **Project and Work Item**, create a bounded Local Pilot Project or choose an active Project that is not bound to another repository. Enter a real Work Item title; do not fabricate a Jira key, workflow status, requirement, validation, review or approval. Activate **Start exact-commit analysis**.

The API re-runs preflight before registration, privately persists one canonical root for the Project, creates or reuses its current Work Item, and verifies that the repository still has the preflight commit. The current domain permits one repository per Project, so use separate Projects/Work Items for separate repositories. `Workflow Status: Not tracked` remains correct when no authoritative workflow source exists.

### 5. Capture and analyze the exact commit

The pilot sequentially uses the existing snapshot, Code Map, Twin, reconciliation, Release Check and Report services. Completed artifacts are retained if the local API is temporarily unavailable; **Retry from retained progress** resumes without inventing state. The immutable Git observation reports:

- capture time and snapshot identity;
- `ATTACHED`, `DETACHED` or `UNBORN` HEAD state;
- branch and commit only when those values exist;
- index, worktree, untracked and total changed-entry counts; and
- a canonical changed-files digest without filenames.

`CLEAN OBSERVATION` and `DIRTY OBSERVATION` describe repository status at capture time; dirty content is not analyzed. `NOT ASSESSED`, **Observation only** and **Not a readiness decision** are deliberate: the UI does not infer validation or release readiness from Git state.

Earlier captures remain in **Immutable observation history** and survive an API restart. On completion, use **Open Work Item overview**, **Open source-free Impact Map** or **Review Release Check & Report**. The common journey contains no demo reset, synthetic correction, fixture commit or declared-fallback action.

### 6. Preview and import evidence

From the current Mission, activate **Open evidence and timeline**. The browser route loads the Mission and its first 100 sources, import events, claims and supersession links from the local API. `LOADING`, ordinary `ERROR`, `EMPTY` and `INTEGRITY ERROR` states are explicit; no sample evidence is substituted.

Under **Preview before import**:

1. Select `Markdown`, `Plain text` or `JSON`.
2. Select the declared origin.
3. Enter a logical locator such as `manual:requirements/cancellation-v2`, not a filesystem path or credential-bearing URL.
4. Optionally enter the source revision and canonical UTC effective time.
5. Select `FACT` for directly stated material or `INFERENCE` for declared interpretation. This is metadata, not a truth score.
6. Enter at most 262,144 UTF-8 bytes and activate **Preview redaction**.

The preview displays only the normalized redacted representation, replacement count, format, byte counts and content digest. It is not persisted. Editing the format or content invalidates the current preview and disables import until another preview succeeds. Preview may still contain sensitive material that no rule recognized, so use only controlled synthetic evidence.

Activate **Import evidence** only after reviewing the exact preview. The API repeats preparation from the submitted content and appends or reuses the attributed immutable source and its mission-sequenced `EVIDENCE_IMPORTED` event. On success, the browser clears the raw content and preview while retaining the non-sensitive attribution fields. An exact retry can report a reused source; it is idempotency, not a new event.

The lower panels show:

- **Evidence sources:** explicit `FACT`/`INFERENCE`, logical locator, origin, revision, recorded/effective time, digest and a collapsed redacted representation;
- **Import timeline:** positive mission-local sequence, event type, time and source identity;
- **Claims and epistemic labels:** only claims already stored through the API, including value, attribution and explicit predecessor metadata; and
- **Supersession history:** only persisted `SUPERSEDES` links between compatible predecessor and successor claims.

The browser does not create claims, infer claims from evidence, choose a winning claim or infer supersession from timestamps. Reloading the route reconstructs the same persisted lineage. If any returned resource has an invalid shape, wrong scope or contradictory relationship, the complete lineage view is replaced by `INTEGRITY ERROR`; partial data is not presented as trustworthy.

### 7. Import historical runtime summaries through the API

`IL-3.7` is API-only; the browser has no runtime-observation control or panel. A developer may submit a controlled synthetic `runtime-observation-summary.v1` object through the route documented in the [API reference](../api/API_REFERENCE.md). Do not use personal, employer, client or real production telemetry.

Accepted summaries remain local historical evidence. `LATEST_OBSERVED_WINDOW` means only that no strictly later window exists for the exact series; `STALE_BY_NEWER_WINDOW` preserves an older record and identifies a later one. Neither label means accurate, validated, healthy, safe or ready. The response always says `HISTORICAL_EVIDENCE_ONLY` and `liveFeed: false`.

### 8. Materialize and inspect the Active Software Twin

Open **Active Software Twin** from the Mission route or navigation rail.

1. If no persisted revision exists, the screen displays `EMPTY`; it never substitutes sample nodes.
2. Activate **Materialize current sources**. The request accepts no graph body: the server reads the current persisted Project, Mission, evidence, claims, explicit successor links and Git snapshots.
3. Inspect the selected revision summary. Counts and the projection digest belong to that exact immutable revision.
4. Review **Attributed Twin nodes**. Every card shows node revision, logical attributed path, source type/identity/digest, origin, epistemic label and recorded time.
5. Expand **Relationships** to review relationship types and exact endpoint revisions.
6. After a source changes, materialize again. A changed input creates a successor; identical input reuses the existing revision. Use **Selected immutable revision** to reopen history.

`ATTRIBUTED PROJECTION` means only that the list is reconstructed from a verified canonical persisted revision. A node, relationship, `FACT` label, invalidation or validation-shaped source is not automatically true, conflict-free, approved or release-ready. When any response page is incomplete, `PARTIAL PAGE` is shown rather than presenting the page as the entire graph.

### 9. Map repository structure and refresh the Twin

On the same Twin route, use **Repository code map** only after registering a controlled local Git repository.

1. Activate **Map repository and refresh Twin**. The default browser request does not authorize declared fixture fallback.
2. The API captures Git state, reads only bounded `.ts`, `.tsx`, `.js`, `.jsx` and `.json` blobs from that exact committed Git object, performs syntax-only extraction and captures Git state again. Working-tree-only content and sensitive-name candidates are excluded before source acquisition. It never executes registered code or installs dependencies.
3. When successful, the page labels the revision `STATIC INFERENCE`, shows `AVAILABLE` plus `COMPLETE` or `PARTIAL`, identifies the exact bound snapshot and refreshes the Twin from the persisted map.
4. Review **Attributed software assets** for type, label, repository-relative logical path and source digest.
5. Review **Explainable dependency paths** for the exact recognized relationship and endpoints. These are static syntax paths, not observed runtime calls.
6. Reload the route to confirm the selected immutable code-map and Twin revisions survive restart/retrieval.

If a safe scan/extraction limit prevents static mapping, the browser reports failure and states that no declared fixture was substituted. The API has a separately documented `INTELLILOOP_CONTROLLED_FIXTURE` consent value for the IntelliLoop-owned demonstration only; the browser intentionally never sends it. A declared result is visibly labeled `DECLARED INTELLILOOP FIXTURE`, `UNAVAILABLE SAFE FAILURE` and `UNAVAILABLE`, never as equivalent to inference.

The accessible list is the authoritative Phase-4 presentation. No graph visualization is shipped, so graph/list parity is not applicable. A code-map asset, dependency edge or `STATIC INFERENCE` label is still an inference—not correctness, runtime behavior, a finding or readiness.

### 10. Run and review reconciliation

Open **Findings and impact** from the Twin route or navigation rail. The screen chooses the latest exact compatible Twin/code-map pair and shows their immutable bindings before accepting an assessment. If no compatible pair exists, return to the Twin route and map/refresh first.

The assessment form is explicit-only:

1. Optionally declare one required evidence locator and/or one validation key. The server reports `MISSING` only when that exact declaration lacks support.
2. Optionally enable one impact obligation. Choose an attributed `Claim` or `SoftwareAsset` root, a critical code-map asset, `IMPLEMENTATION` or `VALIDATION` support, and a validation key when validation support is selected.
3. Activate **Run deterministic reconciliation**. The browser cites the selected root with its canonical member digest; it does not infer a requirement from labels, graph shape or AI.
4. Inspect the immutable revision summary and the exact `CONFLICT`, `AMBIGUOUS`, `MISSING`, `STALE` and `IMPACT_GAP` counts.
5. Inspect each open finding's deterministic reason, identity and citations. `STALE` shows the predecessor and exact dependency changes. `IMPACT_GAP` shows its declared obligation, critical asset when present and supporting path when present.
6. Inspect **Cited impact paths** step by step. Each step shows direction, relationship type, attributed endpoint/relationship identities, revision, digest and provenance. A depth-zero path explicitly means the root is the critical asset.
7. Use **Selected immutable assessment revision** to reopen history. Correct a claim only through an explicit successor in the existing API/data boundary, materialize a successor Twin, and rerun; previous findings remain historical.

The browser validates exact response keys, scope, ordering, finding-count coherence, reason/type compatibility, citation identity, step continuity and complete-page supporting-path references before rendering. Any contradiction becomes `INTEGRITY ERROR` with no partial assessment treated as trustworthy. Ordinary API failure provides a retry state, and bounded partial pages are disclosed.

No control dismisses, resolves, waives, approves or blocks a finding. `OPEN` means the deterministic current result under that revision's exact inputs. Persisted validation-result reconstruction is not implemented: a declared validation requirement therefore fails closed as missing, and a selected Twin containing unreconstructable validation nodes is rejected. None of these states is release readiness.

### 11. Review a cited explanation

After at least one reconciliation revision exists, activate **Open cited explanation** from Findings and impact or use the navigation rail.

1. Select one of the six fixed questions. There is no free-text prompt.
2. Activate **Generate deterministic cited answer**. The result must display `AI_OFF`, `DETERMINISTIC_EXPLANATION`, provider `DISABLED`, `NOT SENT` and `ADVISORY ONLY - NO RELEASE DECISION`.
3. Read the answer and its facts, inferences, conflicts, gaps and next actions. Every statement includes one or more citation links.
4. Follow a citation to the used-citation registry and inspect its item kind, logical key, digest and redacted payload. A citation proves pack coherence, not truth.
5. Expand **Exact redacted pack JSON** to review the exact local bytes a future provider request could contain. The displayed pack is not transmitted, stored as an explanation or approved for external use.

If provider execution is disabled or a controlled provider attempt is unavailable/rejected, the complete offline answer remains visible. If the server/client sees an unknown citation, identity mismatch, private absolute path or unexpected readiness-shaped field, the prior answer is cleared and the page says the cited answer was not rendered. There is no release verdict, finding mutation or provider retry control in this screen.

### 12. Assess readiness and inspect the Release Passport

Open **Readiness and Passport** from the navigation rail after a persisted reconciliation revision exists.

1. Activate **Assess current persisted evidence**. The request body is empty; the server derives the current snapshot, reconciliation, validation evidence, explicit review, freshness and all nine obligations from persisted repositories.
2. Read the exact server-owned state. `BLOCKED` lists failed obligations and blocker reasons, candidate `READY` means every fail-closed obligation passed for that immutable assessment, and historical `STALE` lists the exact dependency changes. None is a release approval.
3. Select an assessment revision to inspect its immutable snapshot/reconciliation/rule bindings, findings, validation requirements/evidence, review attribution and digests.
4. Activate **Create unsigned Passport** for that selected assessment. The Passport reproduces the assessment; it does not run readiness again.
5. Select Passport history and inspect its citations and authority statement. **Download structural JSON** retrieves a verified local projection containing no source bodies, credentials or private absolute paths. **Print Passport view** prints the same verified screen.

The current product has no browser or HTTP control to create validation results or explicit review records, so ordinary user-created Missions should be expected to remain fail-closed until later supported fixture/intake work. Do not use improvised database edits. A candidate `READY` result or Passport is unsigned local evidence, not a waiver, signature, certificate, deployment authorization or proof that underlying evidence is true. The complete status, lifecycle and recovery semantics are in the [Readiness and Release Passport guide](READINESS_AND_PASSPORT_GUIDE.md).

## Keyboard operation

- Press `Tab` from the top of the page to reveal **Skip to main content**, then press `Enter` to bypass the navigation rail.
- Continue with `Tab` or `Shift+Tab` to move through links, fields and buttons.
- Press `Enter` on links and buttons; press `Enter` from a focused single-line form field to submit.
- On the evidence form, use the native keyboard controls for select fields, move to **Preview redaction**, and then activate the newly enabled **Import evidence** button.
- On the Twin route, activate materialization or **Map repository and refresh Twin**, use the native revision selectors and relationship disclosure with the keyboard.
- On the reconciliation route, tab through the optional declaration fields, use native selectors, run the form with `Enter`, choose immutable history and expand citation disclosures with the keyboard.
- On the cited-explanation route, use the native fixed-question selector, generate with `Enter`, follow citation links and expand the exact pack disclosure with the keyboard.
- On the readiness route, create an assessment, select immutable assessment/Passport revisions, create the unsigned Passport and use download/print controls with the keyboard.
- Every implemented control has visible focus treatment and a text label. State is never communicated by color alone.

The verified desktop baseline is 1366 x 768. The layout also reflows for narrower windows.

## Failures and recovery

If an action fails, IntelliLoop keeps the current attributed data and displays a stable action error. Correct the local condition and retry the relevant action. It does not turn failed, stale, placeholder or cached data into a success state.

Common recovery checks:

1. confirm both local development processes are running;
2. confirm the repository still exists at its registered canonical location;
3. confirm the Project remains active and the Mission remains current;
4. confirm the repository remains within the documented code-map file, byte and time bounds;
5. confirm evidence JSON is an object or array with no duplicate keys and the logical locator is path-free; and
6. confirm a compatible Twin/code-map pair exists before reconciliation; and
7. confirm an immutable reconciliation revision exists before asking a cited question; and
8. retry without placing credentials or private path details in Project, Mission or evidence-attribution fields.

An evidence-format, size, syntax, locator or lifecycle rejection leaves existing lineage unchanged and displays a stable error. `INTEGRITY ERROR` means stored canonical Twin history or a success-shaped API response failed strict scope, digest, member, endpoint or lineage checks. No partial Twin/evidence list is shown; restore a trustworthy local API/database state before retrying. When any collection exceeds 100 records, the page explicitly states that it is showing only the first bounded page.

For exact API status codes and schemas, see the [Local API reference](../api/API_REFERENCE.md). For the path and command boundary, see [Security and privacy](../security/SECURITY_AND_PRIVACY.md).

## Verify readiness and Passport behavior

Developers and reviewers can regenerate the focused Phase-7 implementation evidence:

```powershell
npm.cmd run evidence:readiness-passport
```

The command executes controlled domain, SQLite, production API, browser-contract and focused browser proof and writes [EV-READINESS](../evidence/EV_READINESS.json) plus [EV-PASSPORT](../evidence/EV_PASSPORT.json). A passing report establishes the documented behavior for its controlled fixtures; it is not production accuracy, safety certification or a release decision.

## Verify the repository boundary

Developers and reviewers can reproduce the machine-readable safety proof from the workspace root:

```powershell
npm.cmd run evidence:repo-safety
```

The command uses only an IntelliLoop-authored temporary repository. It must not be pointed at an operator repository. A passing run regenerates [EV-REPO-SAFETY](../evidence/EV_REPO_SAFETY.json), proving unchanged status and complete repository-tree bytes plus the documented rejection corpus. This proof establishes the current bounded read-only implementation behavior; it is not a general operating-system sandbox, security certification, validation result or readiness decision.

## Verify the privacy boundary

Developers and reviewers can regenerate the fixed-sentinel privacy evidence:

```powershell
npm.cmd run evidence:privacy
```

The command creates only IntelliLoop-authored synthetic content and an operating-system temporary database. It exercises the named redaction corpus, successful/replayed/retrieved evidence, non-revealing rejection and verification-only transfer projections, then deletes its fixture. A passing [EV-PRIVACY report](../evidence/EV_PRIVACY.json) proves the exact current synthetic tokens were absent from the exercised logs, API bodies and persistence bytes. It does not make arbitrary operator evidence safe or certify complete secret detection.

## Current limits

- There is no arbitrary command, shell, repository-content, registered-user-repository write, checkout, install or registered-code execution endpoint.
- The package-owned [controlled retail fixture](CONTROLLED_RETAIL_FIXTURE.md) has a dedicated `/demo` browser route. It demonstrates the persisted `BLOCKED → READY → STALE` sequence through real product services, a deterministic AI-off conflict answer and an unsigned Passport. Follow the [demo runbook](../demo/DEMO_RUNBOOK.md); every demo POST route takes no body and the reset remains limited to the fixture-owned workspace.
- Registration supports one direct `.git` directory per Project; worktree/submodule `.git` files are not supported.
- Changed filenames are digested in memory but not persisted or displayed.
- There is no Project/Mission archive UI, repository replacement/removal UI or snapshot mutation.
- Markdown/text/JSON preview and import plus read-only source/timeline/claim/supersession presentation are available in the Mission browser route. Historical runtime-summary import/retrieval is API-only. Do not submit personal, employer or client material, and do not treat a prepared source, claim, runtime observation, freshness label, `FACT` label or successor link as true, approved, validated or ready.
- The browser displays at most the first 100 records in each lineage/Twin/code-map collection and does not yet provide next-page controls or claim/successor authoring.
- The code-map API exposes source-free structure—relative paths, identifiers, literal routes and digests—but never source bodies. Those structural values may still be sensitive, so use controlled repositories only.
- There is no live telemetry connector, runtime-observation browser UI, automated invalidation or continuous-learning path.
- The cited-explanation response includes exact local redacted-pack disclosure marked `NOT SENT`; there is no live provider transport or general export surface.
- `IL-6.5` did not run a personal OpenAI evaluation. Provider grounding, citation quality, usefulness, latency and token use remain `NOT_MEASURED`; do not describe deterministic or mock results as provider performance.
- The attributed Active Software Twin list, bounded static extraction, persisted code-map results and deterministic findings/impact browser review are implemented. `IL-5.1`-`IL-5.6` provide comparison/reassessment, bounded cited impact traversal, immutable reconciliation/impact persistence/read APIs and strict accessible presentation.
- Public validation-result intake/reconstruction is not implemented, so the production reconciliation workflow supplies no user-authored validation set and cannot close a validation requirement. Internal schema-`011` validation storage supports repository-derived readiness composition and controlled proof only. A declared or synthetic unavailable code map also cannot establish implementation support. Failed or inconclusive validation can be represented by the domain contract but never means readiness.
- Reconciliation, impact paths, cited explanations, citations, `FACT`/`INFERENCE`, validation state and open/absent findings do not approve or block a release by themselves. The readiness/Passport screen presents repository-derived immutable state, but a candidate `READY` assessment and unsigned Passport still grant no release or deployment authority. Validation/review intake, signing and approval remain unavailable.
- Official Avishkar requirements have not yet been verified. This guide is project documentation, not a compliance claim.

## Reviewing synthetic edge cases

After generating any fixed cited answer, review **Synthetic retail edge cases** below the answer. Each card shows a synthetic scenario, its expected deterministic observation and links to the cited pack item that motivated it. The header and every card identify the content as `SYNTHETIC`, `ADVISORY ONLY` and `NOT EVIDENCE`.

Use these ideas to plan controlled future tests. Do not treat them as imported evidence, validation results, new findings, issue resolution, readiness or release approval. The current product cannot accept or execute a suggestion. Regenerating an answer is stateless and does not change reconciliation history. Production always generates these suggestions using deterministic rules with provider `NONE`; a personal account or API credential is neither required nor used.

## Optional Evidence Replay Lab

Start the optional lab with `npm.cmd run dev:replay`. Complete the controlled setup and correction so two immutable Twin revisions exist, open **Active Software Twin**, then select baseline and candidate revisions under **Evidence Replay Lab**.

The lab reports added, removed, changed and unchanged node/relationship members by canonical member digest. Every displayed difference includes the persisted baseline or candidate path citation. It performs four bounded local GET requests and withholds the result if history/member pagination is incomplete. The comparison is advisory and read-only: it cannot import evidence, materialize a Twin, resolve a finding, change readiness, issue/alter a Passport, call a provider or execute repository code.

The feature is omitted from normal startup because `experiments.evidenceReplay` defaults to `false`. See [IL-10.1 evidence](../evidence/IL_10_1_TEST_EVIDENCE.md) for the controlled comparison and canonical-state equality proof.

## Optional Advisory-output Disagreement Lab

Start `npm.cmd run dev:disagreement`, complete the controlled demo through `READY`, open **Cited explanation**, and generate one of the fixed answers. Below the answer, the default-off lab accepts an array of two to four `imported-advisory-output.v1` objects. Each must identify the agent/provider/model/output, match the displayed Mission/question/evidence-pack digests, declare `ADVISORY_ONLY`, and cite only the current registry.

For a safe walkthrough, choose **Insert controlled example** and **Compare imported outputs**. The results separate exactly aligned normalized text, identical text with different citation sets, and text present in only some outputs. The example is synthetic demonstration data. The comparator does not infer semantic contradiction, quality, truth or provider identity.

Imports remain in component memory and are cleared on navigation/reload. No import is persisted, no provider or agent is contacted, and no finding, evidence, readiness or Passport state can change. Normal startup omits this lab because `experiments.agentDisagreement` defaults to `false`. See [IL-10.2 evidence](../evidence/IL_10_2_TEST_EVIDENCE.md).

## Optional Guarded Remediation Preview

Start `npm.cmd run dev:remediation`, complete the controlled demo through `READY`, generate **What is impacted?**, and find **Guarded Remediation Preview** below the cited answer. Choose either **Cited controlled test plan** or **Cited change intent**, then select **Generate preview only**.

Test-plan mode derives bounded review steps from the cited synthetic edge cases. Change-intent mode summarizes the smallest cited human-review intent without fabricating source code or a diff. Every card links to the current citation registry and remains `ADVISORY ONLY / NOT EVIDENCE / NOT EXECUTED`.

The preview is cleared on navigation/reload. There is no apply button, command field, repository client, disposable runner, provider request, persistence route or readiness action. A human must independently authorize, implement and validate any later change. Normal startup omits the lab because `experiments.remediationPreview` defaults to `false`. See [IL-10.3 evidence](../evidence/IL_10_3_TEST_EVIDENCE.md).
