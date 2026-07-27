# CODE_REVIEW Hook

## Automated Code Review Gate

This hook governs an unattended review loop that runs at the end of blueprint execution, after mechanical gates (lint, tests, Self Validation) report success. A reviewer on a discovered external harness critiques the plan's cumulative diff and emits findings; findings at or above the severity and confidence floors trigger automatic remediation, followed by a full re-run of the mechanical gates and re-verification.

The gate terminates on exhausted round budget or when no findings above threshold remain.

## Mandate: Conformance and Defects Only

The reviewer checks the diff against the **plan's stated requirements** and for **demonstrable defects**. It does **not** raise general code-quality opinions, style notes, design critiques, or taste judgments — the linter owns style. Every finding must cite concrete evidence and trace to:

- An explicit requirement stated in the plan, **or**
- A demonstrable defect in the code as written

Anything else is out of scope and must not be included in findings.

## Finding Categories In Scope

- **Requirement conformance** — the code does not implement what the plan explicitly asked for
- **Demonstrable defects** — the code fails at runtime, produces wrong behaviour, violates a contract it declares, has a security hole, causes data loss, or breaks something else in the plan

## Severity Floor: `major`

Findings below `major` are recorded in the review output but never auto-applied. The severity levels, ordered from most to least consequential:

- `critical` — causes data loss, security hole, crash, or corruption on a path real usage reaches
- `major` — produces wrong behaviour or breaks a documented contract; nothing destroyed
- `minor` — real but bounded (mishandled edge case, missing test, maintenance hazard); behaviour correct today
- `info` — no defect (style, naming, question for author, recorded context)

If a finding omits the severity attribute, it falls below the floor and is never auto-applied.

## Confidence Floor: `high`

Findings below `high` are recorded but never auto-applied. The confidence levels, ordered from most to least sure:

- `high` — evidence is in the code that was read; failure can be traced from the diff alone, no assumptions needed
- `medium` — likely real, but rests on one assumption not verified (how a caller behaves, what a dependency guarantees, what a requirement was)
- `low` — speculative (failure scenario imagined, not traced; constraint invented; intent could not be inferred)

If a finding omits the confidence attribute, it falls below the floor and is never auto-applied.

This attribute has no schema default on purpose. Findings that omit confidence are treated as falling below any floor. An automated consumer relies on confidence being lowered honestly; LLM reviewers systematically overstate certainty.

## Round Budget: 3

The gate runs up to three detect-and-fix cycles:

1. Reviewer critiques the cumulative diff → findings
2. If findings above floor exist: implement fixes, re-run mechanical gates, verify
3. Reviewer re-checks → repeat until no new findings above floor or budget exhausted

This value expressed here is advisory prose only. **Termination is enforced in code and cannot be bypassed by editing this file.** If the round budget is exhausted, the gate halts exactly as any mechanical gate failure does: the plan stays in `plans/`, findings are recorded, and the failure is documented.

## Disable the Gate

**Emptying this file, or deleting it, disables the review gate cleanly.** The gate skips with no error and records the skip in the execution summary. This is the documented sentinel for "do not review this plan"; there is no undefined behaviour and no error.

Users who already have a code review step in their workflow disable this feature by editing or emptying the hook, matching the pattern of `PRE_TASK_EXECUTION` which ships an overridable default discipline.
