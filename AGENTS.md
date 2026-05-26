# AGENTS.md

This file provides comprehensive guidance to AI assistants when working with this repository. It serves as the primary context source for AI-assisted development.

## Quick Start Guide

### Essential Commands
```bash
# Build and run
npm run build && npm start init --harnesses claude

# Development workflow
npm run dev           # Watch mode compilation
npm test              # Run test suite
npm run lint:fix      # Auto-fix code style issues
```

### Project Initialization
```bash
# Bootstrap the .ai/task-manager/ workspace (Claude agents copied too)
npx . init --harnesses claude --destination-directory /path/to/project

# Update existing (customizations auto-protected)
npx . init --harnesses claude --destination-directory /path/to/project

# Force overwrite all
npx . init --harnesses claude --destination-directory /path/to/project --force
```

The workflow itself is delivered as Agent Skills, not slash commands. Install them once with `npx skills add e0ipso/ai-task-manager`; users then invoke the workflow by intent and the matching skill auto-loads.

### File Conflict Detection

The init command uses hash-based tracking to protect user customizations:
- Creates `.ai/task-manager/.init-metadata.json` with SHA-256 file hashes
- Compares current vs original hashes to detect user modifications
- Use `--force` flag to bypass prompts in automation

---

## Glossary

- **Work order** — The user's request describing what they want accomplished.
- **Plan** — Comprehensive document covering requirements, architecture, risks, and success criteria.
- **Execution blueprint** — All tasks organized into dependency-mapped phases. Output of task generation.
- **Phase** — A group of tasks that execute in parallel. Phases run in sequence.
- **Task** — An atomic unit of work with 1-2 skills and clear acceptance criteria. Executed by a sub-agent.
- **Sub-agent** — A specialized AI agent executing a single task with focused, clean context.

---

## Project Overview

### Purpose and Scope

This CLI tool initializes AI-assisted development environments with hierarchical task management systems. It creates structured workflows that transform complex programming requests into manageable, validated implementations through progressive refinement and atomic task decomposition.

### Core Value Proposition

- **Cognitive Load Management**: Prevents AI context overload through staged processing
- **Scope Control**: Enforces YAGNI principles and prevents feature creep
- **Quality Assurance**: Ensures working code through integrity-focused testing
- **Harness-Agnostic Delivery**: Skills work uniformly across any harness that supports the Agent Skills format

---

## AI Task Management System

### Three-Step Workflow

The system implements a specialized workflow optimized for AI cognitive constraints. Each step is delivered as an Agent Skill that the assistant auto-loads when the user's request matches its description.

#### Step 1: Strategic Planning (`task-create-plan` skill)
- **Focus**: Context gathering and requirement clarification
- **Output**: Comprehensive plan with mandatory clarification gates
- **Prevents**: Assumption-based planning and scope ambiguity

#### Step 2: Task Decomposition (`task-generate-tasks` skill)
- **Focus**: Breaking complexity into atomic units
- **Output**: Dependency-mapped tasks with skill assignments
- **Enforces**: 20-30% task reduction and 1-2 skill maximum per task

#### Step 3: Execution (`task-execute-blueprint` skill)
- **Focus**: Current task implementation with minimal context
- **Output**: Working functionality with quality gates
- **Implements**: Dependency-aware parallelism and quality control

#### Plan Review Loop (`task-refine-plan` skill)
- **Focus**: Run a feedback cycle between assistants by interrogating an existing plan
- **Output**: Updated plan document with clarified requirements, refreshed diagrams, and documented outstanding questions
- **Purpose**: Bridges plan creation and task generation when a second assistant should "red team" the plan, ask questions, and apply the refinements

The end-to-end `task-full-workflow` skill chains all three steps for hands-off runs. The `task-execute-task` skill handles single-task execution.

### Key Design Principles

#### Atomic Task Decomposition
- **Maximum 2 skills per task**: Prevents over-complexity
- **Automatic skill inference**: Context-based task categorization  
- **Dependency mapping**: Clear prerequisite relationships
- **Subdivision triggers**: 3+ skills indicate need for task breakdown

#### Scope Control (YAGNI Enforcement)
- **Anti-pattern enumeration**: Identifies common scope expansion behaviors
- **Question-based validation**: "Is this explicitly mentioned?" decision framework
- **Quantified minimization**: 20-30% reduction targets from comprehensive lists
- **Requirement traceability**: Every task links to explicit user requirements

#### Test Philosophy: "Write a Few Tests, Mostly Integration"
- **Selective coverage**: Focus on meaningful tests, not complete coverage
- **Integration-heavy**: Real filesystem operations over mocking
- **Business logic focus**: Custom logic, critical workflows, edge cases
- **Framework avoidance**: Don't test third-party library features

---

## Skills Layer

The repository ships Agent Skills under `templates/harness/skills/<name>/` at the repo root. There is no top-level `skills/` directory; compiled `.cjs` bundles live under each per-skill `scripts/` directory, and `SKILL.md` files are assembled from source templates at build time. Skills are harness-agnostic — a single `SKILL.md` works for every harness that supports the Agent Skills format. Skill directories are flat (no nested skills).

The shipping skills are:

- `task-create-plan` (`templates/harness/skills/task-create-plan/`) — strategic plan creation with mandatory clarification gates.
- `task-generate-tasks` (`templates/harness/skills/task-generate-tasks/`) — task decomposition with dependency mapping and skill assignments.
- `task-execute-blueprint` (`templates/harness/skills/task-execute-blueprint/`) — execution orchestration across all tasks in a plan.
- `task-refine-plan` (`templates/harness/skills/task-refine-plan/`) — plan refinement loop with interactive and autonomous clarification modes.
- `task-execute-task` (`templates/harness/skills/task-execute-task/`) — single-task execution.
- `task-full-workflow` (`templates/harness/skills/task-full-workflow/`) — end-to-end orchestration chaining the three steps (plan creation, task generation, blueprint execution) with context passing, progress indicators, and auto-generation fallback.

### TypeScript source of truth

Executable logic each skill needs at runtime is authored once in TypeScript under `src/skill-scripts/`. Shared helpers (frontmatter parsing, plan/archive scanning, root discovery) live in `src/skill-scripts/shared/` so future skills can reuse them. The subtree type-checks via `tsconfig.skill-scripts.json` and lints with the rest of `src/`, but its output is produced by the bundler, not by `tsc`. The main `tsconfig.json` excludes `src/skill-scripts/**` from emit so `dist/` stays the CLI's domain.

### Prompt source of truth

Each skill's `SKILL.md` prompt is assembled at build time from source templates in `src/skill-prompts/`. Shared procedural blocks (root discovery, plan resolution, phase execution loop, test philosophy, task minimization, etc.) live in `src/skill-prompts/sections/` and are referenced via `{{include sections/<name>.md}}` directives. Per-skill differences are handled with `{{variable}}` substitution from the source template's YAML frontmatter `vars` block. See `src/skill-prompts/README.md` for editing and authoring details.

### Build pipeline

`npm run build` runs the TypeScript compile, then `npm run build:skills`, then `npm run build:skill-prompts`:

1. Type-checks `src/skill-scripts/` with `tsc --noEmit -p tsconfig.skill-scripts.json`.
2. Invokes `scripts/build-skills.cjs`, an `esbuild`-driven script that bundles each registered entrypoint into a self-contained `.cjs` file emitted directly into `templates/harness/skills/<skill>/scripts/`. There is no copy pass — source and output share the same per-skill tree.
3. Invokes `scripts/build-skill-prompts.cjs`, which resolves `{{include}}` directives and `{{variable}}` substitutions in source templates from `src/skill-prompts/`, writing assembled `SKILL.md` files to `templates/harness/skills/<skill>/SKILL.md`. Post-build validation fails on unresolved directives, missing frontmatter fields, or absent `## Operating Procedure` headings.

The entrypoint → skill mapping is the `SKILL_ENTRYPOINTS` array at the top of `scripts/build-skills.cjs`, which currently registers six shipping skills. To add a future skill: drop a TypeScript entrypoint under `src/skill-scripts/`, add an entry to `SKILL_ENTRYPOINTS`, add the skill's path to `.claude-plugin/plugin.json`, create a source template in `src/skill-prompts/`, and `npm run build` produces both the bundled `.cjs` and assembled `SKILL.md` alongside the skill. No other plumbing changes are needed.

Generated `.cjs` files under `templates/harness/skills/*/scripts/` and assembled `SKILL.md` files under `templates/harness/skills/*/` are git-ignored on `main` and force-added into the release commit by `@semantic-release/git` (which uses `git add --force`). They ship in the published npm package via the `files: ["templates/"]` entry in `package.json`, which already covers all skill content (verify with `npm pack --dry-run`).

### Distribution

Skills are distributed via [vercel-labs/skills](https://github.com/vercel-labs/skills), a generic Anthropic-adjacent installer. It discovers skills in this repo by reading `.claude-plugin/plugin.json` at the repo root, which declares each skill's path under `templates/harness/skills/<name>/`. The manifest is a JSON file with a `skills:` array of `./templates/harness/skills/<name>` entries (the leading `./` is required) and an optional `name` grouping label. Users run `npx skills add e0ipso/ai-task-manager` (or `…@<tag>` to pin) and the installer reads the tagged release ref. `npx @e0ipso/ai-task-manager init` does **not** copy skills — it bootstraps the `.ai/task-manager/` workspace only. The two channels are independently re-runnable; the only coupling point is the schema-version contract below.

Note the semantic distinction between the two sibling directories under `templates/harness/`: `templates/harness/skills/` is build/install-time content read by the installer at `npx skills add` time, while `templates/harness/agents/` is per-project init-time content copied into `.claude/agents/` by `npx . init`. The CLI's `init` does not read `templates/harness/skills/`.

### Schema Version Contract

`.ai/task-manager/.init-metadata.json` carries a `workspaceSchemaVersion` integer (initial value `1`). It is distinct from the CLI's `version` string and changes only when the workspace shape (hook names, required templates, directory structure) changes incompatibly. The single source of truth is `CURRENT_WORKSPACE_SCHEMA_VERSION` in `src/metadata.ts`.

Skills bake an `EXPECTED_WORKSPACE_SCHEMA_VERSION` literal into each shipped `.cjs` bundle via esbuild's `define`. At runtime, the resolver in `src/skill-scripts/shared/root.ts` compares the workspace value against the baked value:

- **Workspace older than skill** (`<actual>` < `<expected>`):
  `Workspace schema v<N> is older than this skill requires (v<M>). Re-run \`npx @e0ipso/ai-task-manager init\` with the latest CLI to update.`
- **Workspace newer than skill** (`<actual>` > `<expected>`):
  `This skill (built for workspace schema v<M>) is older than the workspace (v<N>). Re-run \`npx skills add e0ipso/ai-task-manager\` to update skills.`

Absent `workspaceSchemaVersion` values in older metadata files are backfilled to `1` on read by both the CLI loader and the skill-side check, so already-deployed workspaces are not broken by the field's introduction. Bump the constant only when the workspace shape genuinely changes incompatibly; the documented upgrade path is to re-run `init` (no dedicated `migrate` subcommand exists).

A post-build smoke assertion in `scripts/build-skills.cjs` fails the build if the literal string `EXPECTED_WORKSPACE_SCHEMA_VERSION` survives substitution into any bundled `.cjs` file — catching mistakes where the identifier reference would silently fall back to the runtime default.

### GitHub Releases

Releases are handled by `semantic-release` via `.github/workflows/release.yml`, triggered on push to `main`. The workflow runs `npm ci && npm run build && npm test`, then `npx semantic-release` which: analyzes commits, bumps the version, publishes to npm, and creates a GitHub release with a git tag. The `@semantic-release/git` plugin's `assets` glob includes `templates/harness/skills/*/scripts/*.cjs` and `templates/harness/skills/*/SKILL.md`, so the otherwise git-ignored bundles and assembled prompts are force-added into the release commit. The tagged ref is self-contained so `npx skills add e0ipso/ai-task-manager@<tag>` resolves a fully installable input.

Verify the invariant:

```bash
git ls-tree -r v<tag> -- 'templates/harness/skills/*/scripts/*.cjs'   # expect: bundles listed
git ls-tree -r v<tag> -- 'templates/harness/skills/*/SKILL.md'        # expect: prompts listed
```

Release commits are labeled `chore(release):` in the subject and carry `[skip ci]` to avoid re-triggering the workflow.

---

## Directory Structure and Organization

### Core Directory Structure
```
project/
├── .ai/task-manager/              # Shared workspace (harness-agnostic)
│   ├── plans/                     # Active plans with tasks/
│   │   └── 28--plan-name/
│   │       ├── plan-28--plan-name.md
│   │       └── tasks/
│   │           ├── 01--task-one.md
│   │           └── 02--task-two.md
│   ├── archive/                   # Completed plans
│   ├── config/
│   │   ├── TASK_MANAGER.md        # Project context
│   │   ├── hooks/                 # Lifecycle hooks (PRE_PLAN, POST_PLAN, PRE_PHASE, POST_PHASE, PRE_TASK_ASSIGNMENT, PRE_TASK_EXECUTION, POST_TASK_GENERATION_ALL, POST_EXECUTION, POST_ERROR_DETECTION)
│   │   └── templates/             # Customizable (PLAN_TEMPLATE.md, TASK_TEMPLATE.md)
└── .claude/agents/                # Claude-only sub-agents copied by `init`
```

The workflow itself is delivered through Agent Skills (installed via `npx skills add e0ipso/ai-task-manager`). The CLI's `init` does not emit per-harness command or prompt directories.

### Archive System and Lifecycle Management

#### Purpose and Benefits
- **Organization**: Clean active workspace with historical preservation
- **Reference**: Past implementations available for pattern reuse
- **ID Management**: Prevents conflicts through continuous numbering
- **Compliance**: Maintains audit trail of project evolution

#### Archival Process
```bash
# Manual archival after completion
mv .ai/task-manager/plans/25--completed-plan .ai/task-manager/archive/
```

---

## Development Workflow

### Standard Development Commands

#### Build and Development
```bash
npm run build        # TypeScript compilation to dist/
npm run dev          # Watch mode with automatic recompilation  
npm run clean        # Remove dist/ directory
npm start            # Execute compiled CLI (requires build first)
```

#### Testing and Quality Assurance
```bash
npm test             # Run test suite
npm run test:watch   # Tests in watch mode for development
npm run lint         # ESLint validation (excludes test files)
npm run lint:fix     # Automated lint fixes
npm run format       # Prettier code formatting
```

#### Security and Maintenance
```bash
npm run security:audit        # Standard security audit
npm run security:audit-json   # JSON formatted audit output  
npm run security:fix          # Automated security fixes
npm run security:fix-force    # Force fixes for critical issues
npm run prepublishOnly        # Pre-publish validation (auto-runs)
```

### Testing Philosophy

#### Test File Organization
- `src/__tests__/utils.test.ts`: Business logic validation
- `src/__tests__/cli.integration.test.ts`: End-to-end workflows
- `src/__tests__/get-next-plan-id.test.ts`: ID generation validation

#### Testing Guidelines
**DO Test**:
- Data transformation and validation logic
- Complex business rules and algorithms
- Error scenarios and edge cases
- Integration points and workflows
- Critical path functionality

**DON'T Test**:
- Simple getters/setters
- Third-party library features
- Framework-provided functionality
- Obvious utility functions
- Trivial CRUD operations

### Adding New Harness Support

Skills are harness-agnostic — any harness that supports the Agent Skills format consumes the same `SKILL.md` content. No code or template changes are required to support a new harness. Users install skills via `npx skills add e0ipso/ai-task-manager`.

## Template Customization

### Plan Template Structure

**YAML Frontmatter**:
```yaml
id: [planId]
summary: "[userPrompt]"
created: "YYYY-MM-DD"
```

**Core Sections**:
- Original Work Order
- Plan Clarifications  
- Executive Summary
- Context and Background
- Technical Implementation Approach
- Risk Considerations
- Success Criteria
- Resource Requirements

### Task Template Structure

**YAML Frontmatter**:
```yaml
id: [task-number]
group: "[logical-grouping]"
dependencies: [list-of-task-ids]
status: "pending"
created: "YYYY-MM-DD"
skills: ["skill-1", "skill-2"]
```

**Core Sections**:
- Objective
- Skills Required
- Acceptance Criteria
- Technical Requirements
- Input Dependencies
- Output Artifacts
- Implementation Notes

### Customization Guidelines

Edit base templates at:
- `/workspace/templates/ai-task-manager/config/templates/PLAN_TEMPLATE.md`
- `/workspace/templates/ai-task-manager/config/templates/TASK_TEMPLATE.md`

**Best Practices**:
- Maintain YAML frontmatter format
- Preserve core metadata fields
- Use lowercase for bash variables (`task_count`, `plan_id`)
- Template placeholders `$ARGUMENTS` and `$1` are exceptions (not bash variables)

**Validate changes**:
```bash
npm run build
node dist/cli.js init --harnesses claude --destination-directory /tmp/test
```

---

## Error Handling and Troubleshooting

### Common Issues and Solutions

#### Template Processing Errors
**Symptoms**: Malformed frontmatter, missing variables
**Debugging**: Check template syntax, validate frontmatter format, verify variable names
**Solutions**: Use standard frontmatter, test variable substitution

#### Skill Schema-Version Mismatches
**Symptoms**: Skill bundles refuse to run with a workspace-vs-skill version error
**Debugging**: Read the error message — it names the direction of the mismatch
**Solutions**: Re-run `npx @e0ipso/ai-task-manager init` (workspace behind skill) or `npx skills add e0ipso/ai-task-manager` (skill behind workspace)

### Error Handling Architecture

#### Custom Error Classes
```typescript
// From src/types.ts
FileSystemError    // File operation failures
ConfigError        // Configuration validation issues  
TemplateError      // Template processing problems
HarnessError       // Harness validation failures
```

#### Error Recovery Strategies
- **Graceful Degradation**: Continue operation when possible
- **Detailed Logging**: Provide context for debugging
- **User-Friendly Messages**: Clear guidance for resolution
- **Fail-Fast**: Stop early for critical errors

---

<!-- >>> @e0ipso/ai-knowledge-base:kb-index >>> -->
Curated project knowledge lives in [.ai/knowledge-base/INDEX.md](.ai/knowledge-base/INDEX.md). Consult it before designing a non-trivial change.
<!-- <<< @e0ipso/ai-knowledge-base:kb-index <<< -->
