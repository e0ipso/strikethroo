# PRE_PHASE Hook

## Phase Pre-Execution

### Feature Branch Creation

Create a feature branch for this plan execution:

- From `main`/`master` with a clean working tree: create a branch named `feature/{planId}--{plan-name}` and switch to it.
- From `main`/`master` with uncommitted changes: halt with an error — do not proceed.
- Already on a feature branch: proceed without creating a new branch.
- Branch already exists: switch to it and proceed normally.

## Phase Execution Workflow

1. **Phase Initialization**
    - Identify current phase from the execution blueprint
    - List all tasks scheduled for parallel execution in this phase
    - **Validate Task Dependencies**: For each task in the current phase, verify that all declared dependencies (from the task's YAML frontmatter `dependencies` array) have status `completed`. If any dependency is unresolved, halt the phase and report the blocking dependencies before continuing.
    - Confirm no tasks are marked "needs-clarification"
    - If any phases are marked as completed, verify they are actually completed and continue from the next phase.
