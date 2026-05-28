---
id: 3
group: "page-creation"
dependencies: [1]
status: "completed"
created: "2026-05-25"
skills:
  - technical-writing
---
# Create how-it-works.md — Architecture + Context Management

## Objective
Create `docs/how-it-works.md` by merging content from `docs/architecture.md` and `docs/features.md` into a single authoritative page. Context management must be a prominent subsection — it is the single biggest architectural advantage and deserves headline treatment.

## Skills Required
- technical-writing: Technical architecture explanation, Mermaid diagrams, clear process documentation

## Acceptance Criteria
- [ ] `docs/how-it-works.md` exists as a new top-level page
- [ ] All essential content from `architecture.md` is absorbed (three-phase workflow, context isolation, dependency management)
- [ ] All essential content from `features.md` is absorbed (configuration, customization, hooks, skill-based decomposition)
- [ ] Context management has a dedicated, prominent subsection explaining how clean-context sub-agents work
- [ ] Three-phase workflow (work order → plan → execution blueprint with phases) is clearly explained
- [ ] Mermaid diagrams from source pages are preserved or updated
- [ ] Uses canonical terminology consistently
- [ ] No retired terms
- [ ] No emojis in headings
- [ ] Frontmatter: `layout: default`, `title: How It Works`, `nav_order: 4`, no `parent`

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Jekyll "Just the Docs" theme frontmatter
- Mermaid diagrams (supported by Just the Docs' built-in Mermaid via `_config.yml`)
- Single source of truth for architectural concepts — no duplication with other pages

## Input Dependencies
- Task 1 output: canonical terminology from `docs/reference.md`
- `docs/architecture.md` — primary source for workflow and architecture content
- `docs/features.md` — source for capability and feature content

## Output Artifacts
- `docs/how-it-works.md` — single page covering architecture, workflow, context management, and features

## Implementation Notes
<details>
<summary>Detailed guidance for executing agent</summary>

### Page Structure

```markdown
---
layout: default
title: How It Works
nav_order: 4
description: "Architecture, three-phase workflow, and context management"
---

# How It Works

## The Three-Phase Workflow
[Work order → Plan → Execution Blueprint with Phases. Explain the flow.]

### Phase 1: Strategic Planning
[Plan creation from work order. Mandatory clarification gates.]

### Phase 2: Task Decomposition
[Breaking the plan into atomic tasks. Dependency mapping. Skill assignment.]

### Phase 3: Execution
[Sub-agents execute tasks with clean context. Phase-based parallelism.]

## Context Management
[THIS IS THE HEADLINE SECTION. Explain how each phase gets clean context.
Sub-agents receive only their task + dependencies. Prevents quality degradation.
This is the core architectural advantage over plan mode.]

## Skill-Based Decomposition
[How tasks are assigned 1-2 skills. How skills drive agent specialization.]

## Hooks and Lifecycle
[Brief overview of hooks (PRE_PLAN, POST_PLAN, PRE_PHASE, POST_PHASE, etc.)
with pointer to customization.md for details.]

## Configuration
[Brief overview of TASK_MANAGER.md, templates, with pointer to customization.md.]
```

### Content Migration Strategy

1. Read `docs/architecture.md` thoroughly — extract:
   - Three-phase workflow description
   - Context isolation explanation
   - Mermaid workflow diagrams
   - Dependency management concepts

2. Read `docs/features.md` thoroughly — extract:
   - Configuration and customization overview
   - Hook system overview
   - Skill-based decomposition
   - Any feature descriptions not covered by architecture.md

3. Merge without duplication. Where both files cover the same concept (e.g., context isolation), pick the better explanation and enhance it.

### Context Management Section (Critical)

This section must clearly explain:
- Plan creation agent gets full reasoning power focused on requirements only
- Task generation agent gets a clean context loaded only with the approved plan
- Each execution sub-agent receives only its specific task, dependencies, and acceptance criteria
- Tasks within a phase can execute in parallel (different sub-agents)
- Phases execute in sequence
- This prevents the quality degradation that occurs when a single context accumulates all concerns

### Diagrams

Preserve existing Mermaid diagrams from `architecture.md`. Update terminology to canonical terms. Ensure the workflow diagram shows: Work Order → Plan (Phase 1) → Execution Blueprint (Phase 2) → Phased Execution (Phase 3).

### Cross-References

- Point to `customization.md` for detailed hook and template configuration
- Point to `reference.md` for glossary terms
- Point to `why.md` for the "why this matters" perspective

</details>
