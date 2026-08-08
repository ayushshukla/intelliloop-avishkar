# IL-4.5 Bounded TypeScript/JSON Extraction Test Evidence

**Story:** `IL-4.5` - Bounded TypeScript and JSON extraction  
**Capability:** `ENH-01`  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Execution boundary:** Transient, source-free, syntax-only interpretation of one validated `code-map-source-scan.v1` bundle

## Implemented result

The API workspace now contains `CodeMapExtractor` and `code-map-extraction.v1`. The extractor revalidates the scanner envelope, scope, exact limits, normalized repository-relative paths, UTF-8 byte lengths and SHA-256 content digests before parsing. TypeScript 5.9.3 `createSourceFile` provides bounded recovery for `.ts`, `.tsx`, `.js` and `.jsx`; strict `JSON.parse` handles manifests and other JSON.

The source-free result canonically preserves the exact scan/extraction limits and honest supported/skipped coverage, then orders digest-bound files, safe package metadata, static imports/exports, exported interfaces/type aliases/enums, conservatively recognized direct Fastify route shapes and static-import-backed test associations. Every result declares `authority: STATIC_SYNTAX_ONLY` and `runtimeSemantics: NOT_OBSERVED` and carries a canonical SHA-256 extraction digest.

No route, migration, SQLite record, browser control, Twin member, finding or readiness state is added. Candidate code, dependencies, package scripts, compiler plugins, dynamic modules and `require` calls are never executed or resolved as runtime behavior.

## Extraction limits

| Boundary | Enforced value |
|---|---:|
| Input files/bytes | Inherits and revalidates `IL-4.4`: 2,000 files, 256 KiB/file, 5 MiB aggregate |
| Visited TypeScript syntax nodes | 250,000 maximum |
| Emitted records | 20,000 maximum |
| Returned diagnostics | 100 maximum; further diagnostics set `diagnosticsTruncated` |
| Whole extraction time | 5,000 monotonic milliseconds maximum |
| Static name length | 256 characters maximum |
| Static specifier/route length | 512 characters maximum each |

## Acceptance evidence

| Acceptance | Observed result | Status |
|---|---|---|
| Golden parser fixture | Checked-in seven-file TypeScript/JSON fixture yields the exact expected file, manifest, import/export, contract, route and test-association projection | `PASS` |
| Syntax-error partial result | Malformed TypeScript preserves safe recovered declarations; invalid JSON plus syntax diagnostics produce `PARTIAL`, file-level `SYNTAX_ERROR`, a 100-item cap and truncation flag | `PASS` |
| Deterministic ordering | Reversing the validated scan file order produces deep-equal output and the exact same canonical extraction digest | `PASS` |
| Input integrity | Wrong digest, duplicate path, invalid aggregate/skip count and altered scan limit all reject as `CODE_MAP_EXTRACTION_INPUT_INVALID` with no result | `PASS` |
| Conservative routes | Only direct literal-path calls on a statically established Fastify receiver are retained; computed paths, aliases and untyped lookalikes are ignored | `PASS` |
| Evidence-backed tests | A test association exists only for a recognized test path with one static relative import resolving to one scanned non-test file | `PASS` |
| No runtime semantics | Dynamic `import()`, `require`, wrappers, runtime reachability and candidate dependency discovery do not create records; all route/output authority remains `NOT_OBSERVED` | `PASS` |
| Package privacy | Script names may be recorded, command values never are; path/URL-shaped dependency ranges are omitted and visibly marked | `PASS` |
| Non-execution | Production-source guard excludes filesystem, process, write and install primitives; malicious source/global mutation and package commands remain inert | `PASS` |
| Timeout | The exact independent five-second monotonic boundary fails closed with `CODE_MAP_EXTRACTION_TIMEOUT` | `PASS` |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| Focused code-map extractor Vitest run | 0 | 1 file, 7 static-extraction tests passed |
| `npm.cmd run typecheck -w @intelliloop/api` | 0 | Strict API TypeScript passed with TypeScript as an explicit API runtime dependency |
| `npm.cmd run check` | 0 | 178 unit/component and 112 API tests passed; all workspace typechecks/builds passed; Vite transformed 65 modules; repository-safety/privacy proofs regenerated; 52 Markdown files had zero broken links |
| `npm.cmd run test:e2e` | 0 | 6 existing Chromium workflows passed; IL-4.5 intentionally adds no route or UI |
| `npm.cmd audit --omit=dev --json` | 0 | 0 vulnerabilities across 105 production dependencies |

## Manual-review handoff

The checked-in golden fixture and focused test make the extraction boundary reviewable now, but `IL-4.5` is still internal infrastructure. The first judge-facing manual CodeMap checkpoint remains after `IL-4.7`: `IL-4.6` must bind extracted or explicitly declared fallback facts to an exact snapshot and persist/project them without silent equivalence; `IL-4.7` must expose attributed, accessible list-first presentation and the final proof/documentation set.

Static declarations do not prove execution, reachability, coverage, correctness, deployment or readiness. A `PARTIAL` result is visibly incomplete. Unsupported languages and dynamic behavior remain outside the map. Official Avishkar rules remain unverified; this record does not claim competition compliance.
