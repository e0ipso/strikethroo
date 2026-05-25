---
layout: default
title: Reference
nav_order: 5
description: "Glossary, CLI reference, and frequently asked questions"
---

# Reference

Glossary of canonical terms, CLI command reference, and answers to frequently asked questions.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Work order** | The user's request describing what they want accomplished. Input to the system. |
| **Plan** | The comprehensive document the LLM produces by refining the work order. Covers requirements, architecture, risks, and success criteria. Output of the planning step. |
| **Execution blueprint** | The structured output of task generation. Contains all tasks organized into phases with dependency mappings. |
| **Phase** | A group of tasks within the execution blueprint. Tasks within a phase execute in parallel; phases execute in sequence. This is the unit of parallelism. |
| **Task** | An atomic unit of work within a phase. Has 1-2 skills, acceptance criteria, and dependencies. Executed by a sub-agent with clean context. |
| **Sub-agent** | A specialized AI agent that executes a single task with focused, clean context. Not the main conversation agent. |
| **Skill** | A harness-agnostic Agent Skill that implements one step of the workflow (e.g., `task-create-plan`, `task-execute-blueprint`). Skills load automatically when the user's intent matches their description. |
| **Harness** | The AI assistant environment (Claude Code, Gemini CLI, GitHub Copilot, Codex, etc.) in which skills run. |
| **Hook** | A lifecycle callback (Markdown file) executed at a specific point in the workflow. Nine hooks are available: `PRE_PLAN`, `POST_PLAN`, `PRE_PHASE`, `POST_PHASE`, `PRE_TASK_ASSIGNMENT`, `PRE_TASK_EXECUTION`, `POST_TASK_GENERATION_ALL`, `POST_EXECUTION`, `POST_ERROR_DETECTION`. |
| **Workspace** | The `.ai/task-manager/` directory tree containing plans, archive, config, hooks, and templates. Created by `init`. |
| **Archive** | The `archive/` subdirectory inside the workspace where completed plans are moved for historical reference. |

---

## CLI Reference

AI Task Manager has two distribution channels: the **CLI** (workspace bootstrapping and plan management) and the **skills installer** (workflow delivery). They are independently re-runnable; the only coupling point is the workspace schema version.

### Workspace Initialization

```bash
npx @e0ipso/ai-task-manager init --harnesses <harness>[,<harness>...] [options]
```

Creates the shared `.ai/task-manager/` directory (plans, archive, config, hooks, templates) and copies harness-specific artifacts (e.g., `.claude/agents/` for Claude).

**Required flag:**

| Flag | Description |
|------|-------------|
| `--harnesses <list>` | Comma-separated harness names. Controls which per-harness artifacts are copied. Accepted values: `claude`, `gemini`, `opencode`, `codex`, `github`, `cursor`. |

**Optional flags:**

| Flag | Description |
|------|-------------|
| `--destination-directory <path>` | Target directory for the workspace. Defaults to the current working directory. |
| `--force` | Overwrite all files without prompting, even if the user has customized them. Useful for CI/automation. |

**File conflict detection:** On re-run, `init` compares file hashes against `.ai/task-manager/.init-metadata.json`. Unchanged files are updated silently; modified files trigger a unified-diff prompt. Use `--force` to bypass prompts.

**Examples:**

```bash
# Single harness
npx @e0ipso/ai-task-manager init --harnesses claude

# Multiple harnesses
npx @e0ipso/ai-task-manager init --harnesses claude,gemini,codex

# Target a different directory
npx @e0ipso/ai-task-manager init --harnesses claude --destination-directory /path/to/project

# Force overwrite (automation)
npx @e0ipso/ai-task-manager init --harnesses claude --force
```

### Plan Management

```bash
npx @e0ipso/ai-task-manager plan <subcommand> <plan-id>
```

**Subcommands:**

| Subcommand | Description |
|-----------|-------------|
| `show <plan-id>` | Display plan metadata, executive summary, and task progress. `plan <id>` is shorthand for `plan show <id>`. |
| `archive <plan-id>` | Move a completed plan from `plans/` to `archive/`. |
| `delete <plan-id>` | Permanently delete a plan and all associated tasks. Cannot be undone. |

Plan IDs are numeric. Commands work on both active and archived plans.

### Status Dashboard

```bash
npx @e0ipso/ai-task-manager status
```

Displays summary statistics (total plans, active/archived counts, completion rates), active plans with progress bars, and alerts for unfinished tasks in archived plans.

### Skill Installation

```bash
npx skills add e0ipso/ai-task-manager
```

Installs the Agent Skills that implement the three-step workflow. Skills are fetched from the repository's tagged release via the `.claude-plugin/plugin.json` manifest.

**Pin a specific version:**

```bash
npx skills add e0ipso/ai-task-manager@<tag>
```

**Update skills:**

Re-run the same command to pull the latest version.

### Skill Removal

```bash
npx skills remove e0ipso/ai-task-manager
```

Removes the installed Agent Skills. The `.ai/task-manager/` workspace, plans, and configuration are not affected.

### Shipped Skills

| Skill | Purpose |
|-------|---------|
| `task-create-plan` | Strategic plan creation with mandatory clarification gates. |
| `task-generate-tasks` | Task decomposition with dependency mapping and skill assignments. |
| `task-execute-blueprint` | Execution orchestration across all tasks in a plan. |
| `task-refine-plan` | Plan refinement loop with interactive and autonomous clarification modes. |
| `task-execute-task` | Single-task execution with dependency and status checks. |
| `task-full-workflow` | End-to-end orchestration chaining all three steps. |

---

## Frequently Asked Questions

### Setup and Installation

**Does AI Task Manager require API keys or additional costs?**

No. It works within your existing AI assistant subscriptions (Claude Pro/Max, Gemini, GitHub Copilot, Codex, Open Code). No API keys, no pay-per-token charges, no external service dependencies.

**How long does setup take?**

Under 30 seconds. Run `npx @e0ipso/ai-task-manager init --harnesses claude` followed by `npx skills add e0ipso/ai-task-manager`, and the workspace is ready.

**Does it work with existing projects?**

Yes. The `init` command merges with existing project structures without breaking existing files. Hash-based conflict detection preserves your customizations on re-init.

**Can I use multiple AI assistants on the same project?**

Yes. Initialize with multiple harnesses (`--harnesses claude,gemini,codex`). All harnesses share the same plans, tasks, and configuration. Team members can use different harnesses while collaborating.

### Workflow

**What is the three-step workflow?**

1. **Planning**: The `task-create-plan` skill refines your work order into a comprehensive plan.
2. **Task generation**: The `task-generate-tasks` skill decomposes the plan into an execution blueprint -- atomic tasks organized into dependency-mapped phases.
3. **Execution**: The `task-execute-blueprint` skill implements each task using sub-agents with focused context.

Each step produces files in `.ai/task-manager/plans/` for human review before the next step begins.

**Do I have to use all three steps?**

No. You can use only plan creation without task generation, generate tasks without executing, execute specific tasks manually, or skip steps that do not apply. The three-step workflow is recommended but not mandatory.

**What if I want fully automated execution?**

The `task-full-workflow` skill chains all three steps in a single invocation. It is best suited for well-defined features with clear scope. For complex features that need review between steps, use the manual step-by-step workflow.

**How does AI Task Manager relate to plan mode?**

It augments plan mode rather than replacing it. The output of your assistant's built-in plan mode is often a useful starting point -- feed it into the `task-create-plan` skill for structured refinement.

### Customization

**Can I customize the workflow?**

Yes. Nine lifecycle hooks, four templates, and project-context files are all editable Markdown. See the [Customization Guide](customization.html) for examples.

**What file formats does it use?**

All configuration, plans, tasks, hooks, and templates are Markdown (`.md`) with YAML frontmatter where applicable. No proprietary formats.

### Architecture

**How does context isolation work?**

Each step and each task runs with a focused context window. The planning step sees only the work order. Task generation sees only the plan. During execution, each sub-agent receives only the single task it is executing plus its declared dependencies -- not the full plan or other tasks. This prevents the context window from growing unboundedly across a complex project.

**What happens when a task fails during execution?**

The `POST_ERROR_DETECTION` hook fires, enabling custom remediation logic. The task status is set to `failed`, and dependent tasks are not started. You can fix the issue and re-run execution.

**How are tasks executed in parallel?**

Tasks within the same phase have no mutual dependencies and execute concurrently via sub-agents. Phases themselves run in sequence, so a phase starts only after all tasks in the previous phase have completed.

### Comparison with Other Tools

**How does AI Task Manager differ from API-based tools like Plandex or Claude Task Master?**

API-based tools require separate service setup, API keys, and pay-per-token pricing. AI Task Manager works within your existing subscription at no additional cost. It uses file-based configuration (editable Markdown) rather than API configuration, and most operations work offline.

**When should I use plan mode instead of AI Task Manager?**

Use plan mode for simple tasks (fewer than 3 steps) with clear requirements where scope creep is not a concern and the AI can complete the work in one session. Use AI Task Manager for complex multi-step projects, tight scope control, multi-session work, or when you need review gates between planning and execution.
