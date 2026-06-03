---
layout: default
title: Workflow Guide
nav_order: 2
description: "Step-by-step workflow with commands and visual guides"
---

# Workflow Guide

Strikethroo breaks complex work into three steps -- planning, task generation, and execution -- each delivered as an Agent Skill that loads automatically when you describe what you need.

## The Workflow

```mermaid
flowchart LR
    A[Work Order] --> B[Plan]
    B --> C{Review}
    C -->|Edit| B
    C -->|Approve| D[Tasks]
    D --> E{Verify}
    E --> G[Execute]
    G --> H{Review}
    H -->|Edit| G
    H -->|Approve| J[Done]

    style A fill:#ffebee
    style B fill:#e3f2fd
    style D fill:#f3e5f5
    style G fill:#e8f5e8
    style J fill:#c8e6c9
```

Human gates wrap each step: you **review** the plan, **verify** the blueprint, and **review** the executed result -- looping back to edit whenever something is off. The plan and the result get a careful read; the blueprint just gets a quick validation pass before execution. These gates are where you catch scope creep and wrong turns. Do not skip them.

## Step-by-Step

### 1. Create a Plan

Ask your assistant in plain language. The `st-create-plan` skill loads automatically.

> /st-create-plan create user authentication with email/password and JWT tokens.

The skill asks clarifying questions, then writes a plan document with requirements, technical approach, risks, and success criteria. Two hooks bracket this step: [`PRE_PLAN`](customization.html#pre_plan) runs before planning begins, and [`POST_PLAN`](customization.html#post_plan) runs once the document is written.

**Output**: `.ai/strikethroo/plans/01--user-authentication/plan-01--user-authentication.md`

### 2. Review the Plan

Open the plan file and verify:
- Requirements are accurate and complete
- No unnecessary features were added (scope creep)
- Technical approach fits your architecture

Edit the file directly -- it is yours, not the AI's. Optionally, ask a second assistant to refine the plan (`st-refine-plan` skill) for a two-agent feedback loop.

### 3. Generate Tasks

> /st-generate-tasks 1

The `st-generate-tasks` skill breaks the plan into atomic tasks (1-2 skills each), maps dependencies, and produces an execution blueprint organized into phases of parallel work. The [`POST_TASK_GENERATION_ALL`](customization.html#post_task_generation_all) hook runs once all task files exist.

**Output**: `.ai/strikethroo/plans/01--user-authentication/tasks/*.md`

### 4. Validate the Tasks

The task documents don't need a line-by-line review -- just a quick validation pass before you let it run. Skim the `tasks/` directory and confirm:
- Nothing obviously outside the original scope slipped in
- No task is overloaded (3+ skills signals it should be split)
- The dependency order is sane

If something looks wrong, fix the task file directly; otherwise move straight to execution. Save the careful reading for the plan (step 2) and the result (step 6).

### 5. Execute the Blueprint

> /st-execute-blueprint 1

The `st-execute-blueprint` skill runs tasks grouped into phases. Within each phase, independent tasks run in parallel. Hooks fire throughout: [`PRE_PHASE`](customization.html#pre_phase) runs before each phase starts, then for every task [`PRE_TASK_ASSIGNMENT`](customization.html#pre_task_assignment) and [`PRE_TASK_EXECUTION`](customization.html#pre_task_execution) run before it is dispatched. [`POST_ERROR_DETECTION`](customization.html#post_error_detection) runs if a task fails, and [`POST_PHASE`](customization.html#post_phase) runs after each phase completes.

If you skipped step 3, the skill auto-generates tasks and the blueprint before starting.

The `st-execute-blueprint` skill drives progress end to end: it updates task statuses as phases complete, and you can inspect plan and task files directly under `.ai/strikethroo/plans/` at any point. Prefer a visual view? Run `npx strikethroo serve` to watch progress in [Visualizations](visualizations.html), the web app that renders plans, tasks, and the dependency graph live from those same files.

### 6. Review the Results

When the last phase finishes, the [`POST_EXECUTION`](customization.html#post_execution) hook runs before the summary is written and the plan is archived.

Execution finishing is not the finish line -- the working code is. Read what the blueprint produced:
- Run the test suite and confirm the plan's success criteria are actually met
- Read the diffs for correctness, not just for green checks
- Watch for tasks that completed on paper but missed the intent

If something is off, adjust the relevant task or plan files and re-run execution -- the blueprint resumes the affected work. Once the result matches the plan, the plan is done: `st-execute-blueprint` archives it to `.ai/strikethroo/archive/`.

## File Structure

```
.ai/strikethroo/
├── plans/
│   └── 01--user-authentication/
│       ├── plan-01--user-authentication.md
│       └── tasks/
│           ├── 01--database-schema.md
│           ├── 02--user-model.md
│           └── 03--auth-endpoints.md
├── archive/                          # Completed plans
├── config/
│   ├── STRIKETHROO.md                # Project context (tech stack, conventions)
│   ├── hooks/                        # Lifecycle hooks (PRE_PLAN, POST_PHASE, etc.)
│   └── templates/                    # PLAN_TEMPLATE.md, TASK_TEMPLATE.md
└── .init-metadata.json               # Tracks file hashes and schema version
```

## Alternative: Automated Workflow

For clear requirements with minimal ambiguity, the `st-full-workflow` skill chains all three steps end-to-end. Ask your assistant to run the full Strikethroo workflow and it handles plan creation, task generation, and execution in one pass.

## Advanced Patterns

### Plan Mode Integration

Use your assistant's native plan/brainstorm mode for initial ideation, then feed the refined output into `st-create-plan`. Plan mode explores broadly; Strikethroo executes precisely. Best for vague requirements where you want the AI to explore options before committing to a structured plan.

### Iterative Refinement

Edit plan and task files directly between steps. Re-run `st-create-plan` with tightened requirements, or manually adjust task files before execution. The `st-refine-plan` skill can also interrogate an existing plan for gaps. Best for evolving requirements and feedback-driven development.

### Multi-Session Projects

Plans and task statuses persist on disk under `.ai/strikethroo/plans/` (completed plans are archived automatically to `.ai/strikethroo/archive/` by `st-execute-blueprint`). Resume any time: inspect the plan and task files to see where things stand, then ask the assistant to continue executing the blueprint -- it picks up where it left off. Commit after each phase so context survives across sessions.

### Parallel Development

Task dependencies define the phase structure automatically. Independent tasks within the same phase execute in parallel. Teams can coordinate by sharing the `.ai/strikethroo/` directory via git -- backend and frontend developers work from the same plan, with dependency enforcement ensuring correct ordering.

### Spike to Production

Create two plans: a quick spike plan (low quality gates, research-focused tasks) to validate a technical approach, then a production plan that applies the spike findings with full testing and quality standards. The spike documents the decision rationale; the production plan executes it properly.

## Next Steps

- **[Visualizations](visualizations.html)**: See plans, tasks, and the dependency graph
- **[Customization Guide](customization.html)**: Tailor hooks, templates, and project context
- **[Reference](reference.html)**: CLI commands, hook catalog, template variables
