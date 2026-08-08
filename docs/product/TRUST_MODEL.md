# IntelliLoop Trust Model - Attributed Twin, Reconciliation and Impact

**Audience:** Reviewers, developers and future trust-model maintainers  
**Status:** `PARTIAL` - implemented evidence lineage, attributed Twin revisions, bounded static code extraction, cited impact analysis, reconciliation/impact review and immutable readiness-assessment history  
**Implemented through:** readiness/Passport boundary `IL-7.6` plus Demo Run 2's default-off exact-commit Local Project acquisition boundary  
**Evidence date:** 2026-08-08

This document records the trust semantics already enforceable at the bounded evidence preparation, source-lineage, claim/supersession intake, historical runtime-observation, attributed Active Twin, snapshot-bound static code-map, deterministic reconciliation/impact, immutable API, findings/impact browser, offline explanation, mock-provider validation, cited-question delivery, offline personal-provider checkpoint, pure candidate-readiness evaluation, immutable ReleaseAssessment, thin Release Passport, strict readiness/Passport presentation and generated cross-layer proof boundaries. Generated `EV-RECONCILE` and `EV-CITATIONS` jointly close `G3_DETERMINISTIC_CORE_PROVEN`; generated `EV-OPENAI-EVAL` freezes the G4 course-correction outcome to offline operation; generated `EV-READINESS` and `EV-PASSPORT` prove the controlled Phase-7 implementation path. Internal structured validation/review persistence supports assessment derivation, but public validation/review intake, approval/signing and live provider integration remain later stories. Observation-window freshness, reconciliation dependency staleness, current-evaluation freshness, historical assessment staleness and Passport stale association are distinct rules.

## Non-authority rule

Imported material is evidence supplied to IntelliLoop. It is not automatically true, approved, current, complete, applicable or safe. Successful preparation means only that the bytes satisfied this format/size/syntax boundary and produced a deterministic redacted representation. Normalizing a claim means only that a caller recorded a bounded structured assertion supported by an excerpt from that representation. A deterministic finding or cited impact path establishes equality and reachability under its exact versioned inputs; it does not establish truth, validation success, readiness or a Release Passport.

## Implemented input boundary

| Control | Implemented behavior |
|---|---|
| Declared formats | `MARKDOWN`, `TEXT` and `JSON` only |
| Input size | Non-empty and at most 262,144 bytes per input |
| Character encoding | Strict UTF-8; malformed sequences reject |
| Text normalization | UTF-8 BOM removed, CRLF/CR converted to LF and Unicode normalized to NFC |
| Text controls | C0 controls reject except tab and line feed |
| Binary signatures | Obvious PDF, ZIP, PNG, JPEG and gzip signatures reject even when declared as text |
| JSON shape | Top-level object or array; duplicate decoded/NFC keys, non-finite numbers, unpaired surrogate escapes and malformed syntax reject |
| JSON resource limits | Maximum nesting depth 64 and maximum 10,000 JSON value nodes |
| Output size | Redacted normalized output must also remain within 262,144 UTF-8 bytes |

The byte, depth, node and signature limits are conservative implementation choices for `IL-3.1`; the frozen backlog does not prescribe those numeric values. PDF, HTML, YAML, archives and arbitrary binary files are not accepted formats. Markdown may contain HTML-like text, so a future UI must still escape or sanitize its rendering.

## Redaction before any persistence boundary

The pure pipeline recognizes an ordered, versioned pattern catalog for:

- secret-bearing JSON property names;
- PEM private-key blocks;
- OpenAI, GitHub, GitLab, npm, Stripe, Slack and AWS token forms;
- JSON Web Tokens;
- authorization or bearer credential values;
- credential-bearing HTTP URLs; and
- common secret/password/token assignment forms.

Matches are replaced with stable category placeholders. The result reports only rule identifiers and match counts; it does not return the matched secret. Raw input is not returned, logged, persisted or included in the digest by this pipeline.

Pattern redaction is a defense-in-depth boundary, not a complete data-loss-prevention system. Unrecognized, transformed, split or context-specific secrets can evade it, and harmless text can match. Only controlled synthetic evidence should be used until `IL-3.6` proves sentinel absence across logs, database, API, exports and AI-pack fixtures.

## Deterministic representation and digest

Text is digested after normalization and redaction. JSON is additionally parsed, recursively normalized and canonicalized with sorted object keys. The digest is a SHA-256 canonical-JSON digest framed by:

```json
{
  "normalizationVersion": "evidence-normalization.v1",
  "format": "TEXT",
  "normalizedContent": "redacted normalized content"
}
```

Framing prevents the same characters under different declared formats or normalization contracts from being treated as the same source. Digest equality means equality under this exact representation; it does not prove truth, authorship, provenance, freshness or approval.

## Persisted attribution and idempotency

`IL-3.2` revalidates every prepared value before storage and accepts new evidence only for an active Project's current Mission. Each immutable `EvidenceSource` retains:

- stable source, Project and Mission identities;
- an allowed origin and a logical source locator;
- optional source revision and effective time;
- first-recorded UTC time;
- `DIRECT_IMPORT` extraction and `FACT`/`INFERENCE` metadata;
- the complete redacted prepared value and content digest; and
- a version-framed import key.

Locators use a bounded logical `scheme:relative/value` grammar. Absolute filesystem paths, backslashes, URL credentials, query/fragment syntax and traversal segments reject. This is an authored privacy boundary, not a universal locator standard.

The `evidence-import-key.v1` digest covers exact Project/Mission scope, attribution, effective time and the safe prepared representation. It excludes generated identity, first-recorded time and raw secret-bearing bytes. A repeated import with the same key returns the original source and timeline event with `created: false`; it does not append a duplicate. A changed scope, locator, revision, effective time or prepared representation produces a different key. Because redaction deliberately erases matched values, two raw inputs that become the same redacted representation can converge; IntelliLoop does not retain a raw-input hash merely to distinguish secrets.

The source-level epistemic label describes the recorded artifact/attribution, not the truth of statements inside it. `FACT` means the source record was directly imported under the stated metadata; it does not make the source's claims factual.

## Structured claims and comparison eligibility

`IL-3.3` permits an authorized in-process caller to record a structured `Claim` against one persisted source. The caller must provide a verbatim excerpt found in the source's already-redacted normalized content. This prevents claim intake from citing unpersisted raw text; it does not prove that the excerpt was interpreted correctly.

Claim intake stores explicit subject, predicate, JSON value, applicability, effective time, `MANUAL_STRUCTURED_INTAKE` and `FACT`/`INFERENCE`. Terms and applicability are normalized deterministically under `claim-normalization.v1`; values are canonicalized and bounded. Versioned digests bind the normalized statement, exact source/excerpt digest, applicability and scope. Generated identity and first-recorded time remain outside idempotency so exact retry returns the original claim.

The comparison key covers only normalized subject and predicate. The applicability key covers the exact normalized dimensions and optional time window. Equal keys make two claims eligible for later exact-key comparison; they do not mean the values agree, applicability overlaps under a future policy, or either claim wins. Different raw excerpts and incompatible values remain independently stored.

A claim-level `FACT` means the intake classified the assertion as a directly stated fact under its declared extraction metadata. `INFERENCE` means interpretation was required. Neither label is truth probability, confidence, source priority, approval or readiness. Intake has no confidence field and performs no automatic fact promotion.

## Explicit supersession

A correction must append a new claim and name one predecessor. The successor is accepted only when both claims have exact Project/Mission scope, comparison key and applicability key and recording time does not move backwards. The attributed `SUPERSEDES` link is written atomically with the successor. A predecessor may have only one direct successor, a successor only one direct predecessor, and the existing chain is never rewritten or deleted.

Supersession is explicit lineage, not timestamp-based truth selection. A newer unlinked claim does not supersede an older one. A mismatched subject/predicate or applicability cannot be forced into the chain. `IL-5.2` now gives a validated link its bounded semantic effect: the exact predecessor becomes inactive for current pair evaluation while history remains intact. No link means no supersession authority.

## Deterministic comparison without truth selection

`IL-5.1` makes comparison eligibility explicit while preserving the non-authority rule. `reconciliation-rules.v1` compares only claims in the same Project/Mission with exact normalized subject/predicate identity, the same versioned comparison key and overlapping applicability. It does not use semantic similarity, embeddings, confidence, source priority, timestamp priority or AI.

Applicability overlaps only when shared normalized dimensions do not disagree and half-open effective intervals intersect. A broad scope can overlap a compatible narrower scope. Equal canonical values are `EQUIVALENT`; unequal same-type scalar values are `INCOMPATIBLE`. Unknown `null`, mixed types and unequal structured values remain `AMBIGUOUS` rather than being coerced or guessed.

These pairwise relations are not truth decisions. `IL-5.2` may deterministically project an active incompatible pair into an open `CONFLICT` and an active indeterminate pair into an open `AMBIGUOUS` finding, but no comparison result or finding can approve a release or alter Twin history.

## Deterministic active findings without winner selection

`claim-reconciliation.v1` accepts one bounded, invariant-checked Mission claim/link set and fails as a whole for cross-scope or malformed input. It recomputes comparison-critical keys, rejects missing attributed links, absent endpoints, forks, joins, cycles and any link that fails the existing supersession digest/scope/applicability invariant. Only a claim with a validated outgoing successor is inactive; recording time, source type, `FACT`/`INFERENCE`, confidence and AI never deactivate a claim.

The current head of each valid explicit chain remains active alongside every unlinked claim. Consequently a newer unlinked incompatible claim still produces an open conflict, and a known value paired with unknown or structurally undecidable evidence remains open ambiguity. Equal active values produce no finding, and disjoint/non-comparable pairs produce no finding. Every decision and finding is ordered by claim identity and bound to the exact comparison and decision-policy digests, making caller input order irrelevant.

The finding key and result digest are reproducible derivation identities, not proof of persistence, source truth or readiness impact. `IL-5.2` itself has no database migration, endpoint, browser view, impact traversal or release decision; `IL-5.5` later persists the complete composed aggregate without changing those semantics.

## Exact dependency reassessment without readiness authority

`IL-5.3` accepts only an integrity-checked Twin revision plus exact source entities, claim/supersession history, one target snapshot, target-snapshot validation results and explicit support requirements in the same Project/Mission. It recomputes the active-claim result and verifies every used projected source or supersession relationship against its exact Twin binding. This is derivation integrity, not proof that the source is authentic or the claim is true.

Missing support is deliberately narrow. An obligation exists only when the caller explicitly declares a bounded requirement. Evidence matches an exact normalized logical locator; validation matches an exact key in the target-snapshot input. A `FAILED` or `INCONCLUSIVE` result is present support but is not successful validation. No requirement, timestamp, similarity, source rank, confidence score or AI output is allowed to invent or waive an obligation.

Staleness is also narrow. Reassessment records canonical dependencies for source nodes, target snapshot, explicit supersession relationships, validation nodes and rule/policy/requirement identities. A successor emits a `STALE` finding for its predecessor only when that exact dependency set changes. An unrelated Twin change causes a newly bound successor reassessment without a false stale finding. Earlier result bytes remain unchanged, and a restart must reproduce and verify their digest before replay or extension.

These outputs remain pure immutable values and are not separately materialized Twin nodes, readiness blockers or approvals. `IL-5.5` can store them inside an exact reconciliation/impact aggregate, but persistence does not increase their authority. A `MISSING`, `STALE`, `CONFLICT` or `AMBIGUOUS` value cannot by itself approve or reject release.

## Bounded cited impact without inferred authority

`IL-5.4` accepts only an exact integrity-checked Twin, its exact bound code map, the matching reassessment, one target snapshot, supplied target-snapshot validations and explicit impact roots/requirements. It does not discover obligations from similarity, naming, AI, timestamps or graph reachability. No declared roots or requirements means no impact paths and no guessed impact gaps.

The traversal policy is fixed and digest-bound. `AFFECTS` is followed forward, `DEPENDS_ON` in reverse, `IMPLEMENTS` only toward a `SoftwareAsset`, and `VALIDATED_BY` forward as a terminal step. Deterministic breadth-first traversal visits an exact node revision once per root, stops at depth 8 and chooses one canonical shortest path. Every step carries the exact node/relationship identity, revision, digest and source attribution. This proves path derivation under the selected Twin and policy; it does not prove runtime reachability, business consequence, completeness or source truth.

An `IMPACT_GAP` exists only because a caller explicitly required an implementation asset/path or validation result/path. The gap reports which exact structural obligation was not satisfied by the selected inputs. It does not prove that the product is broken, that the missing artifact should exist in reality, or that release must be blocked. Basis citations make the declaration inspectable but do not make it authoritative.

Validation status is never collapsed into presence. An exact `FAILED` or `INCONCLUSIVE` result with the required `VALIDATED_BY` relationship is structurally present and remains cited with that status; it is not passing and cannot imply readiness. A result without the required relationship is not enough to establish the requested path. Later readiness rules must interpret validation outcomes explicitly and fail closed.

Declared and synthetic code-map evidence is not equivalent to inferred repository structure. Its assets and paths remain visible for provenance, but `UNAVAILABLE_SAFE_FAILURE`/`UNAVAILABLE` support emits `IMPLEMENTATION_SUPPORT_UNAVAILABLE` and cannot close an implementation obligation. AI-advisory roots and semantic declarations are rejected, AI-attributed traversal members are excluded, and AI cannot create, waive or resolve a canonical impact gap.

## Immutable reconciliation/impact API without readiness authority

`IL-5.5` stores one complete invariant-checked reassessment and matching impact result as an immutable Mission revision. The stored aggregate binds exact Twin, code-map and snapshot identities/digests, code-map trust metadata, policy/input digests, predecessor history, finding counts and path count. Exact input is idempotent; a changed input appends a successor. Canonical serialization and envelope checks establish storage integrity under the implemented schema, not truth or completeness.

The Mission-scoped API can execute the deterministic pipeline and retrieve bounded revision, finding and impact-path pages. Requesters may select persisted revisions and supply explicit declarations, but they cannot supply precomputed findings, paths, server-owned scope or hidden validation results. Cross-scope and exact-binding mismatches reject.

## Findings-and-impact presentation without decision authority

`IL-5.6` consumes those APIs through one Mission-scoped browser route. It selects only an exact compatible persisted Twin/code-map pair and lets the operator declare optional support requirements plus one bounded impact obligation. The form does not discover requirements, infer critical assets or use AI. The selected root is cited with its canonical Twin member digest, which is distinct from the underlying source digest.

Before rendering, the strict client validates keys, formats, scope, ordering, finding counts, reason/type compatibility, basis-citation equality, path-step continuity, terminal-validation coherence and complete-page supporting-path references. Invalid success-shaped data becomes one integrity state rather than partial authority. Immutable history is selectable; the browser never rewrites a predecessor.

The route presents all five finding kinds as `OPEN` with reasons and citations. It has no dismiss, resolve, waive, approve, block or readiness operation. Claim correction still requires an explicit attributed successor followed by Twin materialization and deterministic rerun. An absent finding in a successor revision says only that the exact current inputs no longer produce it; it does not erase history or prove the new claim true.

Persisted validation-result reconstruction is absent at this checkpoint. The execution service passes an empty validation set only when the selected Twin also contains no validation-result nodes; otherwise it fails closed. Consequently the API cannot demonstrate a persisted `FAILED`/`INCONCLUSIVE` path yet even though the `IL-5.4` domain contract models and tests that distinction. This limitation must not be described as validation success, validation absence in reality or readiness.

## Historical runtime observations

`IL-3.7` accepts a versioned bounded JSON summary as attributed evidence. The caller supplies subject, environment, observation kind, canonical window, sample count and ordered numeric measurements; IntelliLoop owns IDs, recorded time, evidence preparation, digests, series key, authority and freshness. The source/event and observation projection append atomically. Exact content and attribution replay returns the original record.

Acceptance proves only that the summary satisfied the schema and was recorded under the supplied logical attribution. IntelliLoop does not connect to the named environment, authenticate the producing instrumentation or verify completeness, sampling quality or measurement correctness. `FACT` labels the directly imported artifact under its declared metadata; it does not make observed behavior true.

`LATEST_OBSERVED_WINDOW` means no strictly later window end currently exists for the same exact subject/environment/observation-kind series key. `STALE_BY_NEWER_WINDOW` means a later window exists and includes its identity. These are recency labels, not trust ranks. Equal-window records remain co-latest so disagreement is not hidden. No row is updated, no claim is invalidated yet and neither state can influence readiness.

Every API resource fixes `authority` to `HISTORICAL_EVIDENCE_ONLY` and `liveFeed` to `false`. There is no connector, polling, streaming, continuous-learning, provider or credential path. Readiness-shaped input is outside the schema and rejects.

## Append-only timeline

Creating a source atomically appends one `EVIDENCE_IMPORTED` event with a stable UUID, exact scope, evidence-source reference, source record time and mission-local positive sequence. Source and event tables have foreign keys, uniqueness constraints and update/delete rejection triggers. Existing history remains readable after Mission archival, while new imports reject.

The timeline remains an append-oriented source-event index, not a cryptographic ledger. Claim supersession is stored separately as explicit attributed links; it does not add claim events to this timeline. The current local-user trust model assumes the application owns the SQLite schema; a privileged actor who replaces the database/schema is outside this proof. Hydration still revalidates IDs, attribution, prepared content/digests, claim/link digests and import-key integrity and fails closed on malformed rows.

## Browser presentation boundary

`IL-3.5` adds a Mission-scoped route that consumes the existing JSON API without becoming a second persistence or truth authority. The browser:

- retrieves the exact Mission before loading sources, timeline events, claims and supersession links;
- requests at most 100 records from each collection and visibly discloses a partial first page;
- validates exact resource keys, UUID/timestamp/digest formats, byte counts, known redaction rules and bounded claim JSON before use;
- cross-checks Project/Mission scope, source-event references, claim/source attribution and predecessor/successor/link consistency before rendering any lineage;
- presents malformed or contradictory success payloads as `INTEGRITY ERROR`, with no partial lineage treated as trustworthy; and
- renders `FACT`, `INFERENCE`, `EVIDENCE ONLY`, empty states and successor relationships as text and structure rather than color-only authority.

Raw evidence exists in the browser form while the operator types it and is transmitted to the loopback preview/commit routes. The preview is held only in component memory and is not persistence evidence. Import is enabled only while the preview's format and content match the current form; the server still repeats preparation and remains authoritative. After a successful import, the browser clears both the raw-content field and preview. Other attribution fields remain because they contain the declared logical context for another import.

This clearing reduces casual on-screen retention; it is not a secure-memory erasure guarantee. Browser process memory, accessibility software, operating-system input services or a privileged local actor remain outside this proof. Redaction remains pattern based and can miss sensitive material. Only controlled synthetic evidence is appropriate until the `IL-3.6` cross-surface privacy proof.

The lineage route is read-only for structured claims and supersession links. It neither extracts claims from imported prose nor supplies claim/successor creation controls. Rendering an existing claim or `SUPERSEDES` link communicates persisted attribution and history only. It does not resolve contradictions, establish semantic applicability overlap, select a winner or increase readiness.

The reconciliation route is likewise a presentation and explicit-input surface, not another domain authority. Its loading, empty, error, integrity and partial-page states do not substitute cached/sample conclusions. Keyboard-accessible labels and disclosures make state and provenance available without color-only meaning, but accessibility does not increase evidentiary authority.

## Cross-surface privacy evidence

`EV-PRIVACY` uses the production preparation pipeline, SQLite repositories, safe logger and Fastify injection boundary. It verifies the complete current named redaction corpus and scans fixed raw sentinels across successful and rejected requests, logs, API responses, the closed database and SQLite sidecars in both UTF-8 and UTF-16LE encodings. The machine-readable report contains no raw sentinel or rejected private locator.

Transfer fixtures are verification-only projections of the already-redacted API resource. They model the minimum shape that a future export or AI evidence pack might consume so accidental reuse of raw request content is detectable now. They are generated only inside the temporary proof directory, are not product contracts and create no endpoint. No fixture was transmitted to a provider, no provider credential was read and the proof requires zero fetch calls.

A passing sentinel proof does not prove that every possible secret pattern is recognized. It establishes absence only for the controlled corpus and current surfaces exercised by the generator. Split, encoded, transformed, novel or context-specific secrets can evade pattern redaction; local browser/process memory and a privileged database actor remain outside this proof. Future export and provider implementations must repeat the privacy gate against their real production serializers and transport adapters rather than citing these provisional fixtures as sufficient.

## Twin vocabulary trust semantics

`IL-4.1` makes the allowed generalized Twin record language explicit without creating Twin facts. A node or relationship is accepted only when it uses the frozen version/type vocabulary, a canonical stable identity, a positive revision and complete mission-scoped attribution. Relationships additionally bind exact endpoint revisions and reject when either endpoint or the relationship metadata crosses Project or Mission scope.

The metadata distinguishes recorded time from optional effective time and requires an explicit source revision or content digest. A later timestamp is not proof that a value is fresher, more applicable or more correct. `FACT` and `INFERENCE` remain declared epistemic categories, not measured truth probabilities.

Optional node confidence is restricted to `EXTRACTION`; optional relationship confidence is restricted to `RELATIONSHIP_MATCH`. Both use integer quality basis points and the fixed semantics `QUALITY_ESTIMATE_NOT_TRUTH_PROBABILITY`. The serializer rejects alternate confidence meanings and unknown fields rather than accepting a generic probability. Omitting confidence communicates no score; it does not imply certainty.

Canonical round-trip equality proves only that the complete versioned representation was preserved. Same scope does not establish a semantically valid node-type pair, and a syntactically valid relationship does not prove the relation exists in reality. `IL-4.1` has no graph persistence, entity projection, invalidation, traversal, conflict winner, readiness weight or UI/API exposure.

`IL-4.2` projects validated domain entities under deterministic identities and explicit source bindings. Its dependency graph records structural derivation only. When a member digest changes or disappears, the successor projection lists exactly the prior direct/transitive dependents reachable through authored bindings. “Invalidated” means those derived members require reassessment; it does not mean their historical content was erased, false or malicious.

Same-input equality means equality under the exact versioned source digests and projection rules. It does not prove source completeness or authenticity. A validation result is tied to attributed evidence and one Git snapshot, but `PASSED` remains a reported outcome rather than a release decision. Earlier projections persist immutably and are selected by exact positive revision; visible node/relationship paths are citations from verified metadata, not proof that a statement is correct.

`IL-4.3` materialization is an explicit local action over the currently persisted source records. Exact replay reuses the existing revision. A changed source set can append a successor only against the latest verified predecessor. The accessible list displays the selected immutable revision, exact counts/digest, attributed node path, source binding and relationship endpoint revisions. A partial bounded page is labeled partial rather than silently presented as the complete graph.

Stored projection corruption, envelope mismatch, invalid predecessor, endpoint substitution or malformed browser payload fails closed. The API returns a stable `INTEGRITY_ERROR` without raw stored content; the browser replaces the list with an integrity warning and shows no partial Twin. This detects violations of current invariants, not every possible database or host compromise.

`IL-4.4` source scanning is a bounded observation step, not semantic understanding. Demo Run 2 binds the production projection path to an immutable snapshot and reads only supported UTF-8 blobs from that exact commit; uncommitted worktree content is excluded by construction. The returned internal bundle says only which allowed committed files were read, their relative paths, sizes and content digests, plus honest skip counts. A file being present, supported or digest-stable does not make its contents correct, executed, reachable or relevant. Unsupported extensions are visibly counted, not treated as analyzed; `node_modules`, submodule commits and sensitive/private-configuration name patterns are excluded before blob acquisition.

Any traversal shape, unsafe tree mode, canonical registration/allowlist escape, limit breach, timeout, invalid encoding or before/after repository-state change aborts the whole scan with no partial result. Fixed `ls-tree`/`cat-file` operations disable replacement objects and accept no caller-selected ref or object. Repository source is not logged, persisted, sent over HTTP or transferred to a provider.

`IL-4.5` adds a second, separately versioned static interpretation. It rechecks the entire scan envelope, honest skip totals and every file digest before parsing, then emits a source-free canonical result with the exact coverage summary, fixed `STATIC_SYNTAX_ONLY` authority and `NOT_OBSERVED` runtime semantics. Its imports/exports mean only that corresponding declarations occur in parsed syntax. A recognized contract is only an exported interface, type alias or enum. A recognized route is only one conservative direct Fastify call shape with a literal path; it does not prove registration, reachability, prefix composition, middleware, handler success or deployed behavior. A test association means only that a recognized test path statically imports one scanned target; it does not prove execution, coverage or passing status.

TypeScript syntax recovery can preserve safe records from a malformed file, but any diagnostic makes the result `PARTIAL`. Diagnostics and extraction work are bounded independently. Dynamic imports, `require`, computed paths, wrappers, runtime dependency discovery, compiler plugins and candidate package execution are deliberately ignored. Package script commands are never returned; unsafe dependency ranges are omitted. Deterministic order and digest equality prove equality only under this extraction version and exact scanned bytes.

`IL-4.6` persists only a source-free projection after a second Git capture matches the pre-scan Project, Mission, registration, head and status observation. The projection binds to that exact second snapshot by stable identity and canonical snapshot digest. Every inferred asset is explicitly `STATIC_INFERENCE`/`AVAILABLE`, becomes an `INFERENCE`-labeled `SoftwareAsset`, and is `BOUND_TO` the snapshot. This establishes reproducible provenance, not runtime truth, deployment reachability, validation or readiness.

The declared path is intentionally non-equivalent. Only an explicitly supplied manifest whose version and ownership are `intelliloop-declared-code-map.v1` and `INTELLILOOP_CONTROLLED_FIXTURE_ONLY` can be used, and only after an allowlisted bounded scanner/parser safe failure. It is recorded as `DECLARED_INTELLILOOP_FIXTURE`, `UNAVAILABLE_SAFE_FAILURE` and `UNAVAILABLE`; Twin origin/method are `SYNTHETIC_FIXTURE` and `DECLARED_FIXTURE_MANIFEST`. Evidence-kind-specific member identities prevent the same logical key from silently aliasing an inferred asset. Repository movement, scope/registration errors, malformed inputs, database failures and integrity failures do not fall back.

## Evidence-pack trust boundary

`IL-6.1` compiles a deterministic redacted context from already verified structures. `IL-6.4` integration versions its selection as `evidence-pack-compiler-policy.v2`: complete exact source inputs are verified first, then only fixed-question-relevant projections are retained so the frozen 12,000-unit ceiling is preserved. A successful pack means only that the question and selected canonical items passed the binding, minimization, second-pass-redaction, ordering, size and digest rules. It does not mean the question is answerable, the evidence is true or complete, a conflict has a winner, a gap is waived, or release is ready.

The compiler includes compact source attribution and bounded claim excerpts rather than full prepared source content. That selection is a frozen structural policy, not model relevance ranking. The secret/private-path corpus is defense in depth and cannot guarantee that arbitrary sensitive material is absent. No pack may be treated as approved for external transfer merely because compilation succeeded.

Allowlisted citation IDs are stable locators for exact pack items. Resolution proves only locator/item/digest coherence inside one verified pack. A citation does not elevate a `FACT` label, inference, static code relationship, validation status, finding or impact path into truth or readiness authority.

## Cited-question presentation boundary

`IL-6.4` exposes one local Mission route and browser view without adding a persistence or external-transfer boundary. The request can select only one of the six fixed questions. The server owns Project/Mission scope, latest assessment selection, source reconstruction, pack construction and request identity; a caller cannot supply a pack, citation allowlist, provider, model, readiness field or precomputed answer.

Every valid response retains the digest-verified `AI_OFF` explanation and says `externalCallMade: false`, `canonicalStateChanged: false`, `ADVISORY_ONLY_NO_RELEASE_DECISION` and `transferStatus: NOT_SENT`. The exact canonical redacted pack is shown locally so a reviewer can inspect what a future provider path might receive. This disclosure is not consent, transmission, persistence or proof that redaction is sufficient for external use.

The web client verifies the closed response, pack/question digests, citation details and every rendered citation before displaying any answer. Provider-disabled/unavailable/rejected outcomes cannot suppress the offline answer. An unknown citation, identity mismatch, private absolute path or readiness-shaped success field rejects the whole response and removes prior content. A controlled mock advisory appears only after provider-adapter validation and remains visibly non-authoritative; production wiring injects no mock/live transport. No explanation action mutates findings, revisions or later readiness state.

## Personal-provider checkpoint boundary

`IL-6.5` is a course-correction decision, not a live integration story. Its versioned checkpoint requires the passing deterministic-core, citation and privacy reports; the six exact approved questions; locally available redacted previews; `NOT_SENT` transfer state; input within the frozen 12,000-unit ceiling; and disabled production-provider outcome.

Because no new explicit transfer authorization or runtime-only credential was supplied, the live branch is `NOT_RUN_NOT_AUTHORIZED`. The checkpoint records `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE` and a canonical digest. It records grounding, citation validity, usefulness, latency, token usage and comparison with the deterministic answer as `NOT_MEASURED`. A mock result, deterministic citation count or local timing cannot be relabeled as a personal-provider evaluation.

The checkpoint accepts no credential value or provider body, imports no environment/network API and adds no product route, persistence or feature flag. Its passing state means the product can continue safely offline; it does not mean OpenAI was evaluated, external transfer is safe, or a provider is approved for the finale.

## Candidate-readiness trust boundary

`IL-7.1` makes the readiness rule inspectable without creating an authoritative readiness record. `readiness.v1` evaluates nine fixed obligations against exact scope, aggregate integrity, the current snapshot, active findings and impact gaps, declared required validations, explicit human review, dependency freshness, input provenance/completeness and persistence assertions. It produces ordered blocker codes and canonical policy/input/result digests. Determinism and digest equality prove only that the same versioned rule saw the same supplied inputs.

Candidate `READY` means that all nine obligations passed within that one verified evaluation. It is not a release approval, persisted assessment, waiver, deployment authorization or Release Passport. The result says so structurally: it is `NOT_PERSISTED`, `EVALUATION_ONLY_UNTIL_PERSISTED`, with every release/Passport/deployment authority flag false and AI authority `NONE`. No explanation, provider response or synthetic suggestion is an evaluator input.

The evaluator fails closed. Sample/placeholder and AI-advisory authority, controlled fallback, incomplete inputs, unpersisted reconciliation/validation/review records, missing or non-passing validation, missing/non-human review and unknown freshness cannot yield candidate `READY`. Attributed persisted `SYNTHETIC_FIXTURE` validation can pass the structural validation obligation for a controlled offline scenario, but it remains visibly synthetic and does not claim production validity. `SAMPLE_PLACEHOLDER` can never make readiness green.

`STALE` applies to the evaluated current binding when its snapshot changed, validation or review evidence targets an earlier binding, or an exact dependency changed. A `STALE` finding retained inside a newly current reconciliation revision describes its predecessor and does not recursively stale the corrected successor. Open conflict, ambiguity, missing-support and impact-gap counts still block. Unknown dependency state blocks rather than guessing staleness.

`IL-7.2` removes caller assertions from the persistence path. The internal service reconstructs exact reconciliation, current-snapshot, validation, review, scope, persistence and freshness inputs from verified repositories, evaluates them, then appends `release-assessment.v1` under an immediate transaction that rechecks every current dependency and predecessor. A stored assessment is the deterministic readiness record for those exact inputs; it is still not a release approval, waiver, Passport or deployment authorization.

`IL-7.3` creates an unsigned `release-passport.v1` only from one repository-hydrated assessment. It reproduces the exact assessed status and supporting obligation/blocker/finding/validation/review/citation structure and adds its own digest; it performs no readiness calculation. Later dependency change affects only `release-passport-state.v1`, which references the assessment owner's derived state and fixes `passportChanged` to false. A Passport is not an approval, waiver, certificate, signed attestation or deployment authorization.

Historical state is derived rather than mutated. `release-assessment-state.v1` compares the stored evaluation with a newly repository-derived evaluation. Any exact reconciliation, snapshot, finding-count, validation catalog/evidence, review, integrity, provenance, persistence or freshness/input-fingerprint difference makes the historical view `STALE`. The original assessment bytes, evaluated status and digest remain unchanged. Exact replay returns the existing revision; changed input may append a successor assessment.

ValidationResult and explicit review writers are currently in-process persistence seams, not HTTP/browser intake. `AI_ADVISORY` review remains recordable for attribution but fails the human-review obligation; it cannot create `READY`. `IL-7.3` may project a Passport only from exactly one persisted assessment, and `IL-7.4` exposes only repository-derived creation and supported retrieval/presentation.

`IL-7.5` proves these boundaries together rather than adding authority. Its controlled matrix records zero false `READY`, exact Passport equality, database close/reopen recovery, Project/Mission isolation, canonical-corruption rejection and no provider/network call. This is deterministic fixture conformance, not evidence authenticity, production safety or a release guarantee. The canonical operator explanation is the [Readiness and Release Passport guide](READINESS_AND_PASSPORT_GUIDE.md).

## Atomicity and current exclusions

Preparation remains a pure all-or-nothing domain operation. Source persistence either appends the source/event pair, returns the exact prior pair or changes nothing. Claim persistence either appends one claim and optional successor link, returns the exact prior intake or changes nothing. Runtime-summary persistence either appends/reuses the exact source/event and inserts one linked immutable observation or changes nothing. Reconciliation/impact persistence either returns the exact same-input revision, atomically appends one exact successor or changes nothing. ReleaseAssessment persistence either returns the exact same-input assessment, atomically appends one exact successor after rechecking all dependencies, or changes nothing.

`IL-3.4` exposes those operations through strict mission-scoped JSON routes. Preview is stateless. Commit independently prepares the supplied bytes before persistence and never trusts a caller-provided prepared representation. Project scope, IDs, recorded time and fixed extraction methods remain server-owned. Responses expose the redacted normalized representation needed for review, never the pre-redaction request bytes; stable errors and structured logs omit submitted content and raw paths. Retrieval remains bounded and scoped, and a correction requires an explicit predecessor in the route.

The API and browser expose the attributed projected Twin, deterministic findings/paths, strict cited explanations and repository-derived readiness/Passport history but do not choose a winning claim or approve a release. `IL-4.7` exposes source-free code-map summaries/assets/edges and the authoritative accessible list. The normal browser path requests `STATIC_INFERENCE` only; it never requests `DECLARED_INTELLILOOP_FIXTURE`. Relative paths, identifiers and literal routes may still reveal sensitive structure even without source bodies, so only controlled repositories belong in this boundary. `EV-RECONCILE`, `EV-CITATIONS` and `EV-OPENAI-EVAL` use no credential, external call, candidate repository or product-authored repository write. The adapter defaults disabled, has no live transport and always retains the `AI_OFF` answer. There is still no browser claim/observation/validation/review authoring, live telemetry, general product export, Passport signing or external provider call. The Passport download is a fixed structural local projection only. `G3_DETERMINISTIC_CORE_PROVEN` is closed and `G4_OPENAI_COURSE_CORRECTION` is satisfied through the frozen offline decision; neither grants release authority.

`IL-6.7` extends the same cited screen with deterministic edge-case ideas. A suggestion is accepted for display only when its version, policy/digest binding, kind, text bounds, citation subset and three warning labels validate. It is grounded in why a case is worth testing, not evidence that the case occurred or that its expected observation passed. Its authority flags are permanently false for canonical state, finding mutation, readiness and Release Passport.

External AI remains off. Official Avishkar rules remain unverified, so this model is project documentation and not an eligibility, privacy, security or compliance certification.
