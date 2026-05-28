---
id: 4
group: "docs"
dependencies: [2]
status: "completed"
created: "2026-05-21"
skills:
  - technical-writing
---
# Update top-level docs and shipped templates

## Objective
Rewrite `README.md`, `AGENTS.md`, and `MIGRATION.md`; append a new entry to `CHANGELOG.md`; update the two in-template references (`templates/ai-task-manager/config/TASK_MANAGER.md` and `templates/assistant/skills/task-refine-plan/SKILL.md`). After this task, no top-level documentation references `/tasks:*` slash commands, the per-assistant command surface, or the deleted `claude-exec` subcommand.

## Skills Required
`technical-writing` — markdown editing across several files of varying size and tone.

## Acceptance Criteria
- [ ] `README.md`: Quick Start section uses skills-only invocation; no `/tasks:full-workflow`, `/tasks:create-plan`, etc. examples
- [ ] `AGENTS.md`: "Orchestration Pattern: Runtime Prompt Composition" section deleted in full; the assistant-comparison table reduced to the essentials (or deleted); the "Adding New Assistant Support" section deleted (skills are assistant-agnostic); the Three-Phase Progressive Refinement section refers to skills (`task-create-plan`, `task-generate-tasks`, `task-execute-blueprint`) instead of `/tasks:*`
- [ ] `MIGRATION.md`: read existing content; if it documents migrations between command versions, rewrite to describe the skills-only project state; if it documents only skill migrations, leave the body and add a one-paragraph note about commands removal
- [ ] `templates/ai-task-manager/config/TASK_MANAGER.md` line 69: replace `via /tasks:execute-blueprint` with non-command phrasing (e.g., `when the blueprint execution skill finishes`)
- [ ] `templates/assistant/skills/task-refine-plan/SKILL.md` line 92: replace the `/tasks:refine-plan-auto slash command` phrase with skill-internal phrasing
- [ ] `CHANGELOG.md`: a new entry is appended at the top (above the most recent existing entry) documenting the removal of the command channel. Existing entries below are byte-identical to before this task — verify with `git diff CHANGELOG.md` showing only added lines at the top
- [ ] `grep -nE "(/tasks:|claude-exec)" README.md AGENTS.md MIGRATION.md templates/ai-task-manager/config/TASK_MANAGER.md templates/assistant/skills/task-refine-plan/SKILL.md` returns zero matches

## Technical Requirements
- **`README.md`**: Currently the Quick Start at line 51 shows `/tasks:full-workflow Create user authentication system` and lines 55-58 show the four-step manual workflow with `/tasks:` examples. Replace with a description of installing skills (`npx skills add e0ipso/ai-task-manager`) and asking the assistant by intent. Line 24's sentence about "The skills give your assistant the workflow commands" should be re-read in context: it's actually accurate (skills *are* the workflow), but the word "commands" may need rephrasing to avoid confusion with the deleted slash-command channel.
- **`AGENTS.md`** (project context file, 360+ lines):
  - Delete the entire "Orchestration Pattern: Runtime Prompt Composition" section (~115-180)
  - Delete or heavily simplify the "Assistant-Specific Differences" table (~360); it currently has columns for command-prefix, file-naming, command-directory which all become N/A
  - Delete the "Common Command Examples" block under that table (~370-380)
  - Delete the "Adding New Assistant Support" section (~510-520) — skills are assistant-agnostic, this section becomes false
  - Delete the "Refine-Plan Command" section (~400-420)
  - Delete the "Fix-Broken-Tests Command" section (~420-450)
  - Rewrite "Three-Phase Progressive Refinement" (~63-90) to refer to skills by name (`task-create-plan`, `task-generate-tasks`, `task-execute-blueprint`)
  - Keep: header, Quick Start (rewritten), Core Value Proposition, Key Design Principles, Skills Layer section, Schema Version Contract, GitHub Releases, Directory Structure (minus per-assistant table), Template Customization, Development Workflow, Testing Philosophy, Error Handling
- **`MIGRATION.md`**: read it first. If it currently describes how to migrate between schema versions of the command tree, rewrite or replace. If it's already mostly about skill version migration, just append a paragraph at the top noting that as of this release, slash commands are no longer shipped.
- **`templates/ai-task-manager/config/TASK_MANAGER.md` line 69**: This file ships into every user's `.ai/task-manager/config/` and is the AI's project-context file. Replace the sentence containing `via /tasks:execute-blueprint` with `via the task-execute-blueprint skill` or simply `when blueprint execution finishes`. Re-read the whole line for awkwardness. Line 4's `commands for AI assistants` phrasing is fine — it means "the AI's actions" not "slash commands."
- **`templates/assistant/skills/task-refine-plan/SKILL.md` line 92**: Replace `The invocation is the /tasks:refine-plan-auto slash command (the auto variant)` with `When run in auto mode` (or read the surrounding paragraph and adapt). The skill should describe itself, not reference a deleted command.
- **`CHANGELOG.md`**: Append a new entry above the most recent existing one. Format consistent with existing entries (looks like git-shortlog style with bullets). Suggested content:
  ```
  ### Breaking changes
  * remove: slash commands deleted; the project now ships only Agent Skills (install via `npx skills add e0ipso/ai-task-manager`). Users with `.claude/commands/tasks/`, `.gemini/commands/tasks/`, `.codex/prompts/tasks-*`, `.github/prompts/tasks-*.prompt.md`, etc. from earlier `init` runs can delete those directories — they are no longer regenerated.
  * remove: `claude-exec` CLI subcommand deleted. It existed only to invoke slash commands.
  ```

## Input Dependencies
Task 2 (trimmed src/). Docs describe the new code; they should be written against the actual new state, not the planned state.

## Output Artifacts
A skills-only project surface in the docs. No `/tasks:*` reference in any top-level markdown file outside `CHANGELOG.md` historical entries.

## Implementation Notes

<details>

**Workflow**:
1. Read each file end-to-end before editing. Some sections may collapse to nothing useful; deletion is fine.
2. For `AGENTS.md`, do the deletions first, then re-read the surviving structure for flow. The file is dense; expect to lose 40-50% of its length.
3. For `README.md`, the file is shorter and the changes are more targeted. Get it right first since it's the most-read doc.
4. `CHANGELOG.md` entries follow the project's existing format — look at the top three or four entries to match the style.
5. Final sweep: `grep -nE "(/tasks:|claude-exec|commands/tasks)" README.md AGENTS.md MIGRATION.md templates/ai-task-manager/config/TASK_MANAGER.md templates/assistant/skills/task-refine-plan/SKILL.md` — should return nothing.

**Do not delete**:
- The Skills Layer section in AGENTS.md (it describes the surviving system)
- The Schema Version Contract section (still accurate)
- The GitHub Releases section (still accurate)
- The Three-Phase Progressive Refinement *concept* — it stays, but is now realised through skills, not commands

**Do not edit**:
- `CHANGELOG.md` historical entries (anything below the new entry you append) — they are a record of work that genuinely happened.
- Anything under `docs/` — that's task 5.
- `templates/assistant/skills/*/SKILL.md` other than `task-refine-plan/SKILL.md` — verify nothing else mentions `/tasks:*` by running `grep -rn /tasks: templates/assistant/skills/`.

</details>
