# IL-3.1 Test Evidence

**Story:** `IL-3.1` - Bounded import, redaction and digest pipeline  
**Status:** `PASS`  
**Evidence date:** 2026-08-04  
**Platform:** Windows 11  
**Execution authority:** Frozen R3 backlog entry; no separate coding-prompt file exists

This record covers only the pure pre-persistence domain pipeline. It adds no evidence database record, API route, browser workflow, claim authority, readiness behavior or external provider call.

## Implemented boundary

`prepareEvidenceImport` accepts typed Markdown, text or JSON bytes, enforces conservative byte/structure limits, requires strict UTF-8, normalizes line endings and Unicode, applies deterministic secret-pattern redaction and returns a frozen redacted representation plus a format/version-framed digest. Raw input is not returned or digested.

The 256 KiB input/output ceiling, JSON depth 64, JSON node limit 10,000 and binary-signature rejection set are authored conservative implementation choices. They are not represented as official competition requirements.

## Acceptance evidence

| Requirement | Executable proof |
|---|---|
| Allowed/denied formats | Declared Markdown/text/JSON succeed; unsupported declarations and obvious PDF/ZIP/PNG/JPEG/gzip signatures reject |
| Malformed/oversize rejection | Invalid UTF-8, controls, empty input, malformed/ambiguous/scalar JSON, depth/node overflow and exact size boundary are tested |
| Secret-pattern corpus | Ten text categories plus secret-bearing JSON keys are replaced; raw sentinels are absent from output and errors |
| Stable digest | A fixed SHA-256 vector is asserted; equivalent normalized JSON and text variants converge, while declared formats remain framed |
| Atomic failure | Failed calls return no prepared result, mutate no caller bytes and expose no input content in stable errors |
| Dependency boundary | The implementation remains in the pure domain package and the forbidden-import test passes |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| `npm.cmd run typecheck -w @intelliloop/domain` | 0 | Strict domain typecheck passed |
| Focused Vitest run for evidence import and domain boundaries | 0 | 2 files and 28 tests passed |
| `npm.cmd run build -w @intelliloop/domain` | 0 | Domain ESM/type build passed |
| `npm.cmd run check` | 0 | Five workspaces typechecked; 116 unit/component and 61 API tests passed; all builds, regenerated repository-safety evidence and 40-file documentation gate passed |
| `npm.cmd run build` (inside aggregate) | 0 | All workspaces built; Vite transformed 52 modules |
| `npm.cmd run test:e2e` | 0 | 3 Chromium workflows passed at 1366 x 768, including persisted path-safe Project flow |
| `npm.cmd audit --omit=dev --json` | 0 | 0 production vulnerabilities across 104 reported production dependencies |

## Trust and privacy interpretation

- Imported material is evidence, not automatically true and not readiness authority.
- Digest equality proves only equality under `evidence-normalization.v1`; it is not provenance, approval or quality evidence.
- Pattern redaction can have false positives and false negatives; the cross-surface `EV-PRIVACY` proof remains owned by `IL-3.6`.
- No raw-input digest is retained because it could preserve a dictionary-checkable representation of a secret-bearing input.
- External AI is off and no evidence leaves the process.
- Official Avishkar requirements remain unverified; this is bounded implementation evidence, not a compliance certification.

## Next boundary

`IL-3.2` is next and owns evidence persistence, attribution, idempotency and timeline behavior. It has not started.
