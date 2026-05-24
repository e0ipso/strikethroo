# AGENTS.md

This file provides comprehensive guidance to AI assistants when working with this repository. It serves as the primary context source for AI-assisted development.

## Quick Start Guide

### Essential Commands
```bash
# Build and run
npm run build && npm start init --assistants claude

# Development workflow
npm run dev           # Watch mode compilation
npm test              # Run test suite
npm run lint:fix      # Auto-fix code style issues
```

### Project Initialization
```bash
# Bootstrap the .ai/task-manager/ workspace (Claude agents copied too)
npx . init --assistants claude --destination-directory /path/to/project

# Update existing (customizations auto-protected)
npx . init --assistants claude --destination-directory /path/to/project

# Force overwrite all
npx . init --assistants claude --destination-directory /path/to/project --force
```

The workflow itself is delivered as Agent Skills, not slash commands. Install them once with `npx skills add e0ipso/ai-task-manager`; users then invoke the workflow by intent and the matching skill auto-loads.

### File Conflict Detection

The init command uses hash-based tracking to protect user customizations:
- Creates `.ai/task-manager/.init-metadata.json` with SHA-256 file hashes
- Compares current vs original hashes to detect user modifications
- Excludes `config/scripts/` directory from tracking
- Use `--force` flag to bypass prompts in automation

---

## Project Overview

### Purpose and Scope

This CLI tool initializes AI-assisted development environments with hierarchical task management systems. It creates structured workflows that transform complex programming requests into manageable, validated implementations through progressive refinement and atomic task decomposition.

### Core Value Proposition

- **Cognitive Load Management**: Prevents AI context overload through staged processing
- **Scope Control**: Enforces YAGNI principles and prevents feature creep
- **Quality Assurance**: Ensures working code through integrity-focused testing
- **Assistant-Agnostic Delivery**: Skills work uniformly across any assistant that supports the Agent Skills format

---

## AI Task Management System

### Three-Phase Progressive Refinement

The system implements a specialized workflow optimized for AI cognitive constraints. Each phase is delivered as an Agent Skill that the assistant auto-loads when the user's request matches its description.

#### Phase 1: Strategic Planning (`task-create-plan` skill)
- **Focus**: Context gathering and requirement clarification
- **Output**: Comprehensive plan with mandatory clarification gates
- **Prevents**: Assumption-based planning and scope ambiguity

#### Phase 2: Task Decomposition (`task-generate-tasks` skill)
- **Focus**: Breaking complexity into atomic units
- **Output**: Dependency-mapped tasks with skill assignments
- **Enforces**: 20-30% task reduction and 1-2 skill maximum per task

#### Phase 3: Execution (`task-execute-blueprint` skill)
- **Focus**: Current task implementation with minimal context
- **Output**: Working functionality with validation gates
- **Implements**: Dependency-aware parallelism and quality control

#### Plan Review Loop (`task-refine-plan` skill)
- **Focus**: Run a feedback cycle between assistants by interrogating an existing plan
- **Output**: Updated plan document with clarified requirements, refreshed diagrams, and documented outstanding questions
- **Purpose**: Bridges plan creation and task generation when a second assistant should "red team" the plan, ask questions, and apply the refinements

The end-to-end `task-full-workflow` skill chains all three phases for hands-off runs. The `task-execute-task` skill handles single-task execution.

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

The repository ships Agent Skills under `templates/assistant/skills/<name>/` at the repo root. There is no top-level `skills/` directory; authored content and compiled `.cjs` bundles coexist under each per-skill directory, with `scripts/` reserved for compiled output. Skills are assistant-agnostic — a single `SKILL.md` works for every assistant that supports the Agent Skills format. Skill directories are flat (no nested skills).

The shipping skills are:

- `task-create-plan` (`templates/assistant/skills/task-create-plan/`) — strategic plan creation with mandatory clarification gates.
- `task-generate-tasks` (`templates/assistant/skills/task-generate-tasks/`) — task decomposition with dependency mapping and skill assignments.
- `task-execute-blueprint` (`templates/assistant/skills/task-execute-blueprint/`) — execution orchestration across all tasks in a plan.
- `task-refine-plan` (`templates/assistant/skills/task-refine-plan/`) — plan refinement loop with interactive and autonomous clarification modes.
- `task-execute-task` (`templates/assistant/skills/task-execute-task/`) — single-task execution.
- `task-full-workflow` (`templates/assistant/skills/task-full-workflow/`) — end-to-end orchestration chaining the three phases (plan creation, task generation, blueprint execution) with context passing, progress indicators, and auto-generation fallback.

### TypeScript source of truth

Executable logic each skill needs at runtime is authored once in TypeScript under `src/skill-scripts/`. Shared helpers (frontmatter parsing, plan/archive scanning, root discovery) live in `src/skill-scripts/shared/` so future skills can reuse them. The subtree type-checks via `tsconfig.skill-scripts.json` and lints with the rest of `src/`, but its output is produced by the bundler, not by `tsc`. The main `tsconfig.json` excludes `src/skill-scripts/**` from emit so `dist/` stays the CLI's domain.

### Build pipeline

`npm run build` runs the TypeScript compile and then `npm run build:skills`, which:

1. Type-checks `src/skill-scripts/` with `tsc --noEmit -p tsconfig.skill-scripts.json`.
2. Invokes `scripts/build-skills.cjs`, an `esbuild`-driven script that bundles each registered entrypoint into a self-contained `.cjs` file emitted directly into `templates/assistant/skills/<skill>/scripts/`. There is no copy pass — source and output share the same per-skill tree.

The entrypoint → skill mapping is the `SKILL_ENTRYPOINTS` array at the top of `scripts/build-skills.cjs`, which currently registers six shipping skills. To add a future skill: drop a TypeScript entrypoint under `src/skill-scripts/`, add an entry to `SKILL_ENTRYPOINTS`, add the skill's path to `.claude-plugin/plugin.json`, and `npm run build` produces the bundled `.cjs` alongside the skill. No other plumbing changes are needed.

Generated `.cjs` files under `templates/assistant/skills/*/scripts/` are git-ignored on `main` (via the `templates/assistant/skills/*/scripts/` rule in `.gitignore`) and force-added only at release tags by the `release-skills.yml` workflow. They ship in the published npm package via the `files: ["templates/"]` entry in `package.json`, which already covers all skill content; the previously separate `"skills/"` entry was removed when the top-level `skills/` directory was eliminated (verify with `npm pack --dry-run`).

### Distribution

Skills are distributed via [vercel-labs/skills](https://github.com/vercel-labs/skills), a generic Anthropic-adjacent installer. It discovers skills in this repo by reading `.claude-plugin/plugin.json` at the repo root, which declares each skill's path under `templates/assistant/skills/<name>/`. The manifest is a JSON file with a `skills:` array of `./templates/assistant/skills/<name>` entries (the leading `./` is required) and an optional `name` grouping label. Users run `npx skills add e0ipso/ai-task-manager` (or `…@<tag>` to pin) and the installer reads the tagged release ref. `npx @e0ipso/ai-task-manager init` does **not** copy skills — it bootstraps the `.ai/task-manager/` workspace only. The two channels are independently re-runnable; the only coupling point is the schema-version contract below.

Note the semantic distinction between the two sibling directories under `templates/assistant/`: `templates/assistant/skills/` is build/install-time content read by the installer at `npx skills add` time, while `templates/assistant/agents/` is per-project init-time content copied into `.claude/agents/` by `npx . init`. The CLI's `init` does not read `templates/assistant/skills/`.

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

`.github/workflows/release-skills.yml` is triggered by `v*` tag pushes. It runs the full build (`npm ci && npm run build`) and force-adds the otherwise git-ignored `templates/assistant/skills/*/scripts/` directory contents into a detached release commit, then force-moves the tag to point at that commit. `main` stays bundle-free; the tagged ref is self-contained so `npx skills add e0ipso/ai-task-manager@<tag>` resolves a fully buildable input.

Verify the invariant:

```bash
git ls-tree -r v<tag> -- 'templates/assistant/skills/*/scripts/*.cjs'   # expect: bundles listed
git ls-tree -r main -- 'templates/assistant/skills/*/scripts/*.cjs'     # expect: empty
```

Release commits are labeled `[release-bundle]` in the subject. They are reachable only from a tag, never from `main`. If you see one in `git log main`, something has gone wrong with the workflow.

---

## Directory Structure and Organization

### Core Directory Structure
```
project/
├── .ai/task-manager/              # Shared workspace (assistant-agnostic)
│   ├── plans/                     # Active plans with tasks/
│   │   └── 28--plan-name/
│   │       ├── plan-28--plan-name.md
│   │       └── tasks/
│   │           ├── 01--task-one.md
│   │           └── 02--task-two.md
│   ├── archive/                   # Completed plans
│   ├── config/
│   │   ├── TASK_MANAGER.md        # Project context
│   │   ├── scripts/               # ID generation (get-next-plan-id.cjs, etc)
│   │   ├── hooks/                 # Lifecycle hooks (PRE_PLAN, POST_PLAN, PRE_PHASE, POST_PHASE, PRE_TASK_ASSIGNMENT, PRE_TASK_EXECUTION, POST_TASK_GENERATION_ALL, POST_EXECUTION, POST_ERROR_DETECTION)
│   │   └── templates/             # Customizable (PLAN_TEMPLATE.md, TASK_TEMPLATE.md)
└── .claude/agents/                # Claude-only sub-agents copied by `init`
```

The workflow itself is delivered through Agent Skills (installed via `npx skills add e0ipso/ai-task-manager`). The CLI's `init` does not emit per-assistant command or prompt directories.

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

# Validation of archive integrity
DEBUG=true node .ai/task-manager/config/scripts/get-next-plan-id.cjs
```

---

## Supporting Utilities

### ID Generation

```bash
# Generate next plan ID with debug logging
DEBUG=true node .ai/task-manager/config/scripts/get-next-plan-id.cjs

# Generate next task ID for specific plan
node .ai/task-manager/config/scripts/get-next-task-id.cjs 28
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

### Adding New Assistant Support

Skills are assistant-agnostic — any assistant that supports the Agent Skills format consumes the same `SKILL.md` content. No code or template changes are required to support a new assistant. Users install skills via `npx skills add e0ipso/ai-task-manager`.

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
node dist/cli.js init --assistants claude --destination-directory /tmp/test
```

---

## Error Handling and Troubleshooting

### Common Issues and Solutions

#### ID Generation Problems
**Symptoms**: ID conflicts, missing plans, inconsistent numbering
**Debugging**:
```bash
# Enable comprehensive debug logging
DEBUG=true node .ai/task-manager/config/scripts/get-next-plan-id.cjs
```
**Solutions**: Verify directory structure, check file permissions, align ID sources

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
AssistantError     // Assistant validation failures
```

#### Error Recovery Strategies
- **Graceful Degradation**: Continue operation when possible
- **Detailed Logging**: Provide context for debugging
- **User-Friendly Messages**: Clear guidance for resolution
- **Fail-Fast**: Stop early for critical errors

---
