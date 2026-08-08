# IL-5.4 Test Evidence - Impact Traversal and Validation-Gap Projection

**Story:** `IL-5.4` - Impact traversal and validation-gap projection  
**Status:** `PASS`  
**Evidence date:** 2026-08-05  
**Boundary:** Pure deterministic domain analysis; `IL-5.5` persistence/API is a separate adapter and `IL-5.6` presentation is not implemented

## Implemented contract

`impact-analysis.v1` evaluates one integrity-checked Twin projection, its exact bound code-map revision, the matching `reconciliation-reassessment.v1` result, one exact target snapshot, supplied target-snapshot validation results and explicit roots/requirements. The pinned `impact-traversal-policy.v1` identity is:

```text
sha256:d70f19d09f5adecf5fd0cab8d703bf67df3b2530fa6384fa6553cddd965ff6f2
```

The policy establishes:

- `EXPLICIT_DECLARATION_ONLY` authority for roots and implementation/validation requirements;
- `AFFECTS` forward, `DEPENDS_ON` reverse, `IMPLEMENTS` toward `SoftwareAsset`, and `VALIDATED_BY` forward-terminal traversal;
- deterministic breadth-first traversal, one canonical shortest path and exact node-revision cycle control;
- a maximum path depth of 8 and exclusion of every irrelevant relationship type;
- exact node/relationship identity, revision, digest and source attribution on every cited step;
- structural validation presence independent of `PASSED`, `FAILED` or `INCONCLUSIVE` status;
- visible but unavailable declared/synthetic implementation support;
- no AI authority to create roots, semantic edges, requirements, waivers or canonical findings; and
- canonical ordering, serialization, hydration and digest validation for restart-safe equality.

Fixed ceilings are 50 roots, 500 requirements, 50 basis citations per requirement, 500 supplied validation results, 1,000 returned paths, 5,000 dependencies and 16 MiB serialized output.

## Acceptance evidence

| Acceptance | Evidence | Result |
|---|---|---|
| Expected retail paths | Cancellation impact reaches inventory, refund, fulfilment and notification assets through the authored `AFFECTS`/reverse-`DEPENDS_ON` graph with exact citations | `PASS` |
| Validation-gap truth cases | Absent result and absent relationship produce distinct stable reasons; an absent explicitly required asset produces its own reason | `PASS` |
| Validation status semantics | Exact `FAILED` and `INCONCLUSIVE` results are structurally present and remain visible on the path without becoming readiness | `PASS` |
| Direction policy | `IMPLEMENTS` is followed only toward software assets and `VALIDATED_BY` only forward to a terminal validation | `PASS` |
| Cycle and depth control | Cycles terminate, the canonical shortest path wins, depth 8 is included and a target beyond the bound is excluded with an exact gap | `PASS` |
| Irrelevant path exclusion | `CONCERNS` and every relationship outside the four-type policy cannot satisfy an impact requirement | `PASS` |
| Declared fallback honesty | Declared/synthetic assets remain cited, while `UNAVAILABLE_SAFE_FAILURE`/`UNAVAILABLE` emits `IMPLEMENTATION_SUPPORT_UNAVAILABLE` | `PASS` |
| Explicit-only obligations | No requirement means no inferred gap; duplicate or malformed declarations reject | `PASS` |
| AI non-authority | An `AI_ADVISORY` root rejects even when no AI semantic edge exists; AI-attributed declarations/members cannot enter traversal | `PASS` |
| Exact input binding | Substituted Twin, code map, reassessment or target snapshot fails closed | `PASS` |
| Determinism and restart | Input permutation produces an equal result; canonical serialization/hydration reproduces the same bytes | `PASS` |
| Integrity and limits | Tampered serialization, duplicate logical obligations and over-limit collections reject with bounded non-revealing errors | `PASS` |

## Focused executable evidence

```powershell
npm.cmd run typecheck --workspace @intelliloop/domain
npx.cmd vitest run --config vitest.unit.config.ts packages/domain/test/impact-analysis.test.ts
```

Observed result: the domain typecheck passed and the focused impact-analysis file passed all 14 tests. The complete domain-package suite also passed at this checkpoint. This evidence record does not assert a final repository-wide test total.

## Authority and delivery boundary

An impact path proves only deterministic reachability under the exact selected Twin, code map, snapshot, reassessment, declarations and policy. It does not prove runtime behavior, business consequence, source truth, completeness or readiness.

An `IMPACT_GAP` means one explicitly declared structural obligation was not satisfied by those exact inputs. It does not independently approve or block release. A `FAILED` or `INCONCLUSIVE` validation is present evidence, never successful validation. Declared/synthetic code-map support is inspectable but unavailable for closing an implementation obligation. AI has no canonical effect.

`IL-5.5` subsequently stores this result inside an immutable reconciliation/impact aggregate and exposes bounded Mission-scoped reads; that later adapter does not change the `IL-5.4` truth semantics. The findings-and-impact browser workflow remains `IL-5.6`.
