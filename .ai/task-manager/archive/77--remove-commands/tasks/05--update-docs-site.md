---
id: 5
group: "docs"
dependencies: [2]
status: "completed"
created: "2026-05-21"
skills:
  - technical-writing
---
# Scrub the docs/ site of command references

## Objective
Remove every `/tasks:*` example, every "commands" surface description, and every reference to per-assistant command directories from the `docs/` site. Delete files that become empty shells. Result: a docs site that consistently describes the project as skills-only.

## Skills Required
`technical-writing` — markdown editing across nine related files in a docs site.

## Acceptance Criteria
- [ ] `docs/index.md` — no `/tasks:*` references; describes skills-based workflow
- [ ] `docs/installation.md` — install steps describe `npx . init` + `npx skills add e0ipso/ai-task-manager`; no per-assistant command directory mention
- [ ] `docs/getting-started.md` — first-run walkthrough uses skill names, not slash commands
- [ ] `docs/workflow.md` — workflow description does not reference slash commands; either rewritten or deleted if it collapses to nothing useful
- [ ] `docs/workflows.md` — same treatment; deletion is acceptable if rewriting yields a stub
- [ ] `docs/features.md` — feature list reads in terms of skills
- [ ] `docs/comparison.md` — read first; if it's a per-assistant command-prefix comparison, it becomes meaningless and should be deleted (skills are assistant-agnostic). If it's a comparison with other tools, rewrite to describe the skills-based project
- [ ] `docs/customization.md` and `docs/customization-extension.md` — adjust to describe customising templates and skill workflows; remove command-template customisation
- [ ] `docs/reference.md` — no slash-command reference; describes skill names and the CLI's `init`/`status`/`plan` subcommands only (claude-exec is gone)
- [ ] `docs/architecture.md` and `docs/core-concepts.md` — if they describe command-rendering architecture, rewrite to describe skills + init
- [ ] `_config.yml` is checked for nav entries pointing to deleted files; broken nav entries removed
- [ ] `grep -rnE "(/tasks:|claude-exec|commands/tasks)" docs/` returns zero matches

## Technical Requirements
- Read each file before deciding edit vs. delete. Some pages were written for a command-centric project and may not have useful content after scrubbing.
- For deletions, also remove the file from `docs/_config.yml` nav if it appears there.
- Keep `docs/img/` untouched unless an image specifically illustrates the command workflow — in that case, the markdown reference to it goes away and the image becomes orphaned (acceptable; can be cleaned up separately).
- Where pages mentioned a 7-step manual workflow with slash commands, replace with a sentence-level description: "Install skills, then ask your assistant to plan, decompose, and execute. Review plans in `.ai/task-manager/plans/` between steps."

## Input Dependencies
Task 2 (trimmed src/). Like task 4, this writes the new reality and benefits from the new src/ being in place.

## Output Artifacts
A docs site that is internally consistent and describes only the surviving project.

## Implementation Notes

<details>

**Workflow**:
1. List all files: `ls docs/*.md`.
2. For each file, read it and decide: rewrite, scrub, or delete.
3. Use the grep verification at the end of each file's edit: `grep -nE "(/tasks:|claude-exec|commands/tasks)" docs/<file>.md` should return nothing.
4. After all files are done, run the suite grep: `grep -rnE "(/tasks:|claude-exec|commands/tasks)" docs/` — zero results.
5. Check `docs/_config.yml` for nav references; remove entries pointing at deleted files.

**Important**: do not touch `docs/img/` files. Do not change the Jekyll/Docusaurus/etc. config beyond removing dead nav entries.

**Existing files** (from `ls docs/`):
- `_config.yml`
- `architecture.md`
- `comparison.md`
- `core-concepts.md`
- `customization-extension.md`
- `customization.md`
- `features.md`
- `getting-started.md`
- `index.md`
- `installation.md`
- `reference.md`
- `workflow.md`
- `workflows.md`

The grep audit earlier showed `_config.yml` had no `/tasks:` or command refs (it wasn't in the matches), so likely only nav-entry pruning if pages are deleted. The other files all had matches and need attention.

**Do not edit**:
- `CHANGELOG.md`, `README.md`, `AGENTS.md`, `MIGRATION.md` — those are task 4's territory.
- Anything in `src/`, `templates/`, `.github/` — out of scope.

</details>
