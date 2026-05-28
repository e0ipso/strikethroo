---
id: 3
group: "directory-structure"
dependencies: [1, 2]
status: "completed"
created: "2025-11-22"
skills: ["typescript", "fs-operations"]
---

# Task: Implement Codex Directory Structure with Flat File Naming

## Objective

Create `.codex/prompts/` directory with flat file structure and rename templates using `tasks-{name}.md` pattern to accommodate Codex's no-subdirectory constraint.

## Skills Required

- `typescript`: Logic implementation
- `fs-operations`: Filesystem operations with fs-extra

## Acceptance Criteria

- [ ] Running `init --assistants codex` creates `.codex/prompts/` directory
- [ ] All 6 command templates are copied with `tasks-{name}.md` naming pattern
- [ ] Files use Markdown format (`.md` extension)
- [ ] No subdirectories created under `.codex/prompts/`
- [ ] Post-init message displays Codex-specific instructions

## Technical Requirements

- Modify `src/index.ts` in `createAssistantStructure()` function (around lines 308-356)
- Add conditional logic for `assistant === 'codex'`
- Create flat directory structure: `.codex/prompts/`
- Implement file renaming during template copy:
  - `create-plan.md` → `tasks-create-plan.md`
  - `generate-tasks.md` → `tasks-generate-tasks.md`
  - `execute-blueprint.md` → `tasks-execute-blueprint.md`
  - `execute-task.md` → `tasks-execute-task.md`
  - `fix-broken-tests.md` → `tasks-fix-broken-tests.md`
  - `full-workflow.md` → `tasks-full-workflow.md`
  - `refine-plan.md` → `tasks-refine-plan.md`
- Add post-init message for Codex users

## Input Dependencies

- Task 1: `'codex'` type in type system
- Task 2: Template format mapping configured

## Output Artifacts

- Modified `src/index.ts` with Codex directory creation logic
- `.codex/prompts/` directory with renamed template files
- Post-init user instructions for Codex workflow

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. Open `src/index.ts`
2. Locate `createAssistantStructure()` function
3. Add conditional handling for Codex assistant:
   ```typescript
   if (assistant === 'codex') {
     // Create flat directory structure
     const promptsDir = path.join(destinationDir, '.codex', 'prompts');
     await ensureDir(promptsDir);

     // Copy and rename templates
     const templateFiles = [
       'create-plan.md',
       'generate-tasks.md',
       'execute-blueprint.md',
       'execute-task.md',
       'fix-broken-tests.md',
       'full-workflow.md',
       'refine-plan.md'
     ];

     for (const file of templateFiles) {
       const sourcePath = path.join(templatesDir, 'assistant', 'commands', 'tasks', file);
       const destFileName = `tasks-${file}`;
       const destPath = path.join(promptsDir, destFileName);
       await copyTemplate(sourcePath, destPath, format);
     }
   }
   ```
4. Update CLI output section to show Codex files
5. Add Codex-specific post-init message:
   ```
   For Codex CLI: Copy or symlink files from .codex/prompts/ to ~/.codex/prompts/
   Then restart your Codex session to load the new commands.
   Commands will be available as: /prompts:tasks-create-plan, /prompts:tasks-generate-tasks, etc.
   ```
6. Test with `npm run build && node dist/cli.js init --assistants codex --destination-directory /tmp/test-codex`
</details>
