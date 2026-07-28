Read `<root>/config/hooks/POST_EXECUTION.md` and execute its instructions. If validation fails, halt execution. The plan remains in `plans/` for debugging.

Before declaring execution complete, apply the evidence gate in `<root>/config/shared/verification-gate.md` to the plan's Success Criteria and Self Validation steps.

{{heading}} Run the code review gate

After `POST_EXECUTION.md` reports green and before appending the execution summary, follow the `st-code-review` skill and run one review round with its bundled mechanism:

```text
code-review.cjs <plan-id> <current-harness> <round>
```

`code-review.cjs` ships with the `st-code-review` skill and lives in that skill's own `scripts` directory, a sibling of this one. Resolve it there; it is not bundled with this skill. If the `st-code-review` skill is not installed on this harness, record that as the review outcome in the execution summary and continue to the summary and archival.

`<current-harness>` is the exact supported harness identifier running this skill. `<round>` is `1` on the first invocation, and thereafter the exact `decision.nextRound` the previous round returned. The command emits exactly one JSON line on stdout. Read its `kind`, then — when `kind` is `reviewed` — its `decision.kind`, and do exactly what the matching row states.

| Result | What you do |
| --- | --- |
| `skipped` | The gate is disabled or unconfigured. Record `reason` and `detail` verbatim in the execution summary, then continue to the summary and archival. A skip is never a failure. |
| `reviewed`, `decision.kind` = `gate-passed` | The gate passed. Record `findingsGate.recorded` and `findingsGate.aboveFloorWithoutSuggestion` — real findings deliberately not applied — then continue to the summary and archival. |
| `reviewed`, `decision.kind` = `fix-and-continue` | Apply the `actionable` set from `<plan-dir>/review/round-<n>/findings.json` on the implementer route. Re-run `POST_EXECUTION.md` in full. Then run the gate again with `<round>` set to `decision.nextRound`. |
| `reviewed`, `decision.kind` = `budget-exhausted` | Halt exactly as any mechanical gate failure. Leave the plan in `plans/`, do not append a completion summary, do not archive, and report the outstanding findings with actionable next steps. |
| `reviewed`, `decision.kind` = `round-failed` | The round was not certified — the findings document was absent or invalid, or no validator was available. Halt and report `decision.detail`. Never report an uncertified round as clean. |
| `budget-exhausted` | A round past the enforced budget was requested and no reviewer was dispatched. Halt exactly as `decision.kind` = `budget-exhausted` above. |
| `launched-failure` | The reviewer harness exited non-zero. Halt and report `detail`. |
| `fallback` | The reviewer never ran — the harness was unavailable or authentication failed. Record `reason` and `detail` verbatim in the execution summary, then continue to the summary and archival. |
| `infrastructure-failure` | A real error. Halt and report `detail`. Do not retry on a different route. |

<details>
<summary>Applying an actionable finding</summary>

`<plan-dir>/review/round-<n>/findings.json` holds that round's partition. Its `actionable` array is the only set you apply. Its `recorded` array is inspection material and is never applied.

Each actionable entry names a file, a location, and a suggestion whose `original-code` was copied verbatim from that file. Apply it as an exact text replacement of `original-code` by `proposed-code`, and change nothing else. When `original-code` no longer matches the file, record the finding as not applied and move to the next one. Do not reconstruct the fix, widen it, or refactor around it.

Dispatch every fix on the implementer route. Earlier rounds' rulings are carried into the next round by the mechanism itself, which reads the partitions it already wrote; do not pass them back on the command line.

</details>

Hard rules:

- The gate creates no task files.
- The gate never mutates the Execution Blueprint.
- The gate is terminal only — never per phase, never per task.
- The reviewer never fixes its own findings. Detection runs on the reviewer route, fixes run on the implementer route.
- Any applied fix invalidates the green build that preceded it. Re-run `POST_EXECUTION.md` in full — lint, tests, and Self Validation — before the gate runs again. Never re-verify against the prior green build.
- Whether another round runs is `decision.kind`'s to state and yours to obey. Do not count rounds, reason about the budget, or invoke a round the mechanism did not name.
- A green gate is not a correctness guarantee. It reduces the exposure a human PR approval reduces, and it leaves the same exposure behind.

{{heading_parent}} {{summary_step}}. Append execution summary

Append an execution summary section to the plan document using the format described in `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Populate:

- **Status**: Completed Successfully
- **Completed Date**: current date
- **Results**: brief summary of deliverables
- **Noteworthy Events**: all decisions, issues, and outcomes encountered during execution. Always record the review gate's outcome here: the reviewer harness, the number of rounds run, and the counts of findings recorded versus applied — or, when the gate did not run, its `reason` and `detail` verbatim. If nothing else occurred, state "No significant issues encountered." after the review outcome.
- **Necessary follow-ups**: any follow-up actions or optimizations

{{heading_parent}} {{archive_step}}. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`.

Preserve the entire folder structure (including all tasks and subdirectories) to maintain referential integrity. If the move fails, log the error but do not fail the overall execution — the implementation work is complete.
