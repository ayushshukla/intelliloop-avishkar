# IL-9.2 Dependency, Provenance, Similarity, Secrets and Security Audit

**Story:** `IL-9.2`  
**Status:** `PASS`  
**Checkpoint:** Release security audit complete  
**Evidence date:** 2026-08-06

## Acceptance result

| Acceptance criterion | Reproducible evidence | Result |
|---|---|---|
| Direct/transitive license report | Exact lockfile inventory covers 222 dependency instances and 220 unique package/version pairs, including 54 optional cross-platform instances; zero unknown or unapproved licenses | `PASS` |
| Provenance ledger complete | Frozen source-independent decision remains zero reuse/zero adaptation; release sanitization preserves original and sanitized R2 artifact hashes | `PASS` |
| Similarity review | 237 implementation files scanned for known candidate markers and third-party ownership headers; zero findings, with bounded-review limitation disclosed | `PASS_BOUNDED_REVIEW` |
| Secret/private-content scan | 372 candidate files and 364 text files scanned; synthetic negative fixtures explicitly allowlisted; zero non-fixture secret, private-path or prohibited-file findings | `PASS` |
| Network and mutation audit | Fresh `EV-PRIVACY` and `EV-REPO-SAFETY` pass with zero product provider calls and zero registered-repository writes | `PASS` |
| Dependency advisory remediation | Vite `8.2.1`, Vitest `4.1.10` and `@vitejs/plugin-react` `6.0.5`; full and production npm audits each report zero vulnerabilities | `PASS` |

## Remediation verification

The prior development-tree findings were not waived. The exact coordinated toolchain upgrade was verified with:

- strict typecheck across all five workspaces;
- 380/380 unit/component tests across 43 files;
- 161/161 API/integration tests across 32 files;
- production package/API/web build; and
- 17/17 isolated Chromium scenarios covering the full golden workflow.

The first sandboxed unit invocation stopped before collection at the known Windows child-process permission boundary. The unchanged authorized run collected and passed the complete suite; no assertion or compatibility failure was suppressed.

## Reproduction

Refresh time-sensitive registry advisory and license metadata plus local safety proof:

```powershell
npm.cmd run evidence:release-security
```

Verify the checked-in inventory, candidate digest, scans, provenance and safety evidence without a registry refresh:

```powershell
npm.cmd run check:release-security
```

The generated [EV-SECURITY-AUDIT](EV_SECURITY_AUDIT.json), [third-party inventory](../governance/THIRD_PARTY_INVENTORY.json), [notices](../governance/THIRD_PARTY_NOTICES.md) and [similarity review](../governance/SOURCE_SIMILARITY_REVIEW.md) form the release audit record.

## Limits

Advisory data is time-sensitive and must be refreshed at final freeze. Pattern scans cannot prove absence of every transformed secret. The bounded similarity review is not a universal plagiarism finding. This is not a penetration test, OS sandbox certification, legal opinion, competition-rules approval or production authorization.

`IL-9.2_COMPLETE_RELEASE_SECURITY_AUDIT_PASS`
