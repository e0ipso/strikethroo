Use an internal task or todo tracker to monitor progress. For each phase defined in the Execution Blueprint:

{{heading}} {{phase_step}}a. Phase pre-execution
Read `<root>/config/hooks/PRE_PHASE.md` and execute its instructions before starting the phase.

{{heading}} {{phase_step}}b. Task dispatch
Identify all tasks scheduled for this phase whose dependencies are fully satisfied. Read `<root>/config/hooks/PRE_TASK_EXECUTION.md` and execute its instructions before starting any implementation work.

Deploy all selected agents simultaneously using your internal Task tool. Each agent MUST:

1. Read and execute `<root>/config/hooks/PRE_TASK_EXECUTION.md` before starting any implementation work.
2. Execute the task according to its requirements.
3. Monitor execution progress and capture outputs and artifacts.
4. Update task status in real-time.

Maximize parallelism within each phase. Run every task that is ready at the same time.

{{heading}} {{phase_step}}c. Phase completion verification
Ensure every task in the phase has status `completed`. Collect and review all task outputs. Document any issues or exceptions encountered.

Do not accept a subagent's report of success as proof. Apply the evidence gate before marking the phase complete:

{{include verification-gate.md}}

{{heading}} {{phase_step}}d. Phase post-execution
Read `<root>/config/hooks/POST_PHASE.md` and execute its instructions. Do not proceed to the next phase until this hook succeeds.

Update the phase status to `completed` in the plan's Execution Blueprint section.

Repeat for the next phase until all phases are complete.
