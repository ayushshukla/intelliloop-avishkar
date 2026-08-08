# IL-4.4 Code-Map Filesystem Safety Test Evidence

**Story:** `IL-4.4` - Code-map filesystem safety and limits  
**Capability:** `ENH-01`  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Execution boundary:** Mission-scoped registered-root validation and transient read-only source acquisition

## Implemented result

The API workspace now contains a production `CodeMapScanner` that resolves one current Mission to its exact registered read-only repository, revalidates the canonical Git root, walks only contained non-symlink entries and returns a transient `code-map-source-scan.v1` bundle. Accepted files retain repository-relative path, supported extension, exact UTF-8 byte length, SHA-256 content digest and text. Unsupported files and excluded directories are reported honestly.

The scanner does not parse or infer code structure yet. It registers no route, writes no database row, logs no source, invokes no process, installs no dependency and creates no Twin or readiness state.

## Frozen limits

| Boundary | Enforced value |
|---|---:|
| Accepted extensions | `.ts`, `.tsx`, `.js`, `.jsx`, `.json` |
| Encountered regular files | 2,000 maximum, including unsupported extensions |
| Accepted bytes per file | 256 KiB maximum |
| Aggregate accepted bytes | 5 MiB maximum |
| Whole scan time | 5,000 monotonic milliseconds maximum |
| Never traversed | `.git`, `node_modules` |

## Acceptance evidence

| Acceptance | Observed result | Status |
|---|---|---|
| Canonical registered root | Current Mission resolves to one Project registration; root and direct Git marker are revalidated before scanning | `PASS` |
| Traversal rejection | Injected `..` entry is rejected before path resolution/read; unsafe relative names cannot enter a source bundle | `PASS` |
| Symlink escape | A real Windows directory junction inside the repository aborts the scan without reading its target | `PASS` |
| Root substitution | Replacing the registered root with a junction after registration maps to stable `CODE_MAP_ROOT_UNSAFE` | `PASS` |
| Extension allowlist | Only the five frozen text extensions return content; unsupported files produce bounded extension counts | `PASS` |
| File limit | The 2,001st encountered regular file aborts with `CODE_MAP_FILE_LIMIT_EXCEEDED` and no partial result | `PASS` |
| Byte limits | 256 KiB plus one byte and the first byte beyond 5 MiB aggregate abort with distinct stable failures | `PASS` |
| Timeout | The exact five-second monotonic boundary aborts with `CODE_MAP_SCAN_TIMEOUT` | `PASS` |
| Encoding/read integrity | Invalid UTF-8, special entries, unstable size/identity/time or bounded-read mismatch fail closed | `PASS` |
| Honest exclusions | `.git`, `node_modules`, `.md`, `.bin` and no-extension fixtures are absent from returned files and present in skip accounting | `PASS` |
| No execution/install | Production source imports no process or write API; malicious JS, Git hook and `postinstall` fixtures remain inert text | `PASS` |
| Repository unchanged | Complete sorted relative path plus content digest is identical before and after two real scans | `PASS` |
| Scope | Missing/archived Mission and absent registration return stable non-revealing errors | `PASS` |

## Verification record

| Command | Exit | Observed result |
|---|---:|---|
| Focused code-map scanner Vitest run | 0 | 1 file, 10 filesystem-safety tests passed |
| `npm.cmd run typecheck -w @intelliloop/api` | 0 | Strict API TypeScript passed |
| `npm.cmd run check` | 0 | 178 unit/component and 105 API tests passed; all workspace typechecks/builds passed; Vite transformed 65 modules; repository-safety/privacy proofs regenerated; 51 Markdown files had zero broken links |
| `npm.cmd run test:e2e` | 0 | 6 existing Chromium workflows passed; IL-4.4 intentionally adds no route or UI |
| `npm.cmd audit --omit=dev --json` | 0 | 0 vulnerabilities across 104 production dependencies |

## Manual-review handoff

IL-4.4 is infrastructure for the next parser story, not an operator screen. A developer can run the focused test and inspect the returned relative source bundle against the controlled fixture. The judge-facing code-map path remains scheduled for `IL-4.7`, after `IL-4.5` static extraction and `IL-4.6` snapshot-bound persistence/Twin projection.

Source acquisition alone proves neither runtime behavior nor semantic relevance. Unsupported languages are skipped, not understood. No source text is persisted, returned over HTTP or transferred externally. Official Avishkar rules remain unverified; this record does not claim competition compliance.
