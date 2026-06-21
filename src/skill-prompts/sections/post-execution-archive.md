Read `<root>/config/hooks/POST_EXECUTION.md` and execute its instructions. If validation fails, halt execution. The plan remains in `plans/` for debugging.

Before declaring execution complete, apply the evidence gate from `<root>/config/shared/verification-gate.md` (if present) to the plan's Success Criteria and Self Validation steps.

{{heading_parent}} {{summary_step}}. Append execution summary

Append an execution summary section to the plan document using the format described in `<root>/config/templates/EXECUTION_SUMMARY_TEMPLATE.md`. Populate:

- **Status**: Completed Successfully
- **Completed Date**: current date
- **Results**: brief summary of deliverables
- **Noteworthy Events**: all decisions, issues, and outcomes encountered during execution. If none occurred, state "No significant issues encountered."
- **Necessary follow-ups**: any follow-up actions or optimizations

{{heading_parent}} {{archive_step}}. Archive the plan

Move the completed plan directory from `<root>/plans/<plan-folder>` to `<root>/archive/<plan-folder>`.

Preserve the entire folder structure (including all tasks and subdirectories) to maintain referential integrity. If the move fails, log the error but do not fail the overall execution — the implementation work is complete.
