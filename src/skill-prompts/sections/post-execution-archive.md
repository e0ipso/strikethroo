Read `<root>/config/hooks/POST_EXECUTION.md` and execute its instructions. If validation fails, halt execution. The plan remains in `plans/` for debugging.

Before declaring execution complete, apply the evidence gate in `<root>/config/shared/verification-gate.md` to the plan's Success Criteria and Self Validation steps.

{{heading}} Run the code review gate

After `POST_EXECUTION.md` reports green and before appending the execution summary, follow the `st-code-review` skill and run its bundled mechanism once:

```text
code-review.cjs <plan-id> <current-harness>
```

`code-review.cjs` ships with the `st-code-review` skill and lives in that skill's own `scripts` directory, a sibling of this one. Resolve it there; it is not bundled with this skill. If the `st-code-review` skill is not installed on this harness, record that as the review outcome in the execution summary and continue to the summary and archival.

`<current-harness>` is the exact supported harness identifier running this skill. The command runs one review and emits exactly one JSON line on stdout. Reviewer output is captured and teed to stderr, so stdout carries the verdict JSON line and nothing else. Read its `kind`, then, when `kind` is `reviewed`, its `verdict.kind`, and do exactly what the matching row states.

| Result | What you do |
| --- | --- |
| `skipped` | The gate is disabled or unconfigured. Record `reason` and `detail` verbatim in the execution summary, then continue to the summary and archival. A skip is never a failure. |
| `reviewed`, `verdict.kind` = `review-recorded` | A reviewer ran and its findings were certified. Record `verdict.detail` and the `findingsGate.counts` in the execution summary, then read `<plan-dir>/review/review.xml` and decide for yourself which findings to act on. Nothing was applied for you. |
| `reviewed`, `verdict.kind` = `review-failed` | The findings were not certified: the document was absent or invalid, or no validator was available. Halt and report `verdict.detail`. Never report an uncertified review as clean. |
| `launched-failure` | The reviewer harness exited non-zero. Halt and report `detail`. |
| `fallback` | The reviewer never ran, because the harness was unavailable or authentication failed. Record `reason` and `detail` verbatim in the execution summary, then continue to the summary and archival. |
| `infrastructure-failure` | A real error. Halt and report `detail`. Do not retry on a different route. |

<details>
<summary>Acting on the findings</summary>

`<plan-dir>/review/review.xml` is the reviewer's document and `<plan-dir>/review/findings.json` is the same findings as data. Read them and use your own judgement: the reviewer is a second opinion on a diff you know better than it does, and it has neither run the tests nor read the whole codebase.

Fix what is a genuine requirement gap or defect. Ignore what is wrong, out of scope, or already handled elsewhere, and say in the execution summary which findings you ignored and why. `severity` and `confidence` are the reviewer's own triage labels, useful for sorting and never binding; a `low` confidence finding is one the reviewer could not trace, so read it with that in mind.

Dispatch any fix you decide to make on the implementer route.

</details>

Hard rules:

- The gate creates no task files.
- The gate never mutates the Execution Blueprint.
- The gate is terminal only, never per phase and never per task.
- The reviewer never fixes its own findings. Detection runs on the reviewer route, fixes run on the implementer route.
- Any fix you apply invalidates the green build that preceded it. Re-run `POST_EXECUTION.md` in full (lint, tests, and Self Validation) before declaring execution complete. Never re-verify against the prior green build.
- The review runs once. Do not re-run the gate to check your own fixes.
- A certified review is not a correctness guarantee. It reduces the exposure a human PR approval reduces, and it leaves the same exposure behind.

{{heading_parent}} {{summary_step}}. Append execution summary

Append an execution summary section to the plan document using the format described in `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Populate:

- **Status**: Completed Successfully
- **Completed Date**: current date
- **Results**: brief summary of deliverables
- **Noteworthy Events**: all decisions, issues, and outcomes encountered during execution. Always record the review gate's outcome here: the reviewer harness, the finding counts, and which findings you acted on versus ignored and why. When the gate did not run, record its `reason` and `detail` verbatim. If nothing else occurred, state "No significant issues encountered." after the review outcome.
- **Necessary follow-ups**: any follow-up actions or optimizations

{{heading_parent}} {{archive_step}}. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`.

Preserve the entire folder structure (including all tasks and subdirectories) to maintain referential integrity. If the move fails, log the error but do not fail the overall execution — the implementation work is complete.
