# IntelliLoop Repository Guidance

## Purpose

IntelliLoop is a local-first software change and release-assurance product. It assembles attributed evidence, a versioned Active Software Twin, deterministic reconciliation and impact results, one fail-closed Release Check, and an unsigned Release Evidence Report/Passport. The current competition workflow uses an IntelliLoop-authored synthetic retail fixture; it is not production validation or release approval.

## Read first

- Current verified state: `docs/product/EXECUTION_STATE.md`
- Durable product direction: `docs/product/PRODUCT_TARGET.md`
- Canonical implementation backlog: `planning/r3-implementation-backlog-2026-08-03/implementation-backlog.json`
- Architecture and authority: `docs/architecture/ARCHITECTURE.md`, `docs/architecture/DOMAIN_MODEL.md`
- Schema history: `docs/architecture/DATA_AND_MIGRATIONS.md`
- Trust and security: `docs/product/TRUST_MODEL.md`, `docs/security/SECURITY_AND_PRIVACY.md`, `docs/security/AI_SAFETY_AND_DATA_TRANSFER.md`
- Setup/tests/demo: `docs/development/SETUP.md`, `docs/development/TESTING.md`, `docs/demo/DEMO_RUNBOOK.md`
- External claims: `docs/submission/CLAIM_EVIDENCE_MATRIX.md`, `docs/governance/SUBMISSION_COMMITMENTS.md`

Update `docs/product/EXECUTION_STATE.md` after every roadmap phase. Do not create a parallel tracker when a canonical artifact already exists.

## Commands

Use the pinned Node/npm versions in `.node-version` and `package.json`.

```powershell
npm.cmd ci
npm.cmd run dev:demo
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run check
npm.cmd run check:golden-flow
```

There is no separate lint script. Run focused tests while changing a bounded area, then the relevant full verification before claiming completion. Stop temporary API/web processes afterward.

## Non-negotiable boundaries

- `release-assessment.v1` is the only persisted deterministic readiness authority. Do not add a second calculation in AI, UI, reports, or integrations.
- The Release Passport/Evidence Report reproduces one stored assessment. It must not silently recompute or rewrite historical readiness.
- AI is advisory only. It cannot select truth, resolve/dismiss findings, set readiness, approve, sign, supersede evidence, or mutate history.
- Registered repositories are read-only. Git is limited to fixed identity/status reads; never execute registered code or add arbitrary shell, write, checkout, patch, commit, push, or deployment surfaces.
- The controlled demo may create commits only inside its owned generated synthetic repository. That exception must never accept a caller-selected repository.
- Remediation is default-off, browser-memory preview only, cited, and incapable of applying a change.
- Exact commit/snapshot bindings and immutable append-only history must remain intact. Missing, stale, contradictory, unsupported, or tampered required evidence fails closed.
- Redact before persistence, logging, external hashing/storage, or any AI transfer. Never place secrets, `.env` values, credentials, private URLs/paths, internal source bodies, or employee/customer data in logs, fixtures, screenshots, prompts, reports, or committed documents.
- Preserve external-tool provenance. Never relabel imported findings as IntelliLoop-native.
- AI-disabled operation must retain the complete deterministic workflow.

## Worktree and external actions

Inspect Git status before editing and preserve unrelated or unknown work. Do not reset, stash, delete, move, reformat, stage, or commit other work. This repository may have an unborn branch or a dirty/untracked baseline; record that honestly rather than inventing history.

Do not push, deploy, open a merge request, purchase services, create cloud resources, expose secrets, or broaden external access unless the user explicitly authorizes that exact action. Human pilot results, official rules, approvals, submissions, backups, restores, presentations, and videos must remain pending until actually performed.
