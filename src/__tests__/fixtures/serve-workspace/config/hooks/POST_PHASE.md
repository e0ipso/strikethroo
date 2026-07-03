# POST_PHASE Hook

## Phase Post-Execution

Before moving to the next phase:

- Run lint and/or format checks if this hook defines them for your project. If none are defined here, skip this step.
- Create a descriptive conventional commit for the phase (subject and body).

### Execution Monitoring

#### Progress Tracking

Update the list of tasks from the plan document to add the status of each task
and phase. Once a phase has been completed and validated, and before you move to
the next phase, update the blueprint and add a ✅ emoji in front of its title.
Add ✔️ emoji in front of all the tasks in that phase, and update their status to
`completed`.

#### Task Status Updates
Valid status transitions:
- `pending` → `in-progress` (when agent starts)
- `in-progress` → `completed` (successful execution)
- `in-progress` → `failed` (execution error)
- `failed` → `in-progress` (retry attempt)
