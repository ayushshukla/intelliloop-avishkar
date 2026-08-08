# IntelliLoop Local API Reference

**Audience:** Local API consumers, developers and technical reviewers  
**Status:** `IMPLEMENTED_LOCAL_V1`; documentation synchronized at `IL-9.3`  
**Contract version:** `v1`  
**API implemented through:** `IL-8.3 / DEMO_RUN_2_LOCAL_PILOT`  
**Evidence date:** 2026-08-08

The API is a localhost-only JSON interface. It has no authentication yet and must not be exposed beyond `127.0.0.1`. Every response includes `x-request-id`; a valid caller UUID is propagated and any unsafe value is replaced.

## Common contracts

Successful resources include `apiVersion: "v1"`. IDs are UUID v4 strings, timestamps are canonical UTC strings, revisions are positive integers, and SHA-256 digests use `sha256:` followed by 64 lowercase hexadecimal characters. Identity collections use ascending identity cursor pagination. `limit` defaults to 20 and must be from 1 through 100. `nextCursor` is the last returned identity when another page exists, otherwise `null`. The evidence timeline instead uses ascending integer sequence cursors, where `cursor` means strictly after that sequence.

```json
{
  "error": {
    "version": "v1",
    "code": "INVALID_REQUEST",
    "message": "The request could not be accepted.",
    "requestId": "123e4567-e89b-42d3-a456-426614174000"
  }
}
```

| HTTP status | Code | Meaning |
|---:|---|---|
| 400 | `INVALID_REQUEST` | Body, path or query schema failed, or a bounded domain value is invalid |
| 404 | `NOT_FOUND` | Project, mission, Git snapshot, repository binding or route does not exist |
| 409 | `CONFLICT` | The transition conflicts with current lifecycle state |
| 413 | `INVALID_REQUEST` | The HTTP payload exceeds the route-level transport limit |
| 500 | `INTEGRITY_ERROR` | Stored canonical history failed scope, envelope, predecessor, member or digest verification |
| 500 | `INTERNAL_ERROR` | Storage or service failure; diagnostics are not returned |

Unknown JSON properties and query parameters are rejected. Errors never include submitted values, SQL, exception text or filesystem paths.

## Routes

| Method and path | Success | Contract |
|---|---:|---|
| `GET /api/v1/health` | 200 | Operational health only; never release readiness |
| `POST /api/v1/projects` | 201 | Body `{ "name": string }`; creates an active Project at revision 1 |
| `GET /api/v1/projects` | 200 | Project heads; optional `limit` and `cursor` |
| `GET /api/v1/projects/:projectId` | 200 | Exact current Project revision |
| `GET /api/v1/local-project-pilot/capability` | 200 | Path-free default-off pilot capability; never returns configured roots |
| `POST /api/v1/local-project-pilot/preflight` | 200 | Validates one submitted root against the server allowlist and returns only safe Git metadata or a sanitized rejection |
| `PUT /api/v1/projects/:projectId/repository` | 201 | Registers one canonical local Git root read-only only through the enabled pilot boundary |
| `GET /api/v1/projects/:projectId/repository` | 200 | Returns path-free registration metadata |
| `GET /api/v1/projects/:projectId/local-project-pilot-context` | 200 | Revalidates the private root and returns path-free current ref/commit/exclusion metadata |
| `POST /api/v1/projects/:projectId/missions` | 201 | Body `{ "title": string }`; creates one current mission |
| `GET /api/v1/projects/:projectId/missions` | 200 | Project-scoped mission heads; optional `limit` and `cursor` |
| `GET /api/v1/missions/:missionId` | 200 | Exact current ChangeMission revision |
| `POST /api/v1/missions/:missionId/git-snapshots` | 201 | Captures one immutable read-only Git observation; accepts no body |
| `GET /api/v1/missions/:missionId/git-snapshots` | 200 | Mission-scoped snapshot history; optional `limit` and `cursor` |
| `GET /api/v1/git-snapshots/:snapshotId` | 200 | Exact immutable snapshot resource |
| `POST /api/v1/missions/:missionId/evidence/preview` | 200 | Validates, normalizes and redacts evidence without persistence |
| `POST /api/v1/missions/:missionId/evidence-sources` | 201/200 | Prepares and persists an attributed source plus timeline event; exact replay returns 200 |
| `GET /api/v1/missions/:missionId/evidence-sources` | 200 | Mission-scoped evidence sources; optional `limit` and identity `cursor` |
| `GET /api/v1/missions/:missionId/evidence-sources/:evidenceSourceId` | 200 | Exact mission-scoped evidence source |
| `GET /api/v1/missions/:missionId/timeline-events` | 200 | Import events; optional `limit` and integer sequence `cursor` |
| `POST /api/v1/missions/:missionId/evidence-sources/:evidenceSourceId/claims` | 201/200 | Appends or replays one normalized source-attributed claim |
| `POST /api/v1/missions/:missionId/claims/:claimId/successors` | 201/200 | Appends or replays one explicit successor and `SUPERSEDES` link |
| `GET /api/v1/missions/:missionId/claims` | 200 | Mission-scoped claims; optional `limit` and identity `cursor` |
| `GET /api/v1/missions/:missionId/claims/:claimId` | 200 | Exact mission-scoped claim |
| `GET /api/v1/missions/:missionId/claim-supersessions` | 200 | Mission-scoped successor links; optional `limit` and identity `cursor` |
| `POST /api/v1/missions/:missionId/evidence/runtime-observations` | 201/200 | Validates, redacts and appends one attributed historical observation; exact replay returns 200 |
| `GET /api/v1/missions/:missionId/evidence/runtime-observations` | 200 | Mission-scoped historical observations with derived freshness and identity pagination |
| `GET /api/v1/missions/:missionId/evidence/runtime-observations/:runtimeObservationId` | 200 | Exact observation plus its immutable evidence source |
| `POST /api/v1/missions/:missionId/twin/revisions` | 201/200 | Accepts no body; materializes current persisted sources or reuses the exact current revision |
| `GET /api/v1/missions/:missionId/twin/revisions` | 200 | Newest-first immutable revision summaries with integer revision pagination |
| `GET /api/v1/missions/:missionId/twin/revisions/:revision` | 200 | Exact verified revision summary |
| `GET /api/v1/missions/:missionId/twin/revisions/:revision/nodes` | 200 | Deterministic node-identity page with source binding and logical path citation |
| `GET /api/v1/missions/:missionId/twin/revisions/:revision/relationships` | 200 | Deterministic relationship-identity page with exact endpoint revisions and attribution |
| `POST /api/v1/missions/:missionId/code-map/revisions` | 201/200 | Runs bounded static inference; an exact optional body can explicitly authorize the controlled fixture fallback |
| `GET /api/v1/missions/:missionId/code-map/revisions` | 200 | Newest-first verified code-map summaries with integer revision pagination |
| `GET /api/v1/missions/:missionId/code-map/revisions/:revision` | 200 | Exact verified code-map revision summary |
| `GET /api/v1/missions/:missionId/code-map/revisions/:revision/assets` | 200 | Deterministic asset-identity page with relative path, evidence kind and digests |
| `GET /api/v1/missions/:missionId/code-map/revisions/:revision/edges` | 200 | Deterministic edge-identity page with exact asset endpoints and evidence kind |
| `POST /api/v1/missions/:missionId/reconciliation/revisions` | 201/200 | Runs deterministic reassessment and impact analysis over exact persisted selectors; exact historical input replay returns 200 |
| `GET /api/v1/missions/:missionId/reconciliation/revisions` | 200 | Newest-first immutable reconciliation/impact summaries with integer revision pagination |
| `GET /api/v1/missions/:missionId/reconciliation/revisions/:revision` | 200 | Exact verified reconciliation/impact revision summary |
| `GET /api/v1/missions/:missionId/reconciliation/revisions/:revision/findings` | 200 | Deterministic digest-ordered page of conflict, ambiguity, missing, stale and impact-gap findings |
| `GET /api/v1/missions/:missionId/reconciliation/revisions/:revision/impact-paths` | 200 | Deterministic digest-ordered page of cited impact paths |
| `POST /api/v1/missions/:missionId/cited-explanations` | 200 | Renders one fixed deterministic cited answer plus exact `NOT SENT` pack disclosure; production provider execution is disabled |

Project names are bounded to 1-120 characters and mission titles to 1-160. A Project may have at most one current mission; a competing request returns `409` and creates no second record. POST replay creates a new identity because `IL-2.2` defines no idempotency-key contract.

## Local Project Pilot and repository registration

The pilot defaults off. The API process must receive exact `true` for `INTELLILOOP_LOCAL_PROJECT_PILOT_ENABLED` and at least one bounded local root in `INTELLILOOP_LOCAL_PROJECT_ALLOWED_ROOTS`; otherwise capability is `DISABLED` or `CONFIGURATION_REQUIRED` and no root can register. The allowlist is parsed with the host path delimiter, is never enumerated to the browser and is not persisted in reusable source configuration.

Preflight and PUT bodies are exactly `{ "rootPath": string }`. `rootPath` is the only current request field that may contain an absolute local path. It is schema-bounded to 4096 characters and is never included in a success response, stable error or normal log. Lexical path-aware containment is checked before candidate filesystem inspection, then canonical real-path containment is checked with Windows case rules where applicable. Network/device roots, sibling-prefix matches, explicit `..` traversal, symlink/junction redirection, missing paths, non-Git directories and repositories without a stable committed HEAD fail closed.

Successful preflight returns only display name, recognized Git/head state, actual ref, exact commit, commit timestamp, an excluded uncommitted-change count, `READ_ONLY` and `SOURCE_FREE`. It exposes no configured root, changed filename or source. Registration re-runs the same preflight before delegating to the existing one-repository-per-Project service.

The successful resource contains only `registrationId`, `projectId`, `repositoryKind: "LOCAL_GIT"`, `accessMode: "READ_ONLY"` and `registeredAtUtc`. The canonical root is retained privately in API-owned SQLite so later authorized readers can resolve the allowlisted root. It is revalidated before future reads.

Only one Project may bind a given canonical root, and a Project may have only one registration. Projects' missions inherit this exact Project-scoped repository boundary. A frontend and backend repository therefore require separate Projects/Work Items in the current model; there is no multi-repository release aggregation, replace or removal contract.

## Git snapshot capture

Capture is authorized only for a `CURRENT` mission on an active Project with a registered repository. The POST request has no body: callers cannot supply a command, path, ref or Git option. A successful response has this shape:

```json
{
  "apiVersion": "v1",
  "snapshot": {
    "snapshotId": "00000000-0000-4000-8000-000000000031",
    "projectId": "00000000-0000-4000-8000-000000000001",
    "missionId": "00000000-0000-4000-8000-000000000011",
    "registrationId": "00000000-0000-4000-8000-000000000021",
    "capturedAtUtc": "2026-08-04T00:02:00.000Z",
    "headState": "ATTACHED",
    "branchName": "main",
    "headCommit": "0123456789abcdef0123456789abcdef01234567",
    "dirty": true,
    "indexChangeCount": 1,
    "worktreeChangeCount": 1,
    "untrackedFileCount": 1,
    "changedFileCount": 3,
    "changedFilesDigest": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  }
}
```

`branchName` is absent for `DETACHED`; `headCommit` is absent for `UNBORN`. `changedFilesDigest` covers normalized and sorted porcelain status entries. The repository root and individual filenames are never serialized. Counts and digest are observation metadata only, not validation or readiness.

List results use the common 1-100 identity cursor contract and include `missionId`, `snapshots` and `page`. Historical snapshots remain retrievable after capture. No update or delete endpoint exists, and the storage layer rejects update/delete attempts.

Expected capture conflicts return the common stable envelope: archived mission or repository identity changing during capture returns `409`; missing mission, registration or snapshot returns `404`. Git unavailable, timeout, output-limit, malformed-status and storage failures return path-free `500` responses. Diagnostic Git stderr, repository paths, changed filenames and exception text do not enter the response.

## Evidence preview and commit

Preview accepts exactly `format` and `content`:

```json
{
  "format": "MARKDOWN",
  "content": "Cancellation is allowed before dispatch.\npassword=example-secret"
}
```

`format` is `MARKDOWN`, `TEXT` or `JSON`. `content` must be strict UTF-8, non-empty and at most 262,144 bytes after encoding; format-specific normalization and JSON structural limits also apply. A successful `preview` contains the normalization version, format, input and normalized byte counts, redacted `normalizedContent`, its digest and named redaction counts. Preview checks that the mission exists but writes no source, timeline event or claim.

Commit accepts the preview fields plus required `origin`, `sourceLocator` and `epistemicLabel`, with optional `sourceRevision` and `effectiveAtUtc`:

```json
{
  "format": "MARKDOWN",
  "content": "Cancellation is allowed before dispatch.",
  "origin": "USER_INPUT",
  "sourceLocator": "manual:requirements/cancellation-v2",
  "sourceRevision": "requirements-v2",
  "effectiveAtUtc": "2026-08-01T00:00:00.000Z",
  "epistemicLabel": "FACT"
}
```

`sourceLocator` is a logical locator, 4-512 characters, and must not be an absolute filesystem path; `sourceRevision` is 1-256 characters. `origin` is one of `USER_INPUT`, `REPOSITORY_OBSERVATION`, `VALIDATION_RESULT`, `SYSTEM_DERIVATION`, `SYNTHETIC_FIXTURE` or `AI_ADVISORY`; `epistemicLabel` is `FACT` or `INFERENCE`. The server always re-runs preparation and fixes `extractionMethod` to `DIRECT_IMPORT`; callers cannot submit prepared content, a digest, recorded time, project scope or extraction method.

The first successful commit returns `201` and `created: true` with one immutable `evidenceSource` and one `EVIDENCE_IMPORTED` timeline event. An exact prepared-content-and-attribution replay returns the same pair with `200` and `created: false`. A successful source includes its logical locator and only redacted normalized content. It never includes request raw content, an absolute path or unredacted secret value.

## Claims and explicit successors

Claim creation accepts exactly:

```json
{
  "rawText": "Cancellation is allowed before dispatch.",
  "subject": "Order Cancellation",
  "predicate": "Allowed Before",
  "value": "dispatch",
  "applicability": {
    "dimensions": [
      { "dimension": "region", "value": "india" },
      { "dimension": "channel", "value": "web" }
    ],
    "effectiveFromUtc": "2026-08-01T00:00:00.000Z",
    "effectiveUntilUtc": "2027-08-01T00:00:00.000Z"
  },
  "effectiveAtUtc": "2026-08-01T00:00:00.000Z",
  "epistemicLabel": "FACT"
}
```

`rawText` must be a non-empty verbatim excerpt of the cited source's redacted normalized content and is bounded to 4,096 UTF-8 bytes. Subject, predicate, dimension and dimension-value terms are bounded to 256 bytes before domain normalization. `value` may be any bounded JSON value: its canonical form is limited to 16,384 bytes, depth 16 and 256 nodes. Applicability is optional, permits at most 16 unique dimensions, is limited to 4,096 canonical bytes, and requires a valid increasing effective window when both timestamps are supplied. The server fixes `extractionMethod` to `MANUAL_STRUCTURED_INTAKE` and inherits project, mission, origin, locator, revision and source digest from the cited source.

The first accepted intake returns `201` and `created: true`; exact replay returns the same immutable claim with `200` and `created: false`. `FACT` and `INFERENCE` are explicit caller labels, not a truth decision. Multiple comparison-eligible claims may coexist without an implicit winner.

A correction uses the predecessor path `/claims/:claimId/successors` and adds `evidenceSourceId` to the ordinary claim body. The predecessor ID cannot be supplied only as an ambiguous body property. The new claim must have the same exact normalized comparison and applicability keys, remain in the same Project/Mission, cite a source in that scope and use non-decreasing recorded time. Success appends the claim and one `SUPERSEDES` relationship atomically. Self-links, cross-scope links, mismatches, forks, multiple predecessors and backwards-time links return `409`; no existing claim is changed or removed.

## Imported runtime-observation summaries

The runtime-observation commit route accepts one exact object with source attribution and a `summary` shaped as follows:

```json
{
  "origin": "USER_INPUT",
  "sourceLocator": "runtime-summary:checkout/capture-7",
  "sourceRevision": "capture-7",
  "epistemicLabel": "FACT",
  "summary": {
    "schemaVersion": "runtime-observation-summary.v1",
    "subject": "checkout-api",
    "environment": "PRODUCTION",
    "observationKind": "http-request-summary",
    "observedFromUtc": "2026-08-04T09:00:00.000Z",
    "observedUntilUtc": "2026-08-04T09:05:00.000Z",
    "sampleCount": 200,
    "measurements": [
      { "name": "error-rate", "unit": "RATIO", "value": 0.02 },
      { "name": "p95-latency", "unit": "MILLISECONDS", "value": 180 }
    ]
  }
}
```

Only `USER_INPUT`, `VALIDATION_RESULT` and `SYNTHETIC_FIXTURE` origins are accepted. The canonical JSON input is limited to 32,768 UTF-8 bytes, 1-32 measurements, one 31-day-or-shorter canonical UTC window and a sample count of 1-1,000,000,000. Subject, observation kind and measurement names use bounded lower-case stable tokens. Measurements must be unique and ascending by name. Units are `COUNT`, `MILLISECONDS`, `RATIO`, `PERCENT` or `BYTES`, with unit-specific numeric bounds. Extra fields—including readiness-shaped fields—reject.

The server passes the object through the existing JSON evidence preparation/redaction boundary, derives `effectiveAtUtc` from `observedUntilUtc`, and writes the `EvidenceSource`, `EVIDENCE_IMPORTED` event and `RuntimeObservation` projection in one immediate transaction. Generated IDs, recorded time, digests, series key, authority and freshness cannot be supplied by the caller. Exact canonical content plus exact attribution is idempotent.

Freshness compares only observations in the same versioned series key—subject, environment and observation kind. A row is `STALE_BY_NEWER_WINDOW` only when that series has a strictly later `observedUntilUtc`; equal-window records remain co-latest so later reconciliation can preserve ambiguity. Historical rows are never updated. Every response fixes `authority` to `HISTORICAL_EVIDENCE_ONLY` and `liveFeed` to `false`; this route has no readiness field or effect.

## Twin materialization and revision lists

The materialization route accepts no body. The server resolves the Mission and Project, reads all persisted evidence sources, claims, explicit supersessions and Git snapshots through bounded pages, includes the latest verified code-map revision when one exists, supplies the latest verified Twin revision as predecessor and invokes the deterministic domain projector. Validation-result input is currently empty because no validation-result persistence/API story exists yet. Exact input replay returns the same revision with `200` and `created: false`; a new canonical input appends with `201` and `created: true`.

Revision lists order newest first. Their integer `cursor` means revisions strictly lower than the supplied value. Node and relationship lists order by deterministic UUID identity and use the common identity cursor. Every collection is limited to 1-100 records per response. Revision summaries expose exact node, relationship and invalidation totals, allowing a consumer to label a page partial when `nextCursor` is non-null.

Node resources contain `nodeId`, `nodeRevision`, `nodeType`, canonical `memberDigest`, a complete bounded attribution object and an exact source binding. `attribution.pathCitation` is the validated logical source reference stored in the selected projection; it is never an absolute registered repository path. Relationship resources retain `relationshipId`, relationship revision/type, canonical `memberDigest`, exact `from`/`to` node identities and revisions, and their own logical derivation citation. The member digest hashes the complete canonical selected-revision member and is not interchangeable with its underlying source digest; `IL-5.6` uses it for exact browser-originated impact citations.

Every exact/member read deserializes and verifies the complete canonical stored document and compares it with the stored envelope. Corruption or mismatch returns `500 INTEGRITY_ERROR` and no projection content. That response distinguishes detected integrity failure from an ordinary service failure without exposing raw JSON, SQL or paths.

## Code-map run and review

`POST /api/v1/missions/:missionId/code-map/revisions` accepts no body for the normal product path. It captures Git state before and after extraction, rejects repository movement, and reads supported files from the exact captured commit with fixed `git ls-tree`/`git cat-file` operations. Working-tree-only content is never supplied to extraction. The committed-object reader applies the existing 2,000-file, 256-KiB-per-file, 5-MiB aggregate and five-second ceilings, excludes `node_modules` plus sensitive/private-configuration names, and persists only the source-free projection bound to the exact second snapshot. A successful new input returns `201`; persistence replay can return `200`. Each summary includes immutable scope/revision/digests, a snapshot binding, evidence mode, counts and optional predecessor.

The only accepted optional body is:

```json
{
  "fallbackMode": "INTELLILOOP_CONTROLLED_FIXTURE"
}
```

Omitting the body or using `"DISABLED"` keeps fallback off. `INTELLILOOP_CONTROLLED_FIXTURE` is per-run consent for the package-owned synthetic manifest and is appropriate only for the controlled IntelliLoop demo. It can be used only after an allowlisted scan/extraction limit or safe failure. Scope errors, repository movement, malformed data, storage failures and integrity failures remain hard failures. The browser never sends this consent. Inferred and declared results cannot be confused: inferred results report `STATIC_INFERENCE`, `AVAILABLE` and `COMPLETE` or `PARTIAL`; declared results report `DECLARED_INTELLILOOP_FIXTURE`, `UNAVAILABLE_SAFE_FAILURE`, `UNAVAILABLE`, a manifest ID and fallback reason.

Revision lists are newest-first and use integer revision cursors. Asset and edge pages use deterministic identity cursors, default to 20 and cap at 100. Assets expose `assetId`, `kind`, `label`, optional repository-relative `sourcePath`, `sourceDigest`, `evidenceKind` and `assetDigest`. Edges expose `edgeId`, `kind`, exact `fromAssetId`/`toAssetId`, `evidenceKind` and `edgeDigest`. Source bodies, package command values, private absolute roots and arbitrary scanner diagnostics are never API fields. Relative paths, identifiers and literal route labels may still reveal controlled repository structure and must not be sent to an external provider.

Static limit and repository-state conflicts return `409`; missing Mission/registration/revision returns `404`; malformed fallback or page input returns `400`; canonical storage mismatch returns `INTEGRITY_ERROR`. No code-map update/delete, filesystem browsing, source-content, arbitrary-manifest, command or execution route exists.

## Reconciliation and impact execution

The reconciliation run accepts one exact object:

```json
{
  "twinRevision": 2,
  "codeMapRevision": 1,
  "targetSnapshotId": "00000000-0000-4000-8000-000000000041",
  "supportRequirements": [
    {
      "requirementId": "requirements/cancellation",
      "supportKind": "EVIDENCE_SOURCE",
      "sourceLocator": "manual:requirements/cancellation-v2"
    }
  ],
  "roots": [
    {
      "rootId": "change/cancellation-rule",
      "nodeId": "00000000-0000-4000-8000-000000000051"
    }
  ],
  "impactRequirements": [
    {
      "requirementId": "impact/checkout-handler",
      "rootId": "change/cancellation-rule",
      "criticalAssetId": "00000000-0000-4000-8000-000000000061",
      "supportKind": "IMPLEMENTATION",
      "basisCitations": [
        {
          "kind": "NODE",
          "memberId": "00000000-0000-4000-8000-000000000051",
          "revision": 1,
          "digest": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        }
      ]
    }
  ]
}
```

The three selector fields and all three arrays are required. Explicit empty arrays are valid and create no implicit support obligation, impact root or impact requirement. Support requirements are capped at 50, roots at 50, impact requirements at 500 and basis citations per impact requirement at 50. A validation impact requirement must include `validationKey`; an implementation requirement cannot include it. Unknown properties, malformed identifiers and caller-authored semantic relationships, findings or paths reject before execution.

The service loads the exact persisted Twin revision, code-map revision and target snapshot in the resolved Project/Mission scope. It requires the Twin's code-map binding, source-backed software assets, code-map-derived relationships, snapshot and repository registration to match the selected code map exactly. Evidence sources, claims and supersession links are reconstructed only from exact members of the selected Twin; the caller cannot substitute source entities or graph edges. Fixed collection limits fail closed before evaluation.

Persisted validation-result intake does not exist yet. Execution therefore supplies no invented validation result and rejects a selected Twin that contains validation-result state that cannot be reconstructed from persistence. An explicitly required but absent validation may still produce the deterministic missing-support or impact-gap result defined by the domain. This limitation is not equivalent to a failed validation, a waiver or readiness.

The response summary binds the Project/Mission, immutable aggregate revision, input/result digests, exact Twin and snapshot, reassessment and impact digests, finding counts, impact-path count and the complete code-map trust tuple: `evidenceKind`, `inferenceStatus` and `completeness`. A newly appended aggregate returns `201` and `created: true`. Any prior revision with the same canonical input digest is returned byte-for-byte with `200` and `created: false`, including a replay of an older historical input after later revisions exist.

Revision pages are newest first; their integer cursor means revisions strictly lower than the supplied value. Finding and impact-path pages are ordered by stable SHA-256 key and their digest cursor means keys strictly greater than the supplied value. All page limits default to 20 and are capped at 100. Every read hydrates and verifies the complete canonical aggregate before returning a summary or member. Stored-envelope or digest mismatch returns `500 INTEGRITY_ERROR`; stale-predecessor, scope, exact-binding, source-reconstruction and unavailable-validation execution conflicts return `409`. Missing Mission or revision returns `404`, and malformed requests/pages return `400`.

There is no reconciliation update/delete route, caller-supplied aggregate endpoint, provider call or readiness decision. The `IL-5.6` browser consumes these unchanged bounded operations and can submit only the explicit declaration object above; it cannot submit or mutate a finding/path. `OPEN`, `MISSING`, `STALE` and `IMPACT_GAP` remain deterministic evidence states, not release authorization.

## Cited explanation

`POST /api/v1/missions/:missionId/cited-explanations` accepts exactly one request member, `question`, whose value must be one of:

- `Can we release?`
- `What conflicts are open?`
- `What is impacted?`
- `What validation is missing?`
- `What should happen next?`
- `What changed after correction?`

Arbitrary questions and extra fields—including provider mode, model, readiness, approval or finding mutations—reject with `400`. The service resolves the Mission's Project, loads the latest immutable reconciliation/impact revision, reconstructs its exact bound Twin, evidence sources, claims and supersessions, and compiles the question-directed `evidence-pack-compiler-policy.v2` projection. Missing assessment/source state returns a stable conflict; pack-limit or integrity failure returns no partial explanation.

Every successful response fixes the primary execution to `DETERMINISTIC_EXPLANATION`, `externalAiStatus: OFF`, `externalCallMade: false`, `canonicalStateChanged: false` and `authority: ADVISORY_ONLY_NO_RELEASE_DECISION`. Production wiring uses the disabled adapter, so its outcome is `DISABLED` with `PROVIDER_DISABLED`. The response includes the complete offline explanation, deterministic synthetic edge-case set, only the citation details used by rendered statements/advisory/synthetic text, and an exact disclosure containing the pack/question digests, counts, conservative units, redaction summary and canonical redacted pack JSON. `transferStatus: NOT_SENT` is literal: this endpoint performs no external transfer.

The response schema is closed and bounded. Every offline statement has one or more citations, every citation resolves to the exact item digest, and the offline citation registry equals the ordered used union. An optional advisory resource can exist only when an injected controlled/mock adapter has validated its exact request/pack/schema identity, safe metadata, usage and citation union. It remains non-authoritative and cannot replace or mutate the offline explanation. The production server injects no mock or live transport.

## Retrieval and privacy

All evidence, timeline, claim, supersession and runtime-observation reads are mission-scoped. A valid identity from another mission is not exposed through the supplied mission scope. Evidence-source, claim, successor and runtime-observation lists use the common identity cursor. Timeline events use sequence order and `nextCursor` is the last sequence only when another page exists.

Prepared and persisted resources expose the redacted normalized representation because it is the auditable evidence used for digests and excerpts. They do not expose the original request bytes. Request bodies, source content, logical locators, raw paths, claim values and excerpts are excluded from structured logs; logs retain only request ID, method, route, status and stable error code. Unsupported update/delete methods are unregistered and return the common `404` envelope.

## Current boundary

The `IL-2.5` browser workflow consumes the Project/Mission/repository/snapshot routes without changing their contracts or adding a schema migration. Demo Run 2 gates registration behind the default-off Local Project Pilot and adds only the capability, preflight and path-free context routes documented above. `IL-3.4` adds JSON evidence and claim routes; `IL-3.5` consumes their preview, commit and bounded list operations from the browser without adding or changing an API route or migration. Archival is implemented transactionally in persistence and covered by integration tests, but no archive HTTP endpoint or browser control is authorized. Git access is limited to closed read-only operations for identity, commit time, status and exact committed-object acquisition; there is no caller-supplied command or repository-content endpoint. There is no repository replacement/removal, snapshot/source/claim update/delete, rename, hard delete, restore, provider, validation/review intake, Passport mutation/signing, approval or deployment endpoint.

`IL-2.6` adds no route or response field. The documented repository method/body/path boundary is checked by the reproducible [EV-REPO-SAFETY report](../evidence/EV_REPO_SAFETY.json): unsupported repository methods return the common not-found envelope, caller-controlled snapshot bodies reject, and the successful repository resource remains path-free.

`IL-3.4` exposes the already-bounded `IL-3.1`-`IL-3.3` preparation and persistence behavior through schema-validated routes. `IL-3.5` adds browser preview/import and read-only lineage presentation. `IL-3.7` adds API-only import/retrieval of bounded historical runtime summaries. `IL-4.3` exposes verified persisted Twin revisions and attributed member pages. None adds automated extraction, file-reading upload, repository write, shell/command execution, external provider call, live telemetry, truth selection or readiness authority. Browser claim/successor/observation authoring remains absent.

`IL-3.6` adds no API method or schema. Its generated privacy proof drives the existing routes through Fastify injection, verifies fixed raw tokens absent from success/error responses and confirms no production export, AI-pack or provider endpoint is registered.

`IL-3.7` adds the three runtime-observation evidence routes above. They do not open a socket, poll, subscribe, call a provider, read a credential or create a background worker; the supplied JSON is the only observation input.

`IL-4.3` adds the five Twin routes above and migration `008`. Materialization is explicit and reads existing persisted entities only. It performs no filesystem scan or Git command, accepts no caller graph/body and has no provider, credential, background refresh, reconciliation or readiness effect.

`IL-4.4` adds a Mission-scoped read-only scanner, `IL-4.5` adds a separately bounded TypeScript/JSON static extractor, `IL-4.6` adds exact-snapshot orchestration plus append-only source-free projection persistence and `IL-4.7` registers the five strict `/code-map/revisions` routes above. Source text and private roots are not HTTP resources, persisted projection fields or log fields. Inferred and explicitly declared fixture modes retain different identities/status/origin/method labels. The routes add no update/delete, repository write, provider, reconciliation or readiness authority.

`IL-5.4` adds deterministic domain-only impact traversal and cited `IMPACT_GAP` projection. `IL-5.5` adds migration `010`, the five strict reconciliation routes above and immutable combined reassessment/impact history. `IL-5.6` adds canonical member digests to Twin node/relationship list resources and consumes the existing reconciliation routes in the browser; it adds no schema migration, finding mutation, validation-result persistence, evidence exporter, provider integration or readiness authority.

`IL-6.1` adds the domain evidence-pack/citation registry, `IL-6.2` adds deterministic offline explanation, `IL-6.3` adds disabled/mock-only provider request/response validation and `IL-6.4` registers the single strict cited-explanation route above. Schema version remains 10 because answers and provider attempts are not persisted. The route has no arbitrary prompt, live transport, credential, finding mutation, readiness or Passport operation. The exact pack JSON is returned locally for review under `NOT SENT`; it is not an exporter or evidence of an external call.

`IL-6.5` adds no HTTP operation or response field. Its personal-provider checkpoint is a build/evidence contract that selects the offline course-correction decision; it cannot enable the cited-explanation route, accept a credential or change production provider mode.

`IL-6.6` adds no HTTP operation or response field. It finalizes documentation and a repository-local documentation checker only; the production provider remains disabled.

## IL-6.7 synthetic edge-case response

The existing `POST /api/v1/missions/:missionId/cited-explanations` success contract is now `v2` and requires `syntheticEdgeCases`. The object is bound to the exact Project, Mission, pack and question digests and contains a strict versioned policy, deterministic generation metadata, explicit authority denials, bounded suggestions, the exact used citation subset, limitations and a canonical set digest.

Every suggestion requires `SYNTHETIC`, `ADVISORY_ONLY` and `NOT_EVIDENCE`. Production reports `DETERMINISTIC_RULES`, provider `NONE` and `externalCallMade: false`. Unknown members, kinds, labels, citations, private paths, digest shapes or authority values fail the route/client schema. The field adds no request input, arbitrary prompt, provider selection, write route, finding operation, readiness result or Passport surface. It is reconstructed statelessly and not persisted.

## IL-7.4 readiness and Passport API

All endpoints are Mission-scoped and resolve the owning Project server-side. Assessment and Passport list resources include the stored status and server-derived current status so `STALE` history remains explicit without rewriting immutable rows. Revision pagination is newest-first with `limit` from 1 through 100; a positive integer `cursor` means revisions strictly below that value, and `nextCursor` is the last returned revision when another page exists or `null`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/missions/:missionId/readiness/assessments` | Derive all current inputs from repositories and create or reuse one immutable assessment |
| `GET` | `/api/v1/missions/:missionId/readiness/assessments?limit=&cursor=` | List bounded assessment history with derived current state |
| `GET` | `/api/v1/missions/:missionId/readiness/assessments/:revision` | Retrieve one complete assessment and current state |
| `POST` | `/api/v1/missions/:missionId/readiness/assessments/:revision/passport` | Create or reuse the unsigned Passport for that exact assessment |
| `GET` | `/api/v1/missions/:missionId/readiness/passports?limit=&cursor=` | List bounded Passport history with assessment-owned current state |
| `GET` | `/api/v1/missions/:missionId/readiness/passports/:revision` | Retrieve one complete Passport and current state |
| `GET` | `/api/v1/missions/:missionId/readiness/passports/:revision/export` | Download a safe structural JSON projection of the verified Passport resource |

Both POST endpoints require the body to be exactly `{}`. No caller can assert a readiness status, obligation result, blocker, finding, validation, review, freshness value, citation or projection field. Cross-Mission identities are rejected through the resolved scope, and all success resources use `apiVersion: "v1"`.

Assessment resources include identity/revision/time, persisted evaluated status, server-derived current status and stale reasons, exact input/snapshot/reconciliation/rule bindings, all nine ordered obligations, blockers, finding counts, validation requirements/evidence, explicit review, predecessor and fixed non-authority metadata. Passport resources reproduce the assessment-bound fields, add the Passport key/digest and structural citations, and fix `projection: "REPRODUCED_NOT_RECOMPUTED"`, `readinessRecomputed: false`, `signed: false`, `releaseApproval: false`, `deploymentAuthority: false` and `aiAuthority: "NONE"`.

The export response uses `release-passport-export.v1`, classifies content as `CONTROLLED_STRUCTURAL_METADATA`, fixes source-body, absolute-path and credential flags to false, and carries the warnings `UNSIGNED_LOCAL_RECORD`, `NOT_RELEASE_APPROVAL` and `VERIFY_CURRENT_STATUS_BEFORE_USE`. It is a local download representation, not a signature, attestation, deployment authorization or general evidence exporter. Internal validation/review writers remain in-process seams and are deliberately not exposed. Generated [EV-READINESS](../evidence/EV_READINESS.json) and [EV-PASSPORT](../evidence/EV_PASSPORT.json) now prove the focused integration, restart, isolation, integrity and AI-off boundary. See the [operator guide](../product/READINESS_AND_PASSPORT_GUIDE.md) for status interpretation and recovery.

## IL-8.3 controlled retail demo workspace

These localhost-only routes operate one fixed IntelliLoop-authored synthetic fixture. They accept no repository path, Project ID or fixture selector and never execute generated repository code.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/demo` | Return `EMPTY` or the persisted lifecycle stage, exact IDs/revisions and current `BLOCKED`, `READY` or `STALE` association |
| `POST` | `/api/v1/demo/setup` | Create the generated Git repository and load initial product state; `201` when created and `200` when reused |
| `POST` | `/api/v1/demo/correction` | Apply the fixed correction, import controlled validation/review inputs, reassess to `READY` and create/reuse the unsigned Passport |
| `POST` | `/api/v1/demo/staleness` | Add the fixed dependency change, capture its Git snapshot and derive the prior assessment/Passport as currently `STALE` |
| `POST` | `/api/v1/demo/reset` | Remove only the ownership-marked generated workspace; `reset` distinguishes work from an idempotent no-op |

All four POST routes reject any body. Correction and staleness are idempotent at their completed stage and reject invalid transition order. Responses expose logical IDs and revision numbers but never the generated absolute root. This family controls one synthetic demo lifecycle only; it is not release approval, a validation/review intake API or a general Project deletion API.

## Historical IL-7.1-IL-7.3 API non-surface

At their individual checkpoints, `IL-7.1` added the pure `readiness.v1` evaluator, `IL-7.2` added its internal repository-derived persistence boundary and `IL-7.3` added the unsigned one-assessment Passport projection; none added an HTTP or browser surface. The persistence service—not an HTTP caller—derives readiness inputs, and the Passport service copies one repository-hydrated assessment. `IL-7.4` now exposes only the bounded resources documented above; internal validation/review writers, raw evaluator inputs and Passport tables remain unavailable as ad hoc endpoints.
