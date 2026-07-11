Use an internal task or todo tracker to monitor progress. For each phase defined in the Execution Blueprint:

{{heading}} {{phase_step}}a. Phase pre-execution
Run `scripts/check-phase-readiness.cjs <plan-id> <phase-number>`. If the script exits non-zero, halt the phase and report the blocking issues before continuing.

Read `<root>/config/hooks/PRE_PHASE.md` and execute its instructions before starting the phase.

{{heading}} {{phase_step}}b. Task dispatch
Identify all tasks scheduled for this phase whose dependencies are fully satisfied. Read `<root>/config/hooks/PRE_TASK_ASSIGNMENT.md` and follow its instructions for agent selection before dispatching tasks.

For each selected task, before native dispatch run:

```text
scripts/dispatch-task-execution.cjs <task-file> <current-harness> <workspace> <plan-id> <task-id>
```

`<current-harness>` is the exact supported harness identifier running this
skill and `<workspace>` is the project working directory. Interpret its JSON
result before choosing a route: `native-default` uses ordinary native dispatch;
`native-override` uses native dispatch with explicit exact-model prose and
reasoning-effort prose only when returned; `fallback` visibly records its
reason then uses ordinary native dispatch with no override prose;
`launched-success` has already completed externally and receives normal status
and evidence review; `launched-failure` is a failed task and must enter the
existing error-hook/status path without any native retry.

Deploy all remaining native agents simultaneously using your internal Task tool. Each agent MUST:

1. Read and execute `<root>/config/hooks/PRE_TASK_EXECUTION.md` before starting any implementation work.
2. Execute the task according to its requirements.
3. Monitor execution progress and capture outputs and artifacts.
4. Update task status in real-time.

Maximize parallelism within each phase. Run every task that is ready at the same time.

{{heading}} {{phase_step}}c. Phase completion verification
Ensure every task in the phase has status `completed`. Collect and review all task outputs. Document any issues or exceptions encountered.

Do not accept a subagent's report of success as proof. Apply the evidence gate in `<root>/config/shared/verification-gate.md` before marking the phase complete. Do not mark a phase complete on an unverified claim.

{{heading}} {{phase_step}}d. Phase post-execution
Read `<root>/config/hooks/POST_PHASE.md` and execute its instructions. Do not proceed to the next phase until this hook succeeds.

Update the phase status to `completed` in the plan's Execution Blueprint section.

Repeat for the next phase until all phases are complete.
