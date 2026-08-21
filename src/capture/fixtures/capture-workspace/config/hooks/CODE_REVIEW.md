# CODE_REVIEW Hook

## Automated Code Review Gate

This hook governs a review step that runs at the end of blueprint execution, after the mechanical gates (lint, tests, Self Validation) report success. A reviewer on a discovered external harness critiques the plan's cumulative diff and emits findings. The findings are validated against the vendored schema and recorded.

The gate reports; it does not decide. Nothing is applied automatically, and the implementer reads the recorded findings and chooses what to act on.

## Mandate: Conformance and Defects Only

The reviewer checks the diff against the **plan's stated requirements** and for **demonstrable defects**. It does **not** raise general code-quality opinions, style notes, design critiques, or taste judgments. The linter owns style. Every finding must cite concrete evidence and trace to:

- An explicit requirement stated in the plan, **or**
- A demonstrable defect in the code as written

Anything else is out of scope and must not be included in findings.

## Finding Categories In Scope

- **Requirement conformance**: the code does not implement what the plan explicitly asked for
- **Demonstrable defects**: the code fails at runtime, produces wrong behaviour, violates a contract it declares, has a security hole, causes data loss, or breaks something else in the plan

## Severity and Confidence

Both are advisory triage labels carried on every finding so that whoever reads the review can sort it. Nothing thresholds on them and nothing is filtered out before the implementer sees it.

Severity, from most to least consequential:

- `critical`: causes data loss, a security hole, a crash, or corruption on a path real usage reaches
- `major`: produces wrong behaviour or breaks a documented contract; nothing destroyed
- `minor`: real but bounded (mishandled edge case, maintenance hazard); behaviour correct today
- `info`: no defect (recorded context, a question for the author)

Confidence, from most to least sure:

- `high`: the evidence is in the code that was read, and the failure traces from the diff alone
- `medium`: likely real, but rests on one assumption that was not verified (how a caller behaves, what a dependency guarantees, what a requirement was)
- `low`: speculative (failure scenario imagined rather than traced, constraint invented, intent could not be inferred)

Confidence matters most when it is low. LLM reviewers overstate certainty, so a reviewer that marks its own guess as `medium` is doing the reader a service. Record the label honestly rather than upgrading it to be taken seriously.

## What the Gate Guarantees

Exactly one thing, and it is enforced in code rather than here: a review that could not be certified is never reported as a clean one. A findings document that is absent, invalid against the schema, or unvalidatable because `xmllint` is missing halts the gate and says which of those happened. "The reviewer found nothing" and "the reviewer never ran" are never collapsed into each other.

## Disable the Gate

**Emptying this file, or deleting it, disables the review gate cleanly.** The gate skips with no error and records the skip in the execution summary. This is the documented sentinel for "do not review this plan"; there is no undefined behaviour and no error.

Users who already have a code review step in their workflow disable this feature by editing or emptying the hook, matching the pattern of `PRE_TASK_EXECUTION` which ships an overridable default discipline.
