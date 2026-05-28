---
id: 2
group: "skill-artifact"
dependencies: []
status: "completed"
created: "2026-05-18"
skills:
  - "markdown"
---
# Create task-execute-blueprint skill directory and SKILL.md

## Objective
Create a standards-compliant `task-execute-blueprint` skill directory at `templates/skills/task-execute-blueprint/` containing a single authored `SKILL.md` file. The skill encodes the same execution-orchestration workflow as the existing `/tasks:execute-blueprint` command: locate root, resolve plan, validate tasks and blueprint, auto-generate if missing, optionally create a feature branch, execute phases with hooks, post-execution validation, summary generation, and archival.

## Skills Required
- `markdown` — authoring assistant-agnostic Agent Skill prose with frontmatter, sections, and code blocks

## Acceptance Criteria
- [ ] Directory `templates/skills/task-execute-blueprint/` exists (flat — no nested skill directories)
- [ ] `templates/skills/task-execute-blueprint/SKILL.md` exists and is valid
- [ ] Frontmatter contains `name: task-execute-blueprint` and a description specific to blueprint execution for this task-manager
- [ ] The skill's operating procedure calls bundled scripts by relative path (`scripts/find-task-manager-root.cjs`, `scripts/validate-plan-blueprint.cjs`, `scripts/create-feature-branch.cjs`)
- [ ] The skill carries forward the critical rules from the existing command:
  - Never skip validation gates
  - Preserve dependency order
  - Maximize parallelism within each phase
  - Fail safely and document everything in Noteworthy Events
- [ ] The skill ends with the exact required `Execution Summary` block format
- [ ] The skill uses no assistant-specific syntax (no `$ARGUMENTS`, no `$1`); the user supplies the plan ID conversationally
- [ ] No legacy `.cjs` files under `templates/ai-task-manager/config/scripts/` are modified or removed

## Technical Requirements
- The SKILL.md must be assistant-agnostic and self-contained
- Every script reference must be relative to the skill root
- The prose must describe the full orchestration workflow: phases, hook execution order (`PRE_PHASE.md`, `PRE_TASK_EXECUTION.md`, `POST_PHASE.md`, `POST_EXECUTION.md`), error handling, and archival
- The `Execution Summary` block must match the format used by the existing command template

## Input Dependencies
- Existing `/tasks:execute-blueprint` command template (under `templates/assistant/commands/tasks/execute-blueprint.md`) — treat as the contract for observable behavior, phase order, hook names, and output format
- Existing `task-create-plan` and `task-generate-tasks` SKILL.md files for structural conventions
- `templates/ai-task-manager/config/templates/EXECUTION_SUMMARY_TEMPLATE.md` for the summary format

## Output Artifacts
- `templates/skills/task-execute-blueprint/SKILL.md`
- `templates/skills/task-execute-blueprint/scripts/` (created by `npm run build` in Task 1, but the skill directory must exist before build)

## Implementation Notes

<details>

### SKILL.md structure

1. **Frontmatter**
   ```yaml
   ---
   name: task-execute-blueprint
   description: ...
   ---
   ```
   The description should mention: execute an AI Task Manager plan blueprint, discover root, resolve plan, validate/generate tasks, run phases with hooks, post-validation, summary, archival.

2. **Inputs** — The user supplies the numeric plan ID conversationally. No invented answers.

3. **Operating Procedure** — Step through:
   - Locate root (`scripts/find-task-manager-root.cjs`)
   - Resolve plan (`scripts/validate-plan-blueprint.cjs <id> planFile`)
   - Validate tasks and blueprint existence (check `taskCount` and `blueprintExists` fields from the same script)
   - Auto-generate tasks and blueprint if missing (instruct the executing agent to follow the `task-generate-tasks` skill instructions)
   - Optionally create a feature branch (`scripts/create-feature-branch.cjs <id>`)
   - Read `config/TASK_MANAGER.md` and the plan's Execution Blueprint
   - Execute phases in order, running `PRE_PHASE.md`, dispatching tasks in parallel with `PRE_TASK_EXECUTION.md`, running `POST_PHASE.md`
   - Run `POST_EXECUTION.md`
   - Append execution summary per `EXECUTION_SUMMARY_TEMPLATE.md`
   - Move completed plan directory from `plans/` to `archive/`

4. **Failure Modes** — Cover: no root found, plan ID invalid, missing blueprint after auto-generation, hook failure, execution errors.

5. **Execution Summary** — Conclude with the exact block format the existing command uses. This block is consumed by downstream automation.

### Writing tips

- Keep the same tone and level of detail as `task-generate-tasks/SKILL.md`.
- Do not restate slash-command syntax; express everything as skill prose.
- Use relative script paths so the skill is self-contained when copied to a user project.
- Mention that the executing agent should read `<root>/config/hooks/PRE_PHASE.md`, `<root>/config/hooks/PRE_TASK_EXECUTION.md`, `<root>/config/hooks/POST_PHASE.md`, and `<root>/config/hooks/POST_EXECUTION.md` at the appropriate points.

</details>
