# Emergent Frontend Handoff

**Scope:** visual polish on an isolated branch after the verified local release-candidate checkpoint  
**Product:** IntelliLoop is an AI-Powered Active Software Twin for Change Impact and Release Assurance.

## Product boundary

The central unit is a Change Mission, presented as a Work Item, which connects Linked Evidence, exact repository state, the source-free Impact Map, validation, deterministic conflict analysis, and release reasoning. The server is the only readiness authority. AI is optional and advisory; it cannot set readiness, resolve a finding, approve a release, or rewrite evidence.

Verified capabilities include local Project and Work Item persistence, read-only repository registration, immutable exact-commit snapshots, static TypeScript/JavaScript/JSON Code Map extraction from committed Git objects, source-free Twin persistence, cited deterministic conflict analysis, immutable Release Checks, stored-assessment-only unsigned Release Evidence Reports, a synthetic LoopMart journey, and a default-off Local Project Pilot. Loading, empty, error, retry, retained-progress, Not Ready, Ready, Recheck Needed, and stored-report states are implemented.

## Routes and primary frontend surfaces

| Route | Primary component | Purpose |
|---|---|---|
| `/` | `ProjectSelection`, `HealthPanel`, `LocalProjectPilotEntry` | API status, Project selection, Demo and Local Project entries |
| `/demo` | `DemoWorkspace`, `GuidedDemoJourney` | Controlled synthetic LoopMart lifecycle |
| `/local-pilot` | `LocalProjectPilot` | Authorized-repository preflight and retained local setup |
| `/projects/:projectId` | `ChangeOverview`, `GuidedLocalProjectJourney` | Work Item, repository, snapshot, workflow and Release Check context |
| `/missions/:missionId/evidence` | `EvidenceTimeline` | Linked Evidence, redaction preview, claims and history |
| `/missions/:missionId/twin` | `TwinWorkspace`, `CodeMapWorkspace` | Immutable Impact Map and source-free repository structure |
| `/missions/:missionId/reconciliation` | `ReconciliationWorkspace` | Deterministic Risks & Checks and cited impact paths |
| `/missions/:missionId/explanation` | `CitedExplanationWorkspace` | Fixed evidence-grounded explanations |
| `/missions/:missionId/passport` | `ReadinessPassportWorkspace` | Stored Release Check and unsigned Release Evidence Report |

The six common journey steps are: **Work Item**, **Linked Evidence**, **Impact Map**, **Resolve Conflicts**, **Release Check**, and **Release Evidence Report**. Keep **Workflow Status** separate from **Release Check** in every treatment.

## Demo and Local Project behavior

- Demo uses IntelliLoop-owned synthetic LoopMart data. It may reset the fixture, apply the declared synthetic correction, demonstrate Not Ready to Ready, show the stored report, and create Recheck Needed after controlled drift.
- Local Project is local-only, server-allowlisted, read-only, exact-commit bound, and source-free after analysis. Dirty working-tree content is excluded. It has no demo reset, synthetic correction, fixture commit, fallback, or external-AI behavior.
- The Local Project Pilot must remain **default-off in every hosted environment**. A host must never embed or expose machine allowlists.

## Visual system

All current styling is in `apps/web/src/styles.css`. Root tokens are `--bg`, `--surface`, `--surface-raised`, `--line`, `--line-strong`, `--text`, `--muted`, `--aqua`, `--amber`, `--danger`, `--success`, `--warning`, `--neutral`, and `--shadow`. Reuse semantic classes and visible text/symbols for state; color alone cannot carry meaning. Preserve the 320 px minimum, the tested 390-by-844 layout, skip link, focus-visible outlines, reduced-motion behavior, identifier wrapping, and accessible names.

## Normal edit surface

Emergent may normally edit only these frontend presentation files:

- `apps/web/src/styles.css`
- `apps/web/src/App.tsx`
- `apps/web/src/FoundationStates.tsx`
- `apps/web/src/HealthPanel.tsx`
- `apps/web/src/ProjectSelection.tsx`
- `apps/web/src/DemoWorkspace.tsx`
- `apps/web/src/GuidedDemoJourney.tsx`
- `apps/web/src/GuidedLocalProjectJourney.tsx`
- `apps/web/src/LocalProjectPilot.tsx`
- `apps/web/src/ChangeOverview.tsx`
- `apps/web/src/EvidenceTimeline.tsx`
- `apps/web/src/TwinWorkspace.tsx`
- `apps/web/src/CodeMapWorkspace.tsx`
- `apps/web/src/ReconciliationWorkspace.tsx`
- `apps/web/src/CitedExplanationWorkspace.tsx`
- `apps/web/src/ReadinessPassportWorkspace.tsx`
- `apps/web/src/presentation.tsx`

Text or component changes must preserve current fetch contracts, actions, state transitions, route semantics, privacy boundaries, keyboard behavior, and authoritative wording. Client modules may be inspected but should not be changed for visual polish.

## Forbidden surfaces

Do not change API or domain logic, readiness authority, shared contracts, repository registration, snapshot or Git execution, Code Map/Twin services, migrations, evidence JSON, generated-evidence writers, `package-lock.json`, or runtime data. Do not introduce a second state store, readiness calculation, repository path cache, source-code display, approval action, dismissal action, deployment action, signing claim, or provider call. No new dependency may be added solely for visual polish.

Work on a separate branch. Never push frontend polish directly to `main`. Do not rewrite or delete the verified release-candidate tag.

## Validation

Run the narrow handoff gate after every coherent visual change:

```powershell
npm.cmd run verify:ui-handoff
```

Before proposing a merge, also run:

```powershell
npm.cmd run check:release-platform
npm.cmd run check:release-security
npm.cmd run check:docs
git diff --check
```

The narrow command typechecks the web workspace, runs focused Project/Demo/Local component tests, builds the production web bundle, and executes the shortest existing guided LoopMart browser regression. It does not refresh evidence or leave a development server running. If a registered evidence source changes, use the repository's supported evidence process rather than editing evidence JSON.

## Privacy and presentation claims

Use synthetic LoopMart data for shared screenshots and demonstrations. Never include raw local paths, allowlist values, source content, `.env` values, tokens, employee information, database files, private configuration, or live pilot identifiers. A Local Project screenshot must remain path-free and source-free.

Verified presentation claims:

- deterministic, AI-off release assurance works locally;
- exact committed repository state is captured read-only;
- dirty working-tree content is excluded from Local Project analysis;
- Code Map/Twin records persist without raw repository source;
- Release Checks and reports are immutable and bound to stored evidence;
- missing, stale, contradictory, tampered, or unsupported required evidence fails closed;
- the synthetic demo shows Not Ready, Ready, Recheck Needed, recovery, and a stored unsigned report.

Do not claim production readiness, organizer acceptance, release approval, deployment or signing authority, multi-repository readiness, measured savings, ROI, revenue, accuracy improvement, customer outcomes, employee outcomes, human-pilot results, Java support, runtime-complete dependency analysis, authentication, or cloud operation. Current limitations are one repository per Project, static syntax-only supported-language analysis, no authentication, local-only Local Project capability, bounded file/count/byte/time ceilings, and Not Ready when real validation or human review evidence is missing.
