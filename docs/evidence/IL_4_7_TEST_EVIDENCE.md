# IL-4.7 Twin and Code-Map Review Test Evidence

**Story:** `IL-4.7` - Attributed code map, accessible review and Phase-4 proof  
**Outcome:** A user can map one registered repository, inspect source-free attributed assets and explainable paths beside the Twin, and recover the same revisions after restart  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Required documents:** [DOC-04 Domain model](../architecture/DOMAIN_MODEL.md), [DOC-06 API reference](../api/API_REFERENCE.md), [DOC-15 User guide](../product/USER_GUIDE.md), [DOC-16 Trust model](../product/TRUST_MODEL.md), [DOC-23 Security review](SECURITY_REVIEW.md)

## Delivered boundary

Five strict Mission-scoped code-map routes create and retrieve canonical revision summaries, assets and edges. An ordinary run has no body and can only return `STATIC_INFERENCE`. The configured package-owned manifest is not sufficient to activate fallback: the caller must additionally send the exact `INTELLILOOP_CONTROLLED_FIXTURE` consent value, and the underlying failure must be on the frozen safe-failure allowlist.

The Twin route now includes an accessible code-map workspace. **Map repository and refresh Twin** captures the repository, statically scans and extracts it without execution, persists a source-free revision, then materializes the matching attributed Twin. Assets and explainable dependency paths are text-first and keyboard-operable. No graph is implemented, so graph/list parity is `NOT_APPLICABLE_NO_GRAPH` and the list is the only presentation authority.

The resources may contain logical relative paths, static identifiers, literal route patterns and package specifiers. They never contain source bodies, package commands, absolute repository roots, changed filenames or scanner diagnostics. `STATIC INFERENCE` is explicitly not observed runtime behavior, validation, truth probability or readiness authority. Declared fallback is visibly synthetic, unavailable as inference and never parser-equivalent.

## Acceptance evidence

| Acceptance | Proof |
|---|---|
| `EV-CODEMAP` | Production API generator hashes complete controlled repository bytes before/after, proves normal static inference, rejects fallback without consent and proves distinct explicitly declared fallback |
| `EV-TWIN` | The same run materializes code-map `SoftwareAsset` nodes and relationships, closes/reopens SQLite and verifies exact projection digests |
| Production API | Fastify integration uses committed TypeScript/JSON repositories and strict list/exact/assets/edges contracts with bounded pagination |
| Windows UTF-8 compatibility | A real Git fixture whose TypeScript and JSON files begin with UTF-8 BOM bytes maps successfully while exact byte length/digest validation remains enforced |
| Accessible presentation | Chromium operates the map action by keyboard and reviews evidence labels, attributed assets and explainable dependency paths |
| Honest states | Loading, empty, error, partial, integrity, static-inference and declared-unavailable states are distinct; no `READY` or runtime-behavior claim exists |
| Restart/reload | API proof closes/reopens the database; Chromium reload retrieves the persisted code-map and Twin revisions |
| Graph/list parity | `NOT_APPLICABLE_NO_GRAPH`; no optional visualization exists and the accessible list is authoritative |
| Path/source privacy | API, browser and generated reports omit controlled absolute-root and source-body sentinels |

## Focused verification

```powershell
npx.cmd vitest run apps/web/test/code-map-client.test.tsx --config vitest.unit.config.ts
npx.cmd vitest run apps/api/test/code-map-api.test.ts apps/api/test/code-map-projection-service.test.ts --config vitest.api.config.ts
npm.cmd run evidence:twin-code-map
npm.cmd run test:e2e
```

## Aggregate verification

| Command | Exit | Result |
|---|---:|---|
| `npm.cmd run check` | 0 | Five strict workspace typechecks; 186 unit/component and 122 API tests; production build; all generated evidence; 55 Markdown files with zero broken local targets |
| `npm.cmd run test:e2e` | 0 | 7 Chromium workflows passed, including keyboard code-map run, Twin refresh and reload persistence |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities across 105 production dependencies |

The web production build transformed 69 modules. `EV-REPO-SAFETY`, `EV-PRIVACY`, `EV-TWIN` and `EV-CODEMAP` regenerated successfully. Generated proof is valid only when its command exits zero; hand-editing a report does not establish a pass.

The final operator smoke test also used the real localhost UI against a separately created Windows/Powershell-authored Git repository. Registration, code-map creation, automatic Twin refresh, attributed software-asset review and dependency-path review all completed. The test exposed the UTF-8 BOM defect captured above; the regression was fixed before the aggregate gate was rerun.

## Gate decision

`G2_EVIDENCE_TWIN_PROVEN` is `PASS`. This gate proves attributed static structure and reproducible persistence, not semantic reconciliation, runtime correctness, impact analysis or release readiness.
