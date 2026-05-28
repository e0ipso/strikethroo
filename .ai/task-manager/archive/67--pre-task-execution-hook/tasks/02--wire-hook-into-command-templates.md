---
id: 2
group: "template-integration"
dependencies: [1]
status: "completed"
created: "2026-03-26"
skills:
  - markdown
---
# Wire PRE_TASK_EXECUTION Hook into Command Templates

## Objective
Add a "Read and execute" reference to `PRE_TASK_EXECUTION.md` in both `execute-blueprint.md` and `full-workflow.md` command templates, positioned between agent selection (PRE_TASK_ASSIGNMENT) and parallel task dispatch.

## Skills Required
- markdown (command template editing)

## Acceptance Criteria
- [ ] `templates/assistant/commands/tasks/execute-blueprint.md` references `PRE_TASK_EXECUTION.md` between steps 2 and 3 of the Phase Execution Workflow
- [ ] `templates/assistant/commands/tasks/full-workflow.md` has the same reference in its embedded execute-blueprint section
- [ ] The hook is invoked "for each task" before dispatch, not once per phase
- [ ] The todo example in the Execution Process section includes the new hook
- [ ] Existing hook references remain unchanged

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- The directive follows the pattern: `Read and execute $root/.ai/task-manager/config/hooks/PRE_TASK_EXECUTION.md`
- Placement: In `execute-blueprint.md`, between step "2. Agent Selection and Task Assignment" and step "3. Parallel Execution"
- Add a new numbered step (renumber subsequent steps)
- In `full-workflow.md`, find the identical section (it embeds execute-blueprint content) and make the same edit

## Input Dependencies
- Task 1 must be complete (the hook file must exist to be referenced)

## Output Artifacts
- Modified `templates/assistant/commands/tasks/execute-blueprint.md`
- Modified `templates/assistant/commands/tasks/full-workflow.md`

## Implementation Notes

<details>

### execute-blueprint.md Changes

In the "### Phase Execution Workflow" section, the current structure is:

```markdown
1. **Phase Initialization**
    ...

2. **Agent Selection and Task Assignment**
Read and execute $root/.ai/task-manager/config/hooks/PRE_TASK_ASSIGNMENT.md

3. **Parallel Execution**
    ...
```

Change to:

```markdown
1. **Phase Initialization**
    ...

2. **Agent Selection and Task Assignment**
Read and execute $root/.ai/task-manager/config/hooks/PRE_TASK_ASSIGNMENT.md

3. **Task Pre-Flight Validation**
    - For each task about to be dispatched:
Read and execute $root/.ai/task-manager/config/hooks/PRE_TASK_EXECUTION.md

4. **Parallel Execution**
    ...

5. **Phase Completion Verification**
    ...
```

### full-workflow.md Changes

Find the embedded execute-blueprint section (around lines 700+) which contains the identical Phase Execution Workflow structure. Apply the same insertion.

### Todo Example Update

In the Execution Process todo example, add a line for the new hook. The example currently shows PRE_PHASE and POST_PHASE hooks per phase. Add a mention like:
```
- [ ] Execute PRE_TASK_EXECUTION hook for each task in Phase N.
```

### Key Files
- `templates/assistant/commands/tasks/execute-blueprint.md` — primary edit
- `templates/assistant/commands/tasks/full-workflow.md` — mirror edit in embedded section

</details>
