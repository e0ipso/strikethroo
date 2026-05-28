---
id: 6
group: "final-assembly"
dependencies: [1, 2, 3, 4, 5]
status: "completed"
created: "2026-05-25"
skills:
  - technical-writing
  - jekyll
---
# Rewrite index.md + Site Cleanup + Validation

## Objective
Rewrite the homepage (`docs/index.md`) to lead with the four messaging pillars and link to the new page structure. Delete all deprecated pages. Update `docs/_config.yml`. Fix all internal links across all remaining pages. Run the plan's self-validation checks to confirm the overhaul is complete.

## Skills Required
- technical-writing: Homepage copywriting, information architecture, link management
- jekyll: Jekyll configuration, Just the Docs theme frontmatter, build validation

## Acceptance Criteria
- [ ] `docs/index.md` is rewritten to lead with four pillars and provide navigation to all pages
- [ ] `docs/index.md` frontmatter: `layout: default`, `title: Home`, `nav_order: 1`, no `parent`
- [ ] No emojis in any heading in `index.md`
- [ ] Deprecated pages deleted: `architecture.md`, `features.md`, `comparison.md`, `workflows.md`, `installation.md`, `core-concepts.md`, `customization-extension.md`
- [ ] `docs/_config.yml` description updated to match new messaging
- [ ] All internal links across ALL remaining docs pages resolve correctly (no broken references to deleted pages)
- [ ] All remaining pages have correct frontmatter (no `parent` referencing deleted pages, correct `nav_order`)
- [ ] Self-validation checks pass:
  - Zero emoji matches in headings: `grep -rn '🔧\|📦\|🏗️\|✨\|🔄\|🚀\|🎯\|🤝\|📋\|📊\|🔒\|💰\|🔍\|✅\|⚡\|🔴' docs/`
  - Zero retired terms: `grep -rn "progressive refinement\|cognitive overload\|validation gates" docs/`
  - Canonical terms present: `grep -rn "work order\|execution blueprint\|sub-agent" docs/`
  - AGENTS.md glossary exists: `grep -n "Glossary" AGENTS.md`
  - ~8 .md files in docs/
  - No `parent:` field references a deleted page

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Jekyll "Just the Docs" theme configuration
- Must verify no broken internal links between pages
- The `docs/img/dashboard.svg` asset must be preserved and referenced from the appropriate page

## Input Dependencies
- All tasks 1-5 must be complete — this task assembles the final site
- `docs/index.md` — will be rewritten
- `docs/_config.yml` — will be updated
- All remaining docs pages — for link validation

## Output Artifacts
- `docs/index.md` — rewritten homepage
- `docs/_config.yml` — updated site configuration
- Deleted files: `architecture.md`, `features.md`, `comparison.md`, `workflows.md`, `installation.md`, `core-concepts.md`, `customization-extension.md`
- Validated, link-consistent documentation site

## Implementation Notes
<details>
<summary>Detailed guidance for executing agent</summary>

### index.md Rewrite

```markdown
---
layout: default
title: Home
nav_order: 1
description: "Structured AI task management with plain text files and Agent Skills"
---

# AI Task Manager

[Badges — keep npm version and license badges]

[Elevator pitch — 2-3 sentences. Lead with: "transforms complex development
requests into structured, validated implementations through plain text files
and Agent Skills. No API keys. No additional tools. Works within your existing
AI subscription."]

## Why AI Task Manager

[Brief summary of each pillar with links to why.md sections]

- **Zero Tooling** — ...
- **Multi-Harness Support** — ...
- **Better Than Plan Mode** — ...
- **Context Management** — ...

[Link: "Learn more → why.md"]

## Quick Start

[Two-step install. Link to getting-started.md for details.]

## How It Works

[One paragraph summary. Link to how-it-works.md.]

## Documentation

[Navigation links to all pages:
- Getting Started
- Why AI Task Manager
- How It Works
- Workflow Guide
- Customization Guide
- Reference
- Migrating from 1.x]
```

### Page Deletion

Delete these files from `docs/`:
- `architecture.md` (absorbed into `how-it-works.md` by Task 3)
- `features.md` (absorbed into `how-it-works.md` by Task 3)
- `comparison.md` (absorbed into `why.md` by Task 2)
- `workflows.md` (absorbed into `workflow.md` by Task 5)
- `installation.md` (absorbed into `getting-started.md` by Task 4)
- `core-concepts.md` (empty parent page)
- `customization-extension.md` (empty parent page)

### _config.yml Update

Read current `docs/_config.yml`. Update the `description` field to align with the new messaging. Remove any navigation configuration that references deleted pages.

### Link Validation

After all changes, scan every remaining .md file in docs/ for internal links:

```bash
# Find all internal .md links
grep -rn '\.md)' docs/*.md
```

For each link found, verify the target file exists. Common patterns to fix:
- `[text](architecture.md)` → `[text](how-it-works.md)`
- `[text](features.md)` → `[text](how-it-works.md)`
- `[text](comparison.md)` → `[text](why.md)`
- `[text](workflows.md)` → `[text](workflow.md)`
- `[text](installation.md)` → `[text](getting-started.md)`
- `[text](core-concepts.md)` → remove or redirect

Also check AGENTS.md for any docs/ links that need updating.

### Self-Validation Checklist (from the plan)

Run each of these and confirm the expected result:

1. `grep -rn '🔧\|📦\|🏗️\|✨\|🔄\|🚀\|🎯\|🤝\|📋\|📊\|🔒\|💰\|🔍\|✅\|⚡\|🔴' docs/` → zero matches in headings
2. `grep -rn "progressive refinement\|cognitive overload\|validation gates" docs/` → zero matches (except explicit comparisons)
3. `grep -rn "work order\|execution blueprint\|sub-agent" docs/` → canonical terms present
4. `grep -rn '\.md)' docs/*.md` → all link targets exist
5. `grep -n "Glossary" AGENTS.md` → glossary section exists
6. `ls docs/*.md | wc -l` → approximately 8
7. `grep -rn "parent:" docs/*.md` → no parent references deleted pages
8. `docs/img/dashboard.svg` exists and is referenced somewhere

### Final Page Inventory

After this task, docs/ should contain exactly:
- `_config.yml`
- `index.md`
- `getting-started.md`
- `why.md`
- `how-it-works.md`
- `workflow.md`
- `customization.md`
- `reference.md`
- `migration.md`
- `img/dashboard.svg`

</details>
