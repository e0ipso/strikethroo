---
id: 2
group: "page-creation"
dependencies: [1]
status: "completed"
created: "2026-05-25"
skills:
  - technical-writing
---
# Create why.md — Four Messaging Pillars

## Objective
Create a new `docs/why.md` page that serves as the "convince me" page. Absorb all relevant content from `docs/comparison.md` and reframe it around the four messaging pillars: zero tooling, multi-harness support, better than plan mode, and context management.

## Skills Required
- technical-writing: Persuasive technical writing, comparison tables, clear value proposition articulation

## Acceptance Criteria
- [ ] `docs/why.md` exists as a new top-level page with no parent
- [ ] All four messaging pillars have dedicated subsections with clear explanations
- [ ] Comparison tables from `comparison.md` are preserved but reframed through the pillar lens
- [ ] All essential content from `comparison.md` is absorbed (no information loss)
- [ ] Uses canonical terminology from Task 1's glossary (work order, plan, execution blueprint, phases, task, sub-agent)
- [ ] No retired terms (progressive refinement, validation gates, cognitive overload)
- [ ] No emojis in headings
- [ ] Frontmatter: `layout: default`, `title: Why AI Task Manager`, `nav_order: 3`, no `parent`

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Jekyll "Just the Docs" theme frontmatter
- Markdown with YAML frontmatter
- Must stand alone as a top-level navigation item

## Input Dependencies
- Task 1 output: canonical terminology definitions from `docs/reference.md`
- `docs/comparison.md` — source content to absorb
- `docs/features.md` — may contain pillar-relevant content to consolidate

## Output Artifacts
- `docs/why.md` — the "convince me" page organized around four pillars

## Implementation Notes
<details>
<summary>Detailed guidance for executing agent</summary>

### Page Structure

```markdown
---
layout: default
title: Why AI Task Manager
nav_order: 3
description: "Why AI Task Manager produces better results than plan mode"
---

# Why AI Task Manager

[Opening paragraph: the core problem with plan mode in AI coding assistants]

## Zero Tooling
[No API keys, no services, no pay-per-token. Plain text files + Agent Skills. Works within existing AI subscriptions.]

## Multi-Harness Support
[Harness-agnostic skills. Team members use different tools. Shared workspace is the collaboration point.]

## Better Results Than Plan Mode
[Separation of planning and execution. Human review gates between phases. YAGNI enforcement. Specialized sub-agents.]

## Context Management
[The architectural core. Clean context per phase. Sub-agents receive only their task. Prevents quality degradation.]

## How It Compares
[Absorb comparison tables from comparison.md. Reframe as pillar-based comparison rather than feature-by-feature.]
```

### Content Migration from comparison.md

Read `docs/comparison.md` thoroughly. Key content to preserve:
- Plan mode vs AI Task Manager comparison (reframe around pillars)
- Comparison with other tools (Plandex, Task Master, etc.)
- "When to use what" guidance

Do NOT simply copy-paste. Rewrite through the lens of the four pillars. The comparison tables should answer "how does this pillar manifest differently in AI Task Manager vs alternatives?"

### Pillar Content Sources (from the plan)

**Pillar 1: Zero Tooling** — No additional tools, API keys, or services. Plain text files (Markdown, YAML frontmatter) and Agent Skills. Human-readable, git-friendly. Works within existing AI subscriptions. Contrasts with API-based tools requiring separate API keys and pay-per-token pricing.

**Pillar 2: Multi-Harness Support** — Skills are harness-agnostic. Single SKILL.md works for every harness. Team members can use different harnesses (Claude Code, Gemini CLI, GitHub Copilot, Codex, Cursor, OpenCode). Initialize once, install skills per developer. Shared workspace (.ai/task-manager/) is the collaboration point.

**Pillar 3: Better Than Plan Mode** — Plan mode creates and executes in a single context → scope creep, diluted focus, quality degradation. AI Task Manager separates planning from execution, introduces human review gates, enforces YAGNI, deploys specialized sub-agents per task.

**Pillar 4: Context Management** — Each phase operates with clean, focused context. Plan creation gets maximum reasoning power on requirements only. Task generation gets clean context with only the approved plan. Execution deploys sub-agents that each receive only their specific task. Prevents quality degradation from context accumulation.

### Terminology Enforcement

Before finishing, grep for retired terms:
```bash
grep -n "progressive refinement\|cognitive overload\|validation gates" docs/why.md
```
Any matches must be replaced with canonical equivalents.

</details>
