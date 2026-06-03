---
layout: default
title: FAQ
nav_order: 5
description: "Frequently asked questions about Strikethroo"
---

# Frequently Asked Questions

## Setup and Installation

**Does Strikethroo require API keys or additional costs?**

No. It works within your existing AI assistant subscriptions (Claude Pro/Max, Gemini, GitHub Copilot, Codex, Open Code). No API keys, no pay-per-token charges, no external service dependencies.

**How long does setup take?**

Under 30 seconds. Run `npx strikethroo init --harnesses claude` followed by `npx skills add e0ipso/strikethroo`, and the workspace is ready.

**Does it work with existing projects?**

Yes. The `init` command merges with existing project structures without breaking existing files. Hash-based conflict detection preserves your customizations on re-init.

**Can I use multiple AI assistants on the same project?**

Yes. Initialize with multiple harnesses (`--harnesses claude,gemini,codex`). All harnesses share the same plans, tasks, and configuration. Team members can use different harnesses while collaborating.

## Workflow

**What is the three-step workflow?**

1. **Planning**: The `st-create-plan` skill refines your work order into a comprehensive plan.
2. **Task generation**: The `st-generate-tasks` skill decomposes the plan into an execution blueprint -- atomic tasks organized into dependency-mapped phases.
3. **Execution**: The `st-execute-blueprint` skill implements each task using sub-agents with focused context.

Each step produces files in `.ai/strikethroo/plans/` for human review before the next step begins.

**Do I have to use all three steps?**

No. You can use only plan creation without task generation, generate tasks without executing, execute specific tasks manually, or skip steps that do not apply. The three-step workflow is recommended but not mandatory.

**What if I want fully automated execution?**

The `st-full-workflow` skill chains all three steps in a single invocation. It is best suited for well-defined features with clear scope. For complex features that need review between steps, use the manual step-by-step workflow.

**How does Strikethroo relate to plan mode?**

It augments plan mode rather than replacing it. The output of your assistant's built-in plan mode is often a useful starting point -- feed it into the `st-create-plan` skill for structured refinement.

## Customization

**Can I customize the workflow?**

Yes. Nine lifecycle hooks, four templates, and project-context files are all editable Markdown. See the [Customization Guide](customization.html) for examples.

**What file formats does it use?**

All configuration, plans, tasks, hooks, and templates are Markdown (`.md`) with YAML frontmatter where applicable. No proprietary formats.

## Architecture

**How does context isolation work?**

Each step and each task runs with a focused context window. The planning step sees only the work order. Task generation sees only the plan. During execution, each sub-agent receives only the single task it is executing plus its declared dependencies -- not the full plan or other tasks. This prevents the context window from growing unboundedly across a complex project.

**What happens when a task fails during execution?**

The `POST_ERROR_DETECTION` hook fires, enabling custom remediation logic. The task status is set to `failed`, and dependent tasks are not started. You can fix the issue and re-run execution.

**How are tasks executed in parallel?**

Tasks within the same phase have no mutual dependencies and execute concurrently via sub-agents. Phases themselves run in sequence, so a phase starts only after all tasks in the previous phase have completed.

## Comparison with Other Tools

**How does Strikethroo differ from API-based tools like Plandex or Claude Task Master?**

API-based tools require separate service setup, API keys, and pay-per-token pricing. Strikethroo works within your existing subscription at no additional cost. It uses file-based configuration (editable Markdown) rather than API configuration, and most operations work offline.

**When should I use plan mode instead of Strikethroo?**

Use plan mode for simple tasks (fewer than 3 steps) with clear requirements where scope creep is not a concern and the AI can complete the work in one session. Use Strikethroo for complex multi-step projects, tight scope control, multi-session work, or when you need review gates between planning and execution.
