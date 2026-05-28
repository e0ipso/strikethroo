---
id: 5
group: "validation"
dependencies: [1, 2, 3, 4]
status: "completed"
created: "2026-05-18"
skills: ["bash"]
---
# Run full validation and regression checks

## Objective

Execute the concrete self-validation checks defined in the plan to confirm the new skill builds correctly, passes tests, integrates cleanly, and does not regress existing functionality.

## Skills Required

- bash (running npm scripts, inspecting build output, creating temporary fixtures, git operations)

## Acceptance Criteria

- [ ] `npm run build` from a clean tree produces exactly five `.cjs` files under `templates/skills/task-full-workflow/scripts/`
- [ ] `git status` shows those five `.cjs` files as ignored (untracked)
- [ ] `templates/skills/task-full-workflow/SKILL.md` frontmatter `name` equals `task-full-workflow`
- [ ] Temporary fixture test passes: bundled `find-task-manager-root.cjs` resolves fixture root
- [ ] Temporary fixture test passes: bundled `get-next-plan-id.cjs` outputs `1` in a fresh fixture
- [ ] Temporary fixture test passes: bundled `validate-plan-blueprint.cjs` returns plan file path for a manually created sample plan
- [ ] Temporary fixture test passes: bundled `get-next-task-id.cjs` returns correct next ID against the sample plan
- [ ] Temporary fixture test passes: bundled `create-feature-branch.cjs` creates expected branch against the sample plan on a clean `main` branch
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] Init regression passes: `npx . init --assistants claude,gemini,opencode,codex --destination-directory /tmp/regression-73` generates full-workflow command files identically to before
- [ ] `npm pack --dry-run` lists all six skills' `templates/skills/*/scripts/*.cjs` files

## Technical Requirements

- Use temporary directories under `/tmp/` for fixture tests
- Do not modify source files during validation
- If any check fails, document the failure and halt; do not proceed to remaining checks

## Input Dependencies

- Task 1 output: Build pipeline registration and generated `.cjs` bundles
- Task 2 output: `templates/skills/task-full-workflow/SKILL.md`
- Task 3 output: Tests added and passing
- Task 4 output: `AGENTS.md` updated

## Output Artifacts

- Validation log (documented as part of task execution output)
- Updated task statuses if validation reveals issues

## Implementation Notes

<details>

### Step-by-step validation script

1. **Clean build**
   ```bash
   npm run clean   # if available, otherwise rm -rf dist/
   npm run build
   ```
   Then verify:
   ```bash
   ls templates/skills/task-full-workflow/scripts/
   # Expected: create-feature-branch.cjs  find-task-manager-root.cjs  get-next-plan-id.cjs  get-next-task-id.cjs  validate-plan-blueprint.cjs
   ```

2. **Git ignore check**
   ```bash
   git status --short templates/skills/task-full-workflow/scripts/
   # Expected: five lines starting with ?? (untracked) because templates/skills/*/scripts/ is gitignored
   ```

3. **SKILL.md frontmatter check**
   ```bash
   head -5 templates/skills/task-full-workflow/SKILL.md
   # Confirm name: task-full-workflow
   ```

4. **Temporary fixture setup**
   ```bash
   fixture_dir=/tmp/skill-full-workflow-fixture
   rm -rf "$fixture_dir"
   npx . init --assistants claude --destination-directory "$fixture_dir"
   ```
   Create a sample plan:
   - `plan.md` with frontmatter `id: 999`
   - `tasks/01--sample-task.md` with frontmatter `id: 1`

   Copy the skill:
   ```bash
   cp -r templates/skills/task-full-workflow "$fixture_dir/"
   ```

5. **Bundled script tests from fixture**
   ```bash
   cd "$fixture_dir"
   node task-full-workflow/scripts/find-task-manager-root.cjs
   # Should print $fixture_dir/.ai/task-manager

   node task-full-workflow/scripts/get-next-plan-id.cjs
   # Should print 1 (only the sample plan exists; but if the init created plans, adjust expectation)

   node task-full-workflow/scripts/validate-plan-blueprint.cjs 999 planFile
   # Should print absolute path to plan file

   node task-full-workflow/scripts/get-next-task-id.cjs 999
   # Should print 2 (one task exists)
   ```

   For `create-feature-branch.cjs`:
   ```bash
   cd "$fixture_dir"
   git init -b main
   git config user.email "test@test.com"
   git config user.name "Test"
   git add .
   git commit -m "init"
   node task-full-workflow/scripts/create-feature-branch.cjs $(node task-full-workflow/scripts/validate-plan-blueprint.cjs 999 planFile)
   # Should create and switch to branch feature/999--...
   ```

6. **Init regression**
   ```bash
   npx . init --assistants claude,gemini,opencode,codex --destination-directory /tmp/regression-73
   # Inspect generated full-workflow command files; they should match the originals
   ```

7. **Test and lint**
   ```bash
   npm test
   npm run lint
   ```

8. **Pack dry-run**
   ```bash
   npm pack --dry-run 2>&1 | grep 'templates/skills/.*/scripts/.*\.cjs'
   # Should list files for all six skills
   ```

### Failure handling
If any step fails, stop immediately, capture the error output, and report it. Do not attempt to fix issues during validation — fixes belong in the preceding tasks.

</details>
