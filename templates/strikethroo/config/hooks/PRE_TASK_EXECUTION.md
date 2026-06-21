# PRE_TASK_EXECUTION Hook

## Test-Driven Development: RED → GREEN → REFACTOR

This is the project's **default** task-execution discipline. Apply the
following cycle when implementing each task. It is an *overridable preference*,
not a hard rule: edit or empty this file in your project's
`.ai/strikethroo/config/hooks/PRE_TASK_EXECUTION.md` to change or remove it.
`init`'s hash-tracking protects your edits — only `--force` overwrites them.

For each increment of the task's implementation:

1. **RED** — Write one failing test for the next small increment of behavior.
   Run it and **observe it fail for the expected reason**. A test that passes
   immediately, or fails for the wrong reason, is not yet a valid RED step.
2. **GREEN** — Write the minimal code needed to make that test pass. Resist
   adding behavior the test does not require (YAGNI). Run the test and confirm
   it passes.
3. **REFACTOR** — With the test green, clean up the code and the test. Re-run
   the test after refactoring and confirm it is still green before moving to the
   next increment.

## Defer to the test philosophy

Apply this cycle to the **meaningful** tests the project's test philosophy
already calls for — custom business logic, critical paths, edge cases, and
integration points — not to gold-plate trivial getters/setters, simple CRUD,
framework behavior, or third-party code. *What* is worth testing is governed by
the test philosophy applied at task-generation time; this hook governs *how* to
build it (test-first). If a task's Implementation Notes restate the test
philosophy, that restatement wins for deciding which tests to write.

If a task genuinely warrants no new test under that philosophy, skip the cycle
for that task and proceed directly to implementation.
