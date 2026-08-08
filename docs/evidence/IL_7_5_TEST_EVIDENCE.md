# IL-7.5 Readiness and Passport Proof Evidence

**Story:** `IL-7.5`  
**Checkpoint:** `READINESS_PASSPORT_PROOF_READY`  
**Status:** `PASS`  
**Evidence date:** 2026-08-06  
**Boundary:** Controlled local implementation proof; not release approval, signing, deployment authority or production validation

## Result

`IL-7.5` closes the planned cross-layer readiness and Passport proof. The generated [EV-READINESS](EV_READINESS.json) and [EV-PASSPORT](EV_PASSPORT.json) artifacts execute the pure domain contracts, real SQLite repositories, production Fastify routes, browser response decoders and the focused browser presentation. The controlled negative matrix produced zero false `READY` results. The Passport remained an exact canonical projection of one persisted assessment and explicitly retained `signed: false`, `releaseApproval: false`, `deploymentAuthority: false` and `aiAuthority: NONE`.

## Acceptance evidence

| Acceptance | Executable evidence | Result |
|---|---|---|
| Zero controlled false `READY` | One satisfied positive case and 26 controlled non-ready cases execute through the versioned evaluator | `0` false `READY` |
| Exact Passport equality | Projection, canonical equality, digest binding and changed-content rejection tests | `PASS` |
| Full layer path | Domain, SQLite, production routes, browser decoder and browser UI are all exercised | `PASS` |
| Restart | Assessment and Passport resources are read through a newly composed application after database close/reopen | `PASS` |
| Scope isolation | A second Project/Mission cannot read the first Mission's assessment identity | `PASS` |
| Integrity | Canonical assessment and Passport corruption is rejected fail-closed | `PASS` |
| AI off | The real cross-layer path stubs global network access and observes zero calls; source guards reject provider authority | `PASS` |
| Server authority | Mutation bodies remain empty, current state is repository-derived and the browser does not recompute readiness | `PASS` |

## Focused verification

- Workspace TypeScript checks: `PASS`.
- Readiness, Passport and browser-contract unit tests: `45/45`.
- SQLite persistence and production-route integration tests: `10/10`.
- Focused Chromium readiness/Passport workflow: `1/1`.
- Generated story total: `56/56` focused tests.

The proof is reproduced with `npm.cmd run evidence:readiness-passport`. That command builds the required packages/API, runs the focused matrix and regenerates both machine-readable artifacts. It stores relative source names and SHA-256 digests only; no raw test log, credential or private absolute path is written to evidence.

## Honest limits and next authority

- Candidate `READY` means the frozen deterministic obligations are satisfied for the exact persisted inputs. It does not assert that the inputs are true or grant release approval.
- A Passport is an unsigned reproducible local record, not an attestation, certificate or deployment authorization.
- The controlled fixtures and focused browser workflow are implementation proof, not production performance or organizational-impact evidence.
- Phase 8 still owns the final retail fixture, resettable `BLOCKED → READY → STALE` judge walkthrough and release-candidate rerun.

The next dependency-eligible story is `IL-7.6`, readiness, Passport, domain and user documentation.
