---
layout: default
title: Basic Workflow Guide
nav_order: 3
parent: Getting Started
description: "Day-to-day workflow with AI Task Manager"
---

# 🔄 Basic Workflow Guide

This guide covers the day-to-day development workflow using AI Task Manager. The workflow is delivered through Agent Skills installed via `npx skills add e0ipso/ai-task-manager`; you invoke each step by asking your assistant in plain language, and the matching skill loads automatically.

## One-Time Setup

Before creating your first plan, customize the configuration files for your project:

### 1. Review TASK_MANAGER.md

Edit `.ai/task-manager/config/TASK_MANAGER.md` to include:
- Your tech stack and frameworks
- Coding standards and style guides
- Architecture decisions and patterns
- Links to relevant documentation

### 2. Configure POST_PHASE.md

Edit `.ai/task-manager/config/hooks/POST_PHASE.md` to add quality gates:
- Linting requirements
- Test execution and coverage thresholds
- Security scans
- Documentation requirements

See the [Customization Guide](customization.html) for detailed examples.

## Daily Development Workflow

Install skills, then ask your assistant to plan, decompose, and execute. Review the artifacts in `.ai/task-manager/plans/` between steps. The short version: each phase corresponds to a skill (`task-create-plan`, `task-generate-tasks`, `task-execute-blueprint`), and skills load on intent — you do not type slash commands.

### Automated Workflow (Alternative)

For a streamlined experience, ask your assistant to run the full task-manager workflow end-to-end. The `task-full-workflow` skill chains the three phases together:

**What happens:**
- Creates plan with clarification questions (Phase 1)
- Automatically generates tasks (Phase 2)
- Executes blueprint with validation gates (Phase 3)
- Archives completed plan

**When to use:**
- Clear requirements with minimal ambiguity
- Prefer automation over manual review gates
- Quick prototyping or straightforward features

**When to use the step-by-step workflow:**
- Complex features needing careful planning review
- Requirements need significant refinement
- Want to review/edit tasks before execution

For the step-by-step workflow, follow the process below.

### Step 1: Create a Plan

Start any new feature or project by asking your assistant to plan it, for example:

> Use the task-manager workflow to plan user authentication with email/password and JWT tokens.

The `task-create-plan` skill loads and:
- Asks clarifying questions about your requirements
- Creates a comprehensive plan document with:
  - Clarified requirements
  - Technical approach
  - Risk considerations
  - Success criteria

**Plan location**: `.ai/task-manager/plans/01--user-authentication/plan-01--user-authentication.md`

### Step 2: Provide Additional Context (Optional)

If the assistant needs more information:

```
The authentication should:
- Use bcrypt for password hashing
- Issue JWT tokens with 1-hour expiration
- Include refresh token mechanism
- Follow OAuth 2.0 best practices for token handling
```

The assistant updates the plan with this additional context.

### Step 3: Invite a Plan Reviewer (Optional but Recommended)

Ask a second assistant (or the same one in a new session) to refine plan 1. The `task-refine-plan` skill:

- Loads assistant configuration and validates the plan path
- Reviews every section for gaps (context, technical design, risks, scope creep)
- Asks targeted clarifying questions and logs answers inside the "Plan Clarifications" table
- Updates diagrams/sections directly in the plan using the standard template
- Adds a change log entry so you know what changed before task generation

Use this step to enable a "two LLMs" feedback loop: one assistant drafts the plan, another challenges it and tightens the scope.

### Step 4: ⚠️ Review the Plan (CRITICAL)

**Do not skip this step!**

Open the plan document and verify:
- ✅ All requirements accurately captured
- ✅ No unnecessary features added (scope creep check)
- ✅ Technical approach aligns with your architecture
- ✅ Success criteria are measurable

**Edit the plan directly** if anything needs adjustment. This is YOUR plan, not just the AI's.

### Step 5: Generate Tasks

Once the plan is reviewed and approved, ask your assistant to decompose plan 1 into tasks. The `task-generate-tasks` skill:

- Breaks the plan into atomic tasks
- Assigns each task 1-2 technical skills
- Maps dependencies automatically
- Generates an execution blueprint with phases

**Tasks location**: `.ai/task-manager/plans/01--user-authentication/tasks/`

### Step 6: ⚠️ Review Tasks (CRITICAL)

**This step prevents scope creep and ensures quality.**

Review all generated tasks in `.ai/task-manager/plans/01--user-authentication/tasks/`:
- Check each task's acceptance criteria
- Verify dependencies make sense
- Remove any tasks outside core scope
- Adjust complexity if tasks are too large

**Common adjustments:**
- Delete "nice-to-have" tasks not in original requirements
- Split overly complex tasks (3+ skills = too complex)
- Clarify vague acceptance criteria
- Add project-specific validation steps

### Step 7: Execute the Blueprint

After reviewing and approving tasks, ask your assistant to execute the blueprint for plan 1. The `task-execute-blueprint` skill:

- Executes tasks phase by phase
- Runs independent tasks in parallel within each phase
- Invokes the POST_PHASE hook to validate quality after each phase
- Creates commits automatically for each phase
- Reports updates as phases complete

**Note**: If you skipped Step 5, the execute-blueprint skill will automatically generate tasks and the blueprint for you before starting execution.

### Step 8: Monitor Progress

Check implementation status anytime:

```bash
npx @e0ipso/ai-task-manager status
```

**Dashboard shows:**
- Summary statistics (total plans, active/archived)
- Active plans with progress bars
- Task completion counts
- Warnings for archived plans with incomplete tasks

![Dashboard](img/dashboard.svg)

### Step 9: Fix Broken Tests (If Needed)

If tests fail after implementation, ask your assistant to fix the broken tests by running `npm test` (or your project's test command). The `fix-broken-tests` skill enforces test integrity — it will **NOT** allow:

- Skipping tests
- Modifying assertions to match broken code
- Adding environment checks to bypass tests
- Any workarounds that don't fix the actual bug

**What it WILL do:**
- Find root cause in implementation
- Fix the actual bug
- Ensure tests pass because code truly works

See [Customization Guide](customization.html) for fix-broken-tests details.

### Step 10: Review Implementation

After execution completes:
- Review generated code for quality
- Run full test suite locally
- Check git commits (one per phase)
- Verify success criteria from plan are met

## Advanced Workflows

For more sophisticated patterns, see [Workflow Patterns](workflows.html):
- **Plan Mode Integration**: Combine AI brainstorming with structured execution
- **Iterative Refinement**: Multiple feedback rounds
- **Multi-Session Projects**: Large projects spanning days/weeks
- **Parallel Development**: Team coordination with dependency graphs

## Troubleshooting

### Permission Errors During Initialization

**Error**: File system permission errors when running `init`

**Solutions**:
- Ensure write permissions to target directory
- On Unix systems: `ls -la` to check directory ownership
- Try running in user-owned directory
- Avoid system directories (/usr, /etc, etc.)

### ID Generation Issues

**Error**: Plan or task ID conflicts or missing IDs

**Debugging**:
```bash
DEBUG=true node .ai/task-manager/config/scripts/get-next-plan-id.cjs
```

**Solutions**:
- Verify directory structure intact (.ai/task-manager/plans/)
- Check file permissions on plans directory
- Ensure plan documents have proper frontmatter with `id:` field
- Align directory names with plan IDs (e.g., `01--name` matches `id: 1`)

### Jekyll Build Errors in Documentation

**Error**: Documentation site won't build locally

**Solutions**:
```bash
cd docs
bundle install           # Install dependencies
bundle exec jekyll build # Test build
bundle exec jekyll serve # Run locally
```

- Check for broken internal links
- Verify all frontmatter is valid YAML
- Ensure no duplicate nav_order values

### Tasks Not Executing in Expected Order

**Issue**: Dependencies not respected during execution

**Solutions**:
- Review dependency graph in plan's execution blueprint
- Check task frontmatter for `dependencies: [list]`
- Verify circular dependencies don't exist
- Run dependency validation:
  ```bash
  node .ai/task-manager/config/scripts/check-task-dependencies.cjs 1 2
  ```

### Customization Not Applied

**Issue**: Hook or template changes not reflected in execution

**Solutions**:
- Verify file locations (.ai/task-manager/config/hooks/, .ai/task-manager/config/templates/)
- Check file permissions (files must be readable)
- Review hook syntax (must be valid Markdown)
- Restart AI assistant session after major customization changes

## Tips for Success

### 1. Always Review Plans and Tasks

The review steps exist to catch:
- Scope creep (AI adding unnecessary features)
- Missing requirements (AI missing important details)
- Technical misalignment (AI choosing wrong approach)

**Five minutes of review saves hours of rework.**

### 2. Start Small

For your first few plans:
- Choose simple, well-defined features
- Create 3-5 tasks, not 30-50
- Get comfortable with the workflow
- Learn which hooks to customize

### 3. Commit After Each Phase

AI Task Manager creates commits automatically, but you can:
- Review commit messages before pushing
- Squash commits if desired
- Create pull requests per phase or per plan

### 4. Use Status Command Frequently

```bash
npx @e0ipso/ai-task-manager status
```

Helps you:
- Track progress across multiple plans
- Identify stalled tasks
- Find plans that need attention
- Monitor team activity (if shared repository)

### 5. Archive Completed Plans

Keep active workspace clean:

```bash
npx @e0ipso/ai-task-manager plan archive 01
```

Archived plans:
- Remain fully accessible
- Don't clutter status dashboard
- Preserve implementation history
- Can be referenced for future work

## Plan Management Commands

Inspect and manage plans using CLI commands:

```bash
# View plan details and progress
npx @e0ipso/ai-task-manager plan show 41
npx @e0ipso/ai-task-manager plan 41  # shorthand

# Move completed plan to archive
npx @e0ipso/ai-task-manager plan archive 41

# Permanently delete a plan
npx @e0ipso/ai-task-manager plan delete 41
```

**plan show** displays:
- Plan metadata (ID, summary, creation date)
- Executive summary excerpt
- Task progress (completed/total tasks)
- Plan location in filesystem

**plan archive** moves the entire plan directory from `plans/` to `archive/` while preserving all tasks and history.

**plan delete** permanently removes the plan and all associated tasks. Use with caution.

See [Features](features.html) for more details on plan management capabilities.

## Next Steps

- **[How It Works](architecture.html)**: Understand the three-phase system and design principles
- **[Customization Guide](customization.html)**: Tailor hooks and templates for your project
- **[Workflow Patterns](workflows.html)**: Advanced patterns for complex projects
- **[Features](features.html)**: Full feature overview and capabilities
