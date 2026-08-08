# AI-Use Disclosure

**Audience:** Reviewers, contributors and submission maintainers  
**Status:** `FINALIZED_IL_6_6`  
**Product provider use:** none  
**Evidence date:** 2026-08-06

## Three distinct AI contexts

| Context | What occurred | What did not occur |
|---|---|---|
| AI-assisted development | OpenAI Codex assisted with planning, implementation, tests and professional documentation under user-directed story boundaries. | Generated work was not accepted as proof; local tests, builds, evidence generators and human review remain required. |
| Current product runtime | IntelliLoop produces deterministic reconciliation, impact, redacted packs and cited `AI_OFF` explanations locally. | Product provider use: none. No model call, credential read, evidence transfer, prompt/response persistence or AI readiness authority exists. |
| Personal OpenAI checkpoint | Entry evidence and six exact local previews were verified, then the authorized offline branch recorded one digest-bound decision. | No personal OpenAI call was made. No provider performance was measured, and no signed-in browser session was used as a credential. |

The controlling finale posture is `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`. This separates truthful AI-assisted software development from product runtime AI use and from a conditional provider experiment that did not run.

## Development assistance

OpenAI Codex assisted with planning reconciliation, backlog creation, submission-baseline reconciliation and the independently authored implementation and documentation through story `IL-7.4`. Human/user direction established the project goals and authorized each bounded task. Generated source and documentation are subject to local typechecking, tests, builds, browser verification and provenance controls rather than being accepted as correct by generation alone.

No candidate application source was used as an implementation template during these stories.

## Product runtime

The current product runtime does not call OpenAI or any other AI provider. It:

- reads no AI credential;
- exposes no provider configuration;
- sends no evidence externally;
- performs evidence preparation, attributed local persistence, evidence/claim/historical-observation routing, Twin/code-map projection and reconciliation/impact evaluation deterministically without a provider;
- stores no prompts or responses; and
- visibly reports `AI off`.

`IL-3.6` creates a temporary verification-only AI-pack projection from an already-redacted API resource. It is not a product provider payload, is marked `NOT_TRANSMITTED`, requires no credential and is deleted after a zero-fetch proof. No model or provider evaluates it.

`IL-3.7` runtime-observation summaries are caller-supplied historical JSON evidence. No model extracts, interprets, validates or scores them, and no connector transmits or retrieves them.

`IL-4.1` defines optional Twin confidence only as extraction or relationship-match quality under the fixed not-truth-probability semantics. No model produces that score, and neither vocabulary nor projection creates AI or readiness authority.

`IL-4.2` projection IDs, revisions, dependency invalidations and canonical digests are deterministic domain computations. No model creates edges, chooses dependents, interprets validation or changes canonical state.

`IL-4.3` persists and lists those deterministic projections through local SQLite, Fastify and React code. Materialization reads only existing local records, accepts no prompt or graph body, invokes no provider and gives no AI system authority over revisions, path citations, relationships or integrity decisions.

`IL-4.4` code-map acquisition is deterministic local filesystem code. It scans only the registered read-only root under fixed extension/file/byte/time limits, executes no repository content, installs nothing, calls no model and produces no semantic, truth or readiness claim.

`IL-4.5` extraction is deterministic compiler-parser/JSON-parser code over that bounded in-memory bundle. It calls no model, compiler plugin, module loader or provider and labels every result syntax-only with runtime behavior unobserved. Static declarations and associations are not AI conclusions, truth scores or readiness evidence.

`IL-4.6` binds source-free inferred output to an exact post-extraction Git snapshot and permits a non-equivalent declared IntelliLoop fixture only after explicit per-run consent and an allowlisted safe failure. `IL-4.7` exposes those deterministic records through strict local APIs and an accessible attributed list. Neither story invokes a model or grants static inference truth/readiness authority.

`IL-5.1` implements exact deterministic claim comparison eligibility, applicability overlap and conservative value relations under `reconciliation-rules.v1`. It uses no fuzzy matching, embedding or model output. It emits no finding, winner, readiness state or provider payload.

`IL-5.2` implements deterministic active-claim selection and open conflict/ambiguity finding values under `reconciliation-decision-policy.v1`. Only validated explicit supersession has deactivation authority; timestamps, source priority, confidence and AI have none. The implementation is ordinary TypeScript domain logic, performs no model/provider call and gives no finding readiness authority.

`IL-5.3` implements deterministic stale/missing-support reassessment under `reconciliation-support-policy.v1`. Requirements must be explicitly declared, support matches exact source/validation identities, and predecessor staleness requires an exact dependency diff. AI has no authority to infer obligations, waive absence, reinterpret a failed validation, select truth or decide readiness. The implementation is ordinary TypeScript domain logic and performs no model/provider call.

`IL-5.4` implements bounded deterministic impact traversal and cited `IMPACT_GAP` projection. Roots, critical assets, validation keys and basis citations are explicit inputs; only exact persisted Twin/code-map relationships under the frozen traversal policy can form a path. AI-advisory Twin members are rejected from authoritative roots/citations, and declared unavailable code-map fallback cannot satisfy implementation support. No model generates a path or finding.

`IL-5.5` persists one canonical combined reassessment/impact history and exposes it through strict localhost APIs. The execution service reconstructs exact persisted Twin-bound sources and rejects unavailable validation state instead of asking a model or accepting caller-authored results. Same-input replay, predecessor lineage, integrity checks, finding counts and member paging are deterministic.

`IL-5.6` presents those deterministic records in the browser and accepts only explicit operator declarations. It does not use a model to discover a requirement, root, asset, finding, explanation or correction. Strict decoders and cross-resource checks fail closed on malformed or inconsistent success payloads. This story adds no prompt, provider payload, credential, external transfer, AI authority, finding mutation or readiness authority.

`IL-6.1` implements a pure deterministic redacted evidence-pack and citation-registry contract. The Mission question and selected canonical payloads receive a second transfer-redaction pass; compact source attribution, claim excerpts, findings and paths are bounded and digest-bound. No model selects content or answers the question, and no pack endpoint, credential lookup, network transfer or readiness field exists. The new product contract is distinct from the historical `IL-3.6` verification-only AI-pack fixture.

`IL-6.2` renders six fixed questions deterministically from that exact pack. It labels itself `DETERMINISTIC_EXPLANATION` / `AI_OFF`, keeps facts and inferences separate, cites every statement and never emits readiness authority.

`IL-6.3` implements only the provider-neutral contract and mock validator. Runtime mode defaults disabled; the only executable transport is injected `MOCK_VALIDATION`. The module has no network, environment or credential API, every result records `externalCallMade: false`, and every failure retains the deterministic offline answer. Mock provider/model/usage values are controlled test data, not evidence that a model or external provider ran. Product runtime still stores no provider prompts/responses and performs no live call.

`IL-6.4` exposes those contracts through one strict local API/UI workflow. It uses `evidence-pack-compiler-policy.v2` fixed-question minimization, always renders the deterministic `AI_OFF` answer, displays exact redacted pack JSON as `NOT SENT`, verifies every citation and clears malformed results. Production injects disabled mode only. Controlled mock success/failure in tests is not runtime AI usage, and no explanation or provider body is persisted.

`IL-6.5` completes the personal-provider checkpoint through the authorized offline branch. No personal OpenAI call was made. No ChatGPT session or subscription was treated as an API credential, no credential was requested or inspected, and no evidence pack left the machine. The digest-bound decision is `KEEP_PROVIDER_OPTIONAL_AND_DEMO_OFFLINE`; every provider quality, latency and token metric is `NOT_MEASURED` rather than inferred from deterministic or mock evidence.

`IL-6.6` finalizes the reviewer-facing transfer inventory, authority matrix and course-correction governance. `IL-6.7` adds deterministic product-generated synthetic test ideas from cited redacted findings/paths. These are rule-based output, not an OpenAI/provider response, and are visibly marked `SYNTHETIC`, `ADVISORY_ONLY` and `NOT_EVIDENCE`. No personal OpenAI call, credential, provider transport, persistence or authority is added.

`IL-7.1` adds an ordinary TypeScript `readiness.v1` rule evaluator. No model creates its obligation catalog, supplies an evaluation at runtime, resolves a blocker or authorizes candidate `READY`. AI-advisory and sample inputs fail closed; the output itself fixes AI authority to `NONE` and release, Passport and deployment authority to false. It remains unpersisted and has no API/UI.

`IL-7.2` adds deterministic repository/service code and SQLite migration `011`; it adds no model invocation. Assessment inputs are reconstructed from stored records, evaluated by `readiness.v1` and written under exact transaction checks. AI cannot record a human review, change a validation outcome, persist an assessment, mark history stale, approve release, create a Passport or deploy. `AI_ADVISORY` review is visibly attributed and fails the human-review obligation.

`IL-7.3` adds deterministic projection/repository/service code and migration `012`; it adds no model invocation. One repository-hydrated assessment is copied into an unsigned canonical Passport with no readiness recomputation. AI cannot select the assessment, alter any projected field, create authority, mark the Passport stale, approve, sign, attest or deploy.

`IL-7.4` transports those deterministic repository-owned resources through strict local API contracts and a browser workspace. The server, not AI or React, derives assessment/Passport state; the browser never evaluates obligations. The structural JSON download and print view invoke no provider, read no credential and transfer nothing externally. AI has no route, input, output or authority in assessment creation, Passport projection, staleness, approval, signing or deployment.

The adapter and checkpoint cannot become readiness authority. Any future attempt to replace the frozen offline decision requires a new explicit checkpoint and safe runtime-only credential handling. Detailed controls are in [AI safety and data transfer](../security/AI_SAFETY_AND_DATA_TRANSFER.md).

## Competition-rule status

Official Avishkar AI-assistance and disclosure rules remain unverified. The user confirms that the innovation brief was submitted, but this ledger is still a conservative transparency record rather than a claim of official compliance. It must be reconciled with any supplied official rules in `IL-9.5` before a finalist/demo package or compliance claim is signed off.
