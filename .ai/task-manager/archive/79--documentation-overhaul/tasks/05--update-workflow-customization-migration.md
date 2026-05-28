---
id: 5
group: "page-consolidation"
dependencies: [1]
status: "completed"
created: "2026-05-25"
skills:
  - technical-writing
---
# Update workflow.md + customization.md + migration.md

## Objective
Three related page updates: (1) consolidate `docs/workflow.md` by absorbing `docs/workflows.md`, (2) update `docs/customization.md` with emoji removal and terminology fixes, (3) update `docs/migration.md` with emoji removal and adjusted nav_order. All three pages become top-level (no parent/child nesting).

## Skills Required
- technical-writing: Content consolidation, terminology standardization, procedural documentation

## Acceptance Criteria
- [ ] `docs/workflow.md` absorbs all content from `docs/workflows.md` — basic workflow + advanced patterns in one page
- [ ] `docs/workflow.md` frontmatter: `layout: default`, `title: Workflow Guide`, `nav_order: 5`, no `parent`
- [ ] `docs/customization.md` has all emojis removed from headings
- [ ] `docs/customization.md` uses canonical terminology throughout
- [ ] `docs/customization.md` frontmatter: `layout: default`, `title: Customization Guide`, `nav_order: 6`, no `parent`
- [ ] `docs/migration.md` has all emojis removed from headings (if any)
- [ ] `docs/migration.md` frontmatter updated: `nav_order: 8` (last in nav), `parent` field removed
- [ ] All three pages use canonical terminology consistently
- [ ] No retired terms in any of the three pages

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Jekyll "Just the Docs" theme frontmatter
- All three pages must be top-level (no `parent` field)
- Preserve `docs/img/dashboard.svg` reference if any of these pages use it

## Input Dependencies
- Task 1 output: canonical terminology from `docs/reference.md`
- `docs/workflow.md` — basic workflow content (currently child of Getting Started)
- `docs/workflows.md` — advanced patterns content (currently child of Customization & Extension)
- `docs/customization.md` — customization guide (currently child of Customization & Extension)
- `docs/migration.md` — migration guide (currently child of Getting Started)

## Output Artifacts
- `docs/workflow.md` — consolidated workflow guide (basic + advanced)
- `docs/customization.md` — updated customization guide
- `docs/migration.md` — updated migration guide

## Implementation Notes
<details>
<summary>Detailed guidance for executing agent</summary>

### workflow.md Consolidation

Read both `docs/workflow.md` and `docs/workflows.md` thoroughly.

Current `workflow.md` covers basic day-to-day workflow (create plan, generate tasks, execute).
Current `workflows.md` covers advanced patterns (plan mode integration, iterative refinement, team collaboration, etc.).

Merge into a single page with clear sections:

```markdown
---
layout: default
title: Workflow Guide
nav_order: 5
description: "Day-to-day workflow and advanced patterns"
---

# Workflow Guide

## Daily Workflow
[From current workflow.md — the basic three-phase flow]

## Advanced Patterns
[From current workflows.md — plan mode integration, iterative refinement, etc.]
```

Remove `parent: Getting Started` from workflow.md frontmatter.
Remove `parent: Customization & Extension` from workflows.md content (since it's being absorbed).

### customization.md Updates

Read `docs/customization.md`. Changes needed:
1. Remove all emojis from headings (e.g., "🔧 Customization Guide" → "Customization Guide")
2. Replace retired terms with canonical equivalents
3. Remove `parent: Customization & Extension` from frontmatter
4. Update `nav_order` to 6
5. Preserve all substantive content — hooks, templates, configuration details

### migration.md Updates

Read `docs/migration.md`. Changes needed:
1. Remove any emojis from headings (check first — may not have any)
2. Remove `parent: Getting Started` from frontmatter
3. Set `nav_order: 8` (push to end of navigation)
4. Replace any retired terminology
5. Preserve all migration instructions — this is still useful for 1.x users

### Terminology Check

After all three files are updated, verify:
```bash
grep -n "progressive refinement\|cognitive overload\|validation gates" docs/workflow.md docs/customization.md docs/migration.md
```
Zero matches expected (unless quoting plan mode behavior for comparison purposes).

### Emoji Check

```bash
grep -n '🔧\|📦\|🏗️\|✨\|🔄\|🚀\|🎯\|🤝\|📋\|📊\|🔒\|💰\|🔍\|✅\|⚡\|🔴' docs/workflow.md docs/customization.md docs/migration.md
```
Zero matches expected.

</details>
