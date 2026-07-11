Use an internal task or todo tracker to monitor progress. For each phase defined in the Execution Blueprint:

{{heading}} {{phase_step}}a. Phase pre-execution
Run `scripts/check-phase-readiness.cjs <plan-id> <phase-number>`. If the script exits non-zero, halt the phase and report the blocking issues before continuing.

Read `<root>/config/hooks/PRE_PHASE.md` and execute its instructions before starting the phase.

{{heading}} {{phase_step}}b. Task dispatch
Identify all tasks scheduled for this phase whose dependencies are fully satisfied. Read `<root>/config/hooks/PRE_TASK_ASSIGNMENT.md` and follow its instructions for agent selection before dispatching tasks.

Resolve every selected task's execution route first. Invoke one resolver per selected
task simultaneously in a single parallel tool operation:

```text
scripts/dispatch-task-execution.cjs resolve <task-file> <current-harness> <workspace> <plan-id> <task-id>
```

Resolvers never launch external processes. After interpreting all route results, issue
all `external-override` executions and all native Task-tool agents **together in one
parallel tool operation**. External execution uses:

```text
scripts/dispatch-task-execution.cjs execute <task-file> <current-harness> <workspace> <plan-id> <task-id>
```

This two-step protocol is mandatory: do not execute external tasks during route
resolution, do not serialize external commands, and do not wait for external completion
before launching ready native agents. If an execute-time pre-flight returns `fallback`,
record its reason and immediately launch the ordinary native path without override prose.

`<current-harness>` is the exact supported harness identifier running this
skill and `<workspace>` is the project working directory. Interpret its JSON
result before choosing a route: `native-default` uses ordinary native dispatch;
`native-override` uses native dispatch with explicit exact-model prose and
reasoning-effort prose only when returned; `fallback` visibly records its
reason then uses ordinary native dispatch with no override prose;
`launched-success` has already completed externally and receives normal status
and evidence review; `launched-failure` is a failed task and must enter the
existing error-hook/status path without any native retry; `infrastructure-failure`
is also a failed task, must be marked failed, and must run
`<root>/config/hooks/POST_ERROR_DETECTION.md` without native retry. The command
always emits exactly one JSON line; exit code `2` identifies entrypoint/infrastructure
failure while exit code `1` identifies a launched task failure.

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
