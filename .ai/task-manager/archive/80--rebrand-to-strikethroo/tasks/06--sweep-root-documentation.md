---
id: 6
group: "prose"
dependencies: []
status: "completed"
created: 2026-05-28
skills:
  - documentation
---
# Sweep root documentation (README, AGENTS, CLAUDE)

## Objective
Bring the three root-level documentation files (`README.md`, `AGENTS.md`, `CLAUDE.md`) in line with the Strikethroo brand, including install commands, skill names, workspace paths, glossary product label, schema-version error message examples, and any directory-tree illustrations.

## Skills Required
- documentation — Markdown editing with attention to identifier consistency and preservation of domain vocabulary.

## Acceptance Criteria
- [ ] Every reference to the product label "AI Task Manager" in `README.md`, `AGENTS.md`, and `CLAUDE.md` is replaced with "Strikethroo".
- [ ] Install commands in all three docs read `npx strikethroo init` and `npx skills add e0ipso/strikethroo`.
- [ ] Skill names referenced in prose, headings, or examples use the `st-*` form (e.g., `st-create-plan`, `st-generate-tasks`, etc.). No occurrences of `task-create-plan`, `task-generate-tasks`, `task-execute-blueprint`, `task-execute-task`, `task-refine-plan`, or `task-full-workflow` remain.
- [ ] Workspace path references in all three docs use `.ai/strikethroo/` (not `.ai/task-manager/`). Directory tree examples in `AGENTS.md` show `.ai/strikethroo/` at the root.
- [ ] The glossary in `AGENTS.md` preserves domain nouns verbatim (work order, plan, blueprint, phase, task, sub-agent). Only the product label moves.
- [ ] Schema-version error message examples in `AGENTS.md` reference `npx strikethroo init` and `npx skills add e0ipso/strikethroo`.
- [ ] `README.md` includes a single one-line note that the GitHub repo slug `e0ipso/ai-task-manager` is unchanged in this release (per plan scope decision).
- [ ] URLs pointing at `github.com/e0ipso/ai-task-manager` or `npmjs.com/package/@e0ipso/ai-task-manager` remain unchanged in all three docs (repo rename is out of scope).
- [ ] `grep -nE 'ai-task-manager|AI Task Manager|task-(create-plan|generate-tasks|execute-blueprint|execute-task|refine-plan|full-workflow)|\.ai/task-manager' README.md AGENTS.md CLAUDE.md` returns only the documented URL exceptions.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Do not rewrite paragraphs for style; perform identifier substitutions and minimal surrounding edits only.
- Preserve all code fences and shell command formatting.
- Preserve the file structure and section ordering of each document.

## Input Dependencies
- None. Can run in parallel with other tasks.

## Output Artifacts
- Updated `README.md`, `AGENTS.md`, `CLAUDE.md`.

## Implementation Notes
<details>
<summary>Execution detail</summary>

1. **CLAUDE.md.** Current state per plan: a thin pointer to `AGENTS.md`. Read it; if it contains brand identifiers (likely none beyond a sentence), update them. If it is literally one line saying "Use @AGENTS.md instead", no edits are required — but verify before declaring done.

2. **README.md.**
   - Update the headline/title to feature Strikethroo as the product name.
   - Update install commands. Currently they read `npx @e0ipso/ai-task-manager init` and `npx skills add e0ipso/ai-task-manager`. Replace with `npx strikethroo init` and `npx skills add e0ipso/strikethroo`.
   - Update directory tree illustrations (if any) to show `.ai/strikethroo/`.
   - Update skill name references to `st-*`.
   - Add one new line near the install section: "Note: the GitHub repository slug remains `e0ipso/ai-task-manager` for this release; the rename is tracked separately."
   - Leave `github.com/e0ipso/ai-task-manager` and `npmjs.com/package/@e0ipso/ai-task-manager` URLs untouched. They are documented exceptions.

3. **AGENTS.md.** This is the largest target. Make these updates:
   - Product label everywhere except inside URLs and the explicit deferred-rename note: "AI Task Manager" → "Strikethroo".
   - Install commands and "Quick Start" snippets updated to `strikethroo` and `e0ipso/strikethroo`.
   - Directory structure illustration under "Directory Structure and Organization" shows `.ai/strikethroo/` at the root and `templates/strikethroo/` as the seed path.
   - Skill list under "Skills Layer" enumerates the six skills with `st-*` prefixes and the new paths under `templates/harness/skills/st-*/`.
   - Schema-version mismatch error message examples (in the "Schema Version Contract" section) reference the new install commands.
   - The Glossary section: preserve every domain noun verbatim. Only the product label (if it appears in the glossary) moves. The current glossary does not contain "AI Task Manager" as an entry; double-check.
   - Any inline references to source paths `templates/ai-task-manager/` → `templates/strikethroo/`.
   - The Notes section that mentions distribution channels and the `vercel-labs/skills` installer: update install command examples; leave the installer slug `e0ipso/ai-task-manager` only where it documents the deferred repo rename.

4. **Final sweep within the three files.**
   ```bash
   cd /workspace
   grep -nE 'ai-task-manager|AI Task Manager|task-(create-plan|generate-tasks|execute-blueprint|execute-task|refine-plan|full-workflow)|\.ai/task-manager' README.md AGENTS.md CLAUDE.md
   ```
   Any hit must be:
   - A URL pointing at `github.com/e0ipso/ai-task-manager` or the npm package URL (documented exception), OR
   - The one explicit note about the deferred repo rename, OR
   - Fixed.

   Surface any remaining hits in the task completion summary.

Edge case: phrases that combine domain vocabulary like "task management" used generically (not as the product name) should be replaced with "plan and task management" or similar — judge from context. The plan explicitly preserves task/plan/phase/blueprint as domain nouns; only the product name moves.
</details>
