---
id: 1
group: "terminology-foundation"
dependencies: []
status: "completed"
created: "2026-05-25"
skills:
  - technical-writing
---
# Establish Canonical Terminology — reference.md + AGENTS.md Glossary

## Objective
Create the terminology anchor for the entire documentation overhaul. Write `docs/reference.md` as a combined glossary + CLI reference + FAQ page, and add a concise glossary section to `AGENTS.md`. All subsequent tasks depend on this one for consistent term usage.

## Skills Required
- technical-writing: Markdown authoring, information architecture, concise technical definitions

## Acceptance Criteria
- [ ] `docs/reference.md` exists with three sections: Glossary, CLI Reference, FAQ
- [ ] Glossary defines all canonical terms: work order, plan, execution blueprint, phase, task, sub-agent
- [ ] Glossary explicitly notes retired terms and their replacements: "progressive refinement" → "three-phase workflow", "validation gates" → "review gates" (for human review) / "quality gates" (for automated checks), "cognitive overload" → concrete context management explanations
- [ ] CLI Reference section documents `npx @e0ipso/ai-task-manager init` and `npx skills add e0ipso/ai-task-manager` with flags and usage
- [ ] FAQ section consolidates common questions (currently scattered across other pages)
- [ ] `AGENTS.md` has a new "## Glossary" section placed after "## Quick Start Guide" and before "## Project Overview" with one-line definitions of all canonical terms
- [ ] No emojis in any heading
- [ ] `reference.md` frontmatter uses `layout: default`, `title: Reference`, `nav_order: 7` (no `has_children`, no `parent`)

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Jekyll "Just the Docs" theme frontmatter format
- Markdown with YAML frontmatter
- No parent/child nesting — this is a top-level page

## Input Dependencies
- Current `docs/reference.md` (parent page with minimal content — will be replaced entirely)
- Current `docs/comparison.md` FAQ-like content to check for questions worth preserving
- Current scattered FAQ content in other pages
- Current `AGENTS.md` for insertion point

## Output Artifacts
- `docs/reference.md` — canonical glossary, CLI reference, FAQ
- `AGENTS.md` — updated with glossary section
- These serve as the terminology contract for all other tasks

## Implementation Notes
<details>
<summary>Detailed guidance for executing agent</summary>

### Reference.md Structure

```markdown
---
layout: default
title: Reference
nav_order: 7
description: "Glossary, CLI reference, and frequently asked questions"
---

# Reference

## Glossary

| Term | Definition |
|------|-----------|
| Work order | ... |
| Plan | ... |
| Execution blueprint | ... |
| Phase | ... |
| Task | ... |
| Sub-agent | ... |

### Retired Terms
...

## CLI Reference
...

## FAQ
...
```

### Canonical Term Definitions

Use these definitions (from the plan) as the source of truth:

- **Work order** — The user's request describing what they want accomplished. Input to the system.
- **Plan** — The comprehensive document the LLM produces by refining the work order. Covers requirements, architecture, risks, success criteria. Output of Phase 1.
- **Execution blueprint** — The structured output of task generation (Phase 2). Contains all tasks organized into phases with dependency mappings.
- **Phase** — A group of tasks within the execution blueprint. Tasks within a phase execute in parallel. Phases execute in sequence. This is the unit of parallelism.
- **Task** — An atomic unit of work within a phase. Has 1-2 skills, acceptance criteria, and dependencies. Executed by a sub-agent with clean context.
- **Sub-agent** — A specialized AI agent that executes a single task with focused, clean context. Not the main conversation agent.

### AGENTS.md Glossary

Insert after the "## Quick Start Guide" section and before "## Project Overview". Use concise one-line definitions since this serves as quick reference for AI assistants. Example format:

```markdown
## Glossary

- **Work order** — The user's request describing what they want accomplished.
- **Plan** — Comprehensive document covering requirements, architecture, risks, and success criteria.
- **Execution blueprint** — All tasks organized into dependency-mapped phases. Output of task generation.
- **Phase** — A group of tasks that execute in parallel. Phases run in sequence.
- **Task** — An atomic unit of work with 1-2 skills and clear acceptance criteria. Executed by a sub-agent.
- **Sub-agent** — A specialized AI agent executing a single task with focused, clean context.
```

### FAQ Content Sources

Scan these files for FAQ-worthy content to consolidate:
- `docs/comparison.md` — "When to use" questions
- `docs/features.md` — capability questions
- `docs/index.md` — overview questions
- `docs/installation.md` — setup questions

### Retired Terms Mapping

Document these replacements in the glossary:
- "progressive refinement" → "three-phase workflow"
- "validation gates" → "review gates" (human review) or "quality gates" (automated checks)
- "cognitive overload" → replace with concrete explanations of what happens to context

</details>
