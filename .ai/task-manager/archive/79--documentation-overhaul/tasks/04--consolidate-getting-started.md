---
id: 4
group: "page-consolidation"
dependencies: [1]
status: "completed"
created: "2026-05-25"
skills:
  - technical-writing
---
# Consolidate getting-started.md — Absorb installation.md

## Objective
Rewrite `docs/getting-started.md` as a self-contained top-level page that absorbs all content from `docs/installation.md`. Remove the parent/child navigation pattern. The result is a single page covering installation, setup, directory structure, and verification.

## Skills Required
- technical-writing: Step-by-step setup guides, clear procedural documentation

## Acceptance Criteria
- [ ] `docs/getting-started.md` is rewritten as a top-level page (no `has_children`, no `parent`)
- [ ] All content from `installation.md` is absorbed (prerequisites, install commands, directory structure, verification)
- [ ] Two-step install is clearly presented: (1) `npx @e0ipso/ai-task-manager init`, (2) `npx skills add e0ipso/ai-task-manager`
- [ ] Directory structure of `.ai/task-manager/` is documented
- [ ] Uses canonical terminology (work order, plan, execution blueprint, phases)
- [ ] No retired terms
- [ ] No emojis in headings
- [ ] Frontmatter: `layout: default`, `title: Getting Started`, `nav_order: 2`, no `has_children`, no `parent`

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Jekyll "Just the Docs" theme frontmatter
- Must work as a standalone top-level page
- Clear numbered steps for installation

## Input Dependencies
- Task 1 output: canonical terminology from `docs/reference.md`
- `docs/getting-started.md` — current parent page (will be replaced)
- `docs/installation.md` — content to absorb

## Output Artifacts
- `docs/getting-started.md` — self-contained getting started page

## Implementation Notes
<details>
<summary>Detailed guidance for executing agent</summary>

### Page Structure

```markdown
---
layout: default
title: Getting Started
nav_order: 2
description: "Install AI Task Manager and run your first workflow"
---

# Getting Started

## Prerequisites
[Node.js version requirement from installation.md]

## Installation
[Two-step: init workspace + install skills. From installation.md.]

## Directory Structure
[.ai/task-manager/ layout from installation.md]

## Your First Workflow
[Brief walkthrough: create a plan, generate tasks, execute. Keep it concise — point to workflow.md for details.]

## Verification
[How to verify the install worked. From installation.md.]
```

### Content Sources

Read `docs/installation.md` thoroughly — this is the primary content source. All of its content should appear in the consolidated page.

Read current `docs/getting-started.md` — it's mostly a parent page shell with brief overview content. Preserve any useful overview text but don't duplicate what's in the installation content.

### Key Changes from Current State

1. Remove `has_children: true` from frontmatter
2. Remove the navigation shell content
3. Inline all installation.md content
4. Update terminology to canonical terms
5. Strip any emojis from headings

### Note on migration.md

`migration.md` currently has `parent: Getting Started` in its frontmatter. That parent reference will be removed in Task 5 (when migration.md is updated). Do not worry about migration.md in this task.

</details>
