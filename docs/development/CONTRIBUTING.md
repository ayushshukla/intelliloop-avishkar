# Contributing to IntelliLoop

**Audience:** Current and future contributors  
**Status:** Active engineering policy synchronized through `IL-9.3`  
**Evidence date:** 2026-08-06

## Work one bounded story at a time

Use the R3 backlog and the current coding prompt as the scope boundary. A change must not silently implement a later story, weaken a gate or present planned behavior as complete.

Every story must leave the workspace buildable, testable and runnable. Source presence alone is not completion evidence.

## Clean-room rule

IntelliLoop is a source-independent build:

- `directSourceCopyAuthorized` is `false`.
- Candidate repositories are read-only behavioral evidence, not implementation templates.
- Do not copy candidate source, schemas, prompts, tests, prose, assets, naming or UI composition.
- Do not open quarantined employer, client, MyTeams, Nisum-internal, Pushhpa or credential-bearing material.
- Use IntelliLoop planning contracts, independently authored fixtures and public package documentation.

## Engineering rules

- Keep deterministic domain logic free of application and infrastructure imports.
- Keep external AI off by default and advisory only when later authorized.
- Never create a green readiness state from mock, sample, fallback or UI-only data.
- Preserve append-oriented evidence and explicit versioning in later stories.
- Bind local services to localhost unless a later reviewed requirement changes the boundary.
- Add tests for material trust, security and failure behavior.
- Keep API error messages stable and non-revealing; propagate only validated request IDs.
- Add log fields through the safe allowlist, never through arbitrary metadata objects.
- Keep external and experimental flags off until their owning stories are implemented.
- Route persisted or compared JSON through the versioned canonicalizer; never depend on object insertion order.
- Inject clocks and ID sources into deterministic code; do not hide current-time or randomness calls in domain logic.
- Treat digests as identity/integrity material, never as truth, approval or readiness.
- Keep SQLite access inside `apps/api`; never open the database from domain, contracts or web code.
- Add only contiguous forward migrations, preserve their authored SQL bytes and never rewrite an applied migration.
- Test every migration from the retained prior schema, including failure rollback and newer-schema refusal.
- Keep database paths outside source and registered repositories and out of responses and logs.
- Keep future web routes visibly unavailable until their API-backed story exists; do not link to empty facades.
- Give every trust state a text label and semantic structure; color alone is never authoritative.
- Preserve skip navigation, visible focus and keyboard access when extending the shell.
- Never substitute cached, sample or placeholder content for a failed authoritative API response.
- Preserve the zero-or-one current-mission invariant and reject cross-project collections rather than filtering them silently.
- Treat Project/Mission archive as terminal until a separately authorized lifecycle extension defines reopening.
- Keep Project/Mission time monotonic and return immutable successor revisions instead of mutating history.
- Keep Project/Mission revision rows append-only and update heads with an expected-revision guard inside one transaction.
- Preserve the database-level one-current-mission index; concurrency safety must not rely only on an in-memory check.
- Keep collection pagination bounded to 1-100 and ordered by immutable stable identity.
- Reject unknown API body/query fields and return only versioned stable error envelopes.
- Canonicalize and revalidate each registered root; reject traversal, symlink redirection and database containment.
- Never return or normally log private canonical repository roots.
- Treat registration as an exact read-only allowlist. Do not add repository mutation or code-execution operations.
- Keep `EV-REPO-SAFETY` generated through `npm.cmd run evidence:repo-safety`; never hand-edit a passing machine report or include raw roots/status bytes.
- Keep evidence preparation pure and pre-persistence: accept only typed bounded bytes, redact before returning a prepared value, never digest raw secret-bearing input and expose only stable non-revealing errors.
- Treat redaction-pattern changes and `evidence-normalization.v1` changes as reviewed versioned contract work with fixed digest/negative-corpus tests. A prepared import is evidence, not automatically true and not readiness authority.
- Keep persisted evidence append-only and Mission-scoped. Revalidate prepared values before storage, derive idempotency only from the redacted representation and immutable attribution, and append the source/event pair in one immediate transaction.
- Use logical source locators rather than absolute/private paths. Never add source/event update/delete behavior or treat a source-level `FACT` label as proof that its content is true.
- Keep claim normalization versioned and bounded. A raw claim excerpt must occur verbatim in the already-redacted source; comparison keys must not become truth, confidence, priority or fuzzy-matching authority.
- Keep applicability explicit, normalized and independent from the subject/predicate comparison key. Overlap and incompatibility policy belongs to its frozen later story.
- Corrections append a new claim plus one explicit attributed `SUPERSEDES` link. Never rewrite the predecessor, infer supersession from timestamps or permit a predecessor to fork silently.
- Treat claim-level `FACT` and `INFERENCE` as declared epistemic metadata, not truth probability or readiness evidence.
- Keep evidence/claim HTTP routes mission-scoped and schema-strict. Commit must re-run preparation; callers must not supply prepared content, IDs, recorded time, Project scope or extraction methods.
- Keep API collections bounded and preserve redacted-only responses, safe request IDs/errors and body-free structured logs. Add no source/claim mutation route or implicit supersession selector.
- Keep the browser evidence route subordinate to the API: validate exact response shapes and cross-lineage attribution before rendering, expose a single integrity-failure state rather than partial truth and disclose bounded first-page views.
- Invalidate import when the draft differs from its preview, let commit re-run server preparation and clear raw browser content/preview after success. Do not render evidence as HTML or infer claims from its text.
- Render `FACT`, `INFERENCE`, `EVIDENCE ONLY`, empty, failure and supersession states with explicit text and semantic structure. Never convert an epistemic label or later timestamp into a winner or readiness state.
- Keep `EV-PRIVACY` generated through `npm.cmd run evidence:privacy`; never hand-edit a passing machine report or include raw sentinels, private paths, temporary roots or transfer-fixture bodies.
- Privacy fixtures must be IntelliLoop-authored, offline and temporary. Verification-only export/AI-pack projections are not product contracts and must not be wired into runtime or transmitted.
- Scan fixed privacy sentinels across logs, API responses and closed persistence bytes. Treat a passing corpus as bounded evidence, never complete DLP, secure memory erasure or provider certification.
- Keep runtime observations import-only, historical and bounded. Do not add sockets, connectors, polling, streams, background ingestion, learning loops or production-feed claims.
- Route runtime summaries through evidence preparation before one atomic source/event/observation transaction. Reject unknown/readiness-shaped fields and never treat freshness as truth, validation or readiness.
- Preserve immutable observation history. Derive staleness only from a strictly later window in the exact versioned series key; equal-window disagreement must remain visible for later reconciliation.
- Keep `twin-vocabulary.v1` exhaustive and versioned: exactly ten node and thirteen relationship variants unless an authorized migration changes the contract.
- Require stable identity, positive revision, exact mission scope and complete attributed metadata on every Twin node and edge. Bind edges to exact endpoint revisions and reject cross-Project or cross-Mission relationships.
- Confidence may describe only node extraction quality or relationship-match quality. Preserve the fixed `QUALITY_ESTIMATE_NOT_TRUTH_PROBABILITY` semantics and never infer truth, priority or readiness from its score.
- Do not treat the vocabulary alone as a materialized Twin. Projection and canonical persistence are implemented; node-pair semantics, traversal and reconciliation require their owning later stories.
- Keep Twin projection deterministic over canonical source identities/digests and collection order. Same input must return the same revision and bytes.
- Append a successor projection when input changes; never rewrite a predecessor. Invalidation must follow only explicit dependency bindings and must preserve exact prior member references.
- Treat validation results and invalidations as attributed evidence state, not reconciliation findings or readiness decisions.
- Persist only the complete canonical Twin projection inside the API-owned immediate transaction. Rehydrate and verify the full envelope, counts, digests, predecessor and scope before returning any list resource.
- Keep Twin materialization body-free and server-derived. Never accept caller-supplied nodes, relationships, paths, IDs, timestamps, digests, graph order or readiness fields.
- Keep Twin revision, node and relationship collections bounded and deterministic. Every browser path citation must retain the exact logical source identity plus revision or digest; never replace it with an inferred display path.
- Map stored or transported Twin corruption to the dedicated non-revealing integrity state. Do not render a partial graph, cached substitute or sample fallback after verification fails.
- Run code-map acquisition only through the registered read-only root. Revalidate the canonical root on every scan and reject traversal-shaped names, symlinks/junctions, special entries, escapes and mid-read changes.
- Keep the code-map allowlist exact: `.ts`, `.tsx`, `.js`, `.jsx` and `.json`; count unsupported files honestly and never imply they were analyzed. Never traverse `.git` or `node_modules`.
- Preserve the frozen ceilings of 2,000 encountered files, 256 KiB per accepted file, 5 MiB accepted bytes and five monotonic seconds. Limit failure must return no partial source bundle.
- Code-map filesystem code may inspect, canonicalize, list and read bounded text only. Do not add process execution, package installation, Git hooks, compiler plugins, source writes, repository mutation or private-root/source logging.
- Treat `code-map-source-scan.v1` as transient input. Revalidate its scope, counters, limits, paths, byte lengths and digests before extraction; never accept a caller-constructed or stale bundle on trust.
- Keep `code-map-extraction.v1` deterministic and source-free. Use TypeScript `createSourceFile` and strict `JSON.parse` only; do not add a compiler host, emit, module loading/resolution outside the scanned bundle, plugins, dynamic imports or `require` discovery.
- Preserve the extraction ceilings of 250,000 visited syntax nodes, 20,000 records, 100 diagnostics and five monotonic seconds. Recoverable syntax errors must label the result `PARTIAL`; hard limit/input failures return no result.
- Claim only static declarations under `STATIC_SYNTAX_ONLY`/`NOT_OBSERVED`. A route shape is not reachability, a test import is not coverage, a package script name is not execution and a digest is not truth.
- Bind every persisted code map to the exact post-extraction Git snapshot and reject before/after repository-state movement. Never substitute a prior or caller-supplied snapshot.
- Keep inferred and declared evidence structurally distinct. Declared fallback requires the IntelliLoop-owned manifest, explicit enablement, an allowlisted safe-failure reason and `UNAVAILABLE_SAFE_FAILURE`; it must never run for scope, repository movement, persistence or integrity failures.
- Persist only source-free canonical code-map projections. Rehydrate and verify the complete envelope, counts, predecessor, mode labels, deterministic identities/digests and exact snapshot scope before use.
- `IL-4.6` authorizes internal persistence and Twin projection but no code-map route/browser UI, runtime semantics, finding or readiness effect. Those boundaries remain closed until their owning stories.
- Keep Reconcile Core and readiness deterministic. Provider output, UI state, fixture labels and documentation prose cannot select truth, dismiss a finding, satisfy an obligation or create `READY`.
- Persist reconciliation, assessment and Passport history append-only. Derived `STALE` state must not rewrite the earlier assessment or Passport.
- Keep cited explanation questions fixed and provider execution disabled in production. Unknown citations, changed digests and private paths fail closed.
- Limit the runnable demo to the ownership-marked synthetic LoopMart workspace. Demo setup/correction/staleness/reset must accept no caller path, content, command, identity or status.
- Preserve candidate `READY` and the Release Passport as unsigned, non-approving and non-deploying. Do not add a waiver, signing, approval or deployment surface without an explicit later authority decision.
- Regenerate release evidence after candidate changes. Do not hand-edit `EV-RELEASE`, `EV-SECURITY-AUDIT`, `EV-DOCUMENTATION` or the third-party inventory.
- Treat npm advisory observations and screenshots as time-bound. Refresh them at final freeze and retain the configured-versus-observed Linux distinction.
- Keep canonical documents synchronized with the current route/schema/command surface, label deferred capabilities explicitly and run the documentation evidence gate before handoff.
- Update affected documentation in the same story.

## Before handoff

Run:

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run evidence:repo-safety
npm.cmd run evidence:privacy
npm.cmd run check:release-security
npm.cmd run check:documentation
npm.cmd run check:docs
npm.cmd run check:demo-support
npm.cmd run test:e2e
```

Report every failure honestly. Do not skip tests, reduce assertions or label an environmental failure as a pass.

## Credentials and data

Never commit or print credentials, `.env` values, private URLs, certificates, keystores, databases or real client/employer data. The competition demo will use controlled synthetic evidence only.
