# PRE_TASK_EXECUTION Hook

## Test-Driven Development: RED → GREEN → REFACTOR

Default task-execution discipline — an overridable preference, not a hard rule.
Edit or empty this file to change it; `init` preserves your edits unless
`--force` is used. For each increment:

1. **RED** — Write one failing test and run it; confirm it fails for the
   expected reason.
2. **GREEN** — Write the minimal code to pass it (YAGNI); confirm it passes.
3. **REFACTOR** — Clean up with the test green; re-run and confirm still green.

Apply this only to the meaningful tests the test philosophy calls for (custom
logic, critical paths, edge cases) — not to trivial, CRUD, or framework code.
If a task warrants no new test under that philosophy, implement directly.
