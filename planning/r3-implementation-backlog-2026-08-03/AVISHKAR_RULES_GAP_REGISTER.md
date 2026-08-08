# IntelliLoop Avishkar Rules Gap Register

**Status:** `REGISTRATION_SUBMITTED_RULEBOOK_NOT_VERIFIED`  
**Date checked:** 2026-08-05  
**Effect:** The user confirms registration submission; development may proceed conservatively, while official eligibility/compliance and any finalist package sign-off remain unverified.

## Evidence searched

- Authorized IntelliLoop discovery, recovery, R1 and R2 artifacts.
- Non-secret filenames and content already recorded by the prior discovery gates.
- Targeted public search for an official Nisum Avishkar 2026 rule or submission page.

No official rulebook or official public submission page was found. The user-confirmed submitted innovation brief is now hashed in `docs/governance/SUBMISSION_COMMITMENTS.md`; it establishes what IntelliLoop represented externally, not the competition's complete rules or an organizer acceptance decision. Unrelated events with similar names are not evidence for this competition.

## Rule gaps and safe defaults

| ID | Required official fact | Status | Safe development default | Closure evidence |
|---|---|---|---|---|
| AVR-01 | Official event name, organizer and edition | `UNKNOWN` | Use “Avishkar 2026” only as a working label; do not imply organizer endorsement | Official rulebook or authorized event page |
| AVR-02 | Eligibility and employment/location restrictions | `UNKNOWN` | Make no official eligibility claim | Official eligibility section |
| AVR-03 | Individual versus team participation and contribution rules | `USER_STATED_INDIVIDUAL_NOT_OFFICIALLY_VERIFIED` | Maintain a single-contributor provenance ledger; do not claim official team compliance | Official team rule plus participant record |
| AVR-04 | Registration and submission deadline with timezone | `UNKNOWN` | Keep a release-ready package but publish no deadline | Official schedule |
| AVR-05 | Required category, theme or problem-statement alignment | `UNKNOWN` | Preserve the evidence-reconciled AI/software-delivery narrative; label category as proposed | Official category list and selected registration |
| AVR-06 | Judging criteria and scoring weights | `UNKNOWN` | Optimize for demonstrable innovation, usefulness, feasibility, AI grounding, safety and presentation without asserting weights | Official judging rubric |
| AVR-07 | Pre-existing code and work-start-date policy | `UNKNOWN` | Source-independent greenfield build; direct candidate-source copy remains prohibited | Official pre-existing-code terms |
| AVR-08 | AI-assisted development and disclosure rules | `UNKNOWN` | Maintain an AI-use ledger and disclose generated/assisted work; AI output receives human/test verification | Official AI-assistance policy |
| AVR-09 | Open-source and third-party dependency rules | `UNKNOWN` | Use independently selected published packages; pin versions; retain licenses/notices; no candidate app source | Official dependency/open-source terms |
| AVR-10 | Intellectual-property ownership and publication rights | `UNKNOWN` | Do not publish, open-source or transfer rights solely because the prototype is complete | Official IP/publication terms |
| AVR-11 | Nisum name, logo and branding permission | `UNKNOWN` | Product brand remains “IntelliLoop”; do not add Nisum logos or imply official endorsement | Written branding permission or official brand kit terms |
| AVR-12 | Confidentiality, client data and internal-system rules | `UNKNOWN` | Synthetic data and controlled repository only; no Nisum/client/employer/private content | Official data-handling terms |
| AVR-13 | Allowed hosting, network and external-service behavior | `UNKNOWN` | Local-first, localhost, offline workflow; external AI off by default | Official deployment/network rule |
| AVR-14 | Required submission fields, word limits and file formats | `UNKNOWN` | Maintain modular 100/250-word copy, pitch, architecture, demo and evidence assets that can be adapted | Official submission form/template |
| AVR-15 | Demo length, live/recorded requirement and fallback policy | `UNKNOWN` | Rehearse a 5–7 minute live path and prepare truthful offline fallback assets | Official demo instruction |
| AVR-16 | Repository visibility, commit history and audit requirements | `UNKNOWN` | Preserve append-only provenance and intentional commits once authorized; no fabricated history | Official repository rule |
| AVR-17 | Required accessibility, security or privacy attestations | `UNKNOWN` | Apply the frozen professional accessibility, privacy and security gates | Official compliance checklist |
| AVR-18 | Contact or escalation path for rule interpretations | `UNKNOWN` | Record ambiguity; do not self-approve favorable interpretations | Official organizer contact and written response |

## Mandatory closure workflow

Before story `IL-9.5` can pass or a later finalist/demo package can claim compliance:

1. The user supplies the official rulebook, submission form export, authorized screenshots or a public official URL.
2. Record document title, issuer, version/date, retrieval date and content hash where possible.
3. Map every rule to this register and the submission artifacts.
4. Record `PASS`, `ACTION_REQUIRED`, `NOT_APPLICABLE` or `NEEDS_ORGANIZER_CLARIFICATION` with evidence.
5. Resolve branding, source ownership, AI disclosure, dependency notices, data restrictions and publication terms before any finalist/demo package or public release.
6. Reconcile the submitted claim set against implementation evidence and qualify any unsupported future claim.
7. Retain the completed matrix in the final evidence dossier.

## Professional compliance posture until closure

- Say that the user submitted the innovation brief; do not say “Avishkar compliant,” “officially eligible” or “accepted/shortlisted” without organizer evidence.
- Treat all impact numbers as controlled-prototype measurements, not production or Nisum outcomes.
- Do not add corporate logos, internal screenshots or private repositories.
- Keep the final application functional without an external AI provider.
- Preserve package licenses, AI-use records, provenance entries, test results and claim evidence.
- Escalate any rule that conflicts with R2 safety or source-use boundaries; do not weaken those boundaries silently.

## Current decision

`AVISHKAR_REGISTRATION_RECORDED_FINAL_COMPLIANCE_REQUIRES_OFFICIAL_RULES`
