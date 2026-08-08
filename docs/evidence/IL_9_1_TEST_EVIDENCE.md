# IL-9.1 Clean Install and Platform Verification Evidence

**Story:** `IL-9.1`  
**Status:** `PASS_WINDOWS_LINUX_CI_CONFIGURED`  
**Checkpoint:** Phase 9 release verification started  
**Evidence date:** 2026-08-06

## Acceptance result

| Acceptance criterion | Reproducible evidence | Result |
|---|---|---|
| Pinned Node and npm verify | Node `22.22.0`, npm `10.9.4`, `.node-version`, `packageManager`, engine fields and lockfile root pins agree | `PASS` |
| Lockfile install passes | `npm.cmd ci` installed 219 packages and left the lockfile SHA-256 unchanged | `PASS` |
| All required layers pass | 20/20 commands passed: typecheck, 380 unit/component tests, 161 API/integration tests, production build, 17 Chromium scenarios and every generated safety/demo/documentation gate | `PASS` |
| Artifact hashes are recorded | `EV-RELEASE` records the source-tree digest plus 17 pinned configuration, build, demo and safety artifacts | `PASS` |
| Supported-platform disposition is explicit | Windows 11 was observed directly; pinned Windows/Linux GitHub Actions verification is checked in; Linux was not available locally and is not misreported as executed | `PASS_WITH_DISCLOSED_LIMIT` |

## Reproduction

Run the complete clean verification from the repository root:

```powershell
npm.cmd run evidence:release-platform
```

Verify the existing machine-readable record and current hashes without rerunning every layer:

```powershell
npm.cmd run check:release-platform
```

The generated [EV-RELEASE](EV_RELEASE.json) contains command durations, observed counts, environment pins, lockfile equality, source/artifact hashes and the platform matrix. The checked-in [release platform workflow](../../.github/workflows/release-platform-verification.yml) runs the same verifier on `windows-2025` and `ubuntu-24.04` with Node `22.22.0`, npm `10.9.4` and pinned Chromium.

## Corrective finding

The first aggregate run found one obsolete web assertion that still expected the pre-implementation `Not available` stage label. The product already exposed the completed mission flow truthfully. The test was corrected to assert the current scope-gated `Select a Mission`, `Competition demo` and `Golden workflow` labels; the unchanged product then passed 380/380 unit/component tests and the complete release run.

## Dependency and platform limits

`npm ci` reported four development-tree audit advisories (two moderate, one high and one critical). They were not force-upgraded or waived in this story: `IL-9.2` owned the complete direct/transitive dependency, license, provenance, similarity, secret and security audit. The subsequent `IL-9.2` remediation upgraded the exact affected toolchain and reduced both the full and production audit results to zero; this paragraph remains the historical `IL-9.1` observation.

This Windows observation does not stand in for a Linux result. The repository now has a deterministic Linux runner path, but no WSL, Linux host or connected remote runner was available for this local execution. CI must produce its own Linux `EV-RELEASE` artifact before a directly observed cross-platform claim is made.

A passing prototype verifier is not production certification, competition-rules compliance, release approval, signing or deployment authorization.

`IL-9.1_COMPLETE_RELEASE_VERIFICATION_WINDOWS_PASS_LINUX_CI_CONFIGURED`
