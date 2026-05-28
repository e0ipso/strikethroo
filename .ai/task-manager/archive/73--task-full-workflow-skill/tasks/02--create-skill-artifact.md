---
id: 2
group: "skill-artifact"
dependencies: []
status: "completed"
created: "2026-05-18"
skills: ["technical-writing"]
---
# Create task-full-workflow SKILL.md

## Objective

Create a standards-compliant Agent Skill at `templates/skills/task-full-workflow/SKILL.md` that encodes the same end-to-end orchestration workflow as the existing `/tasks:full-workflow` command. The skill must be assistant-agnostic, self-contained, and reference bundled scripts by relative path. The skill is purely additive — the existing command template remains untouched.

## Skills Required

- technical-writing (authoring skill prose, preserving command contract in skill format, context-passing rules, progress indicators)

## Acceptance Criteria

- [ ] `templates/skills/task-full-workflow/SKILL.md` exists with valid YAML frontmatter
- [ ] Frontmatter `name` equals `task-full-workflow`
- [ ] Description is specific to full-workflow execution for this task-manager (not generic development)
- [ ] Operating procedure describes three sequential phases without pausing: Plan Creation → Task Generation → Blueprint Execution
- [ ] For each phase, instructions follow the same procedure as the corresponding individual skill/command
- [ ] Context-passing rules are documented: extract `Plan ID` from Phase 1 structured summary, use it in Phase 2; extract `Tasks` count from Phase 2 structured summary, use it for progress tracking in Phase 3
- [ ] Progress indicators (`⬛⬜⬜ 33%`, etc.) are included with the explicit rule that they are informational and do not pause execution
- [ ] Auto-generation fallback is covered: if tasks or blueprint are missing at the start of Phase 3, instruct auto-generation before proceeding
- [ ] All bundled script references use relative paths from the skill root (`scripts/<name>.cjs`)
- [ ] No assistant-specific syntax (`$ARGUMENTS`, `$1`) appears in the skill body
- [ ] The critical no-pause rule is stated: the assistant executes all three steps sequentially without waiting for user input between steps
- [ ] Ends with the exact required `Execution Summary` block format

## Technical Requirements

- Follow the structure and tone of existing shipping skills (`task-execute-blueprint`, `task-refine-plan`, `task-create-plan`, `task-generate-tasks`, `task-execute-task`)
- The skill directory must be flat: no nested subdirectories except `scripts/`
- Script invocation examples must use relative paths so the skill works when copied standalone
- The prose must avoid literally embedding other skills' markdown contents; instead describe the three-phase workflow in assistant-agnostic prose

## Input Dependencies

- Reference skill prose: `templates/skills/task-execute-blueprint/SKILL.md` (for execution phase conventions)
- Reference command contract: `templates/assistant/commands/tasks/full-workflow.md` (the existing command to preserve)
- Reference skill prose: `templates/skills/task-create-plan/SKILL.md` (for plan creation phase conventions)
- Reference skill prose: `templates/skills/task-generate-tasks/SKILL.md` (for task generation phase conventions)

## Output Artifacts

- `templates/skills/task-full-workflow/SKILL.md`

## Implementation Notes

<details>

### Skill frontmatter

Use exactly:

```yaml
---
name: task-full-workflow
description: Execute the complete AI Task Manager workflow from plan creation through blueprint execution without pausing between steps. Use when the user asks for a full end-to-end workflow, full implementation, or complete plan-to-execution pipeline — discovers the local .ai/task-manager root, creates a plan, generates tasks, and executes the blueprint sequentially with context passing between phases, progress indicators, and auto-generation fallback. Do not use for generic development work outside the AI Task Manager or for single-step operations.
---
```

### Operating procedure sections

Structure the skill body as:

1. **Critical Rules** — no-pause rule, progress indicator rule, context-passing rule, auto-generation fallback rule.
2. **Inputs** — user supplies the initial prompt conversationally; no assistant-specific variables.
3. **Operating Procedure** with three phases:
   - **Phase 1: Plan Creation** — follow the `task-create-plan` skill procedure (discover root, run PRE_PLAN.md, clarification loop, plan generation, POST_PLAN.md, emit Plan Summary with Plan ID). Include progress indicator `⬛⬜⬜ 33%`.
   - **Phase 2: Task Generation** — using the Plan ID extracted from Phase 1, follow the `task-generate-tasks` skill procedure (validate plan, decompose into atomic tasks, run POST_TASK_GENERATION_ALL.md, emit Task Generation Summary with task count). Include progress indicator `⬛⬛⬜ 66%`.
   - **Phase 3: Blueprint Execution** — using the Plan ID from previous phases, follow the `task-execute-blueprint` skill procedure (validate tasks/blueprint, auto-generate if missing, create feature branch, execute phases with hooks, append execution summary, archive). Include progress indicator `⬛⬛⬛ 100%`.
4. **Context Passing Between Phases** — explicit subsection documenting how the Plan ID and task count flow from phase to phase.
5. **Auto-Generation Fallback** — explicit conditional: if tasks or blueprint are missing at the start of Phase 3, run the equivalent of task generation first, then re-validate before proceeding.
6. **Progress Indicators** — explicit subsection: only used in full-workflow; format `⬛⬜⬜ 33% - Step 1/3: ...`; informational only, do not pause.
7. **Failure Modes** — list the same failure modes as the command (no root found, plan creation failure, task generation failure, blueprint execution failure, hook failure).
8. **Execution Summary** — end with exactly:

```
---
Execution Summary:
- Plan ID: [numeric-id]
- Status: Archived
- Location: [absolute path to archive directory]
---
```

### No assistant-specific syntax
Do not use `$ARGUMENTS`, `$1`, or bash variable placeholders. The skill prose should describe what the assistant does, not contain template syntax for a specific assistant platform.

### Self-containment
Every script the skill needs is bundled into its own `scripts/` directory. Reference them as `scripts/find-task-manager-root.cjs`, etc.

</details>
