---
id: 5
group: "validation"
dependencies: [1, 2, 3, 4]
status: "completed"
created: "2026-05-18"
skills: ["bash"]
status: "completed"
status: "completed"
---
# Run full validation and regression checks

## Objective

Execute the concrete self-validation checks defined in the plan to confirm the new skill builds correctly, passes tests, integrates cleanly, and does not regress existing functionality.

## Skills Required

- bash (running npm scripts, inspecting build output, creating temporary fixtures)

## Acceptance Criteria

- [ ] `npm run build` from a clean tree produces exactly three `.cjs` files under `templates/skills/task-execute-task/scripts/`
- [ ] `git status` shows those three `.cjs` files as ignored (untracked)
- [ ] `templates/skills/task-execute-task/SKILL.md` frontmatter `name` equals `task-execute-task`
- [ ] Temporary fixture test passes: bundled `find-task-manager-root.cjs` resolves fixture root
- [ ] Temporary fixture test passes: bundled `validate-plan-blueprint.cjs` returns plan file path
- [ ] Temporary fixture test passes: bundled `check-task-dependencies.cjs` reports resolved deps (exit 0) and unresolved deps (exit 1)
- [ ] Cross-validation passes: bundled and legacy `check-task-dependencies.cjs` produce identical exit codes and semantically equivalent output on the same fixture
- [ ] Init regression passes: `npx . init --assistants claude,gemini,opencode,codex --destination-directory /tmp/regression-72` generates execute-task command files identically to before
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm pack --dry-run` lists all five skills' `templates/skills/*/scripts/*.cjs` files

## Technical Requirements

- Use temporary directories under `/tmp/` for fixture tests
- Do not modify source files during validation
- If any check fails, document the failure and halt; do not proceed to remaining checks

## Input Dependencies

- Task 1 output: TypeScript source and build pipeline registration
- Task 2 output: SKILL.md
- Task 3 output: Tests added and passing
- Task 4 output: AGENTS.md updated

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
   ls templates/skills/task-execute-task/scripts/
   # Expected: check-task-dependencies.cjs  find-task-manager-root.cjs  validate-plan-blueprint.cjs
   ```

2. **Git ignore check**
   ```bash
   git status --short templates/skills/task-execute-task/scripts/
   # Expected: three lines starting with ?? (untracked) because templates/skills/*/scripts/ is gitignored
   ```

3. **SKILL.md frontmatter check**
   ```bash
   head -5 templates/skills/task-execute-task/SKILL.md
   # Confirm name: task-execute-task
   ```

4. **Temporary fixture setup**
   ```bash
   fixture_dir=/tmp/skill-execute-task-fixture
   rm -rf "$fixture_dir"
   npx . init --assistants claude --destination-directory "$fixture_dir"
   # Manually create plan directory and task files under $fixture_dir/.ai/task-manager/plans/
   ```
   Create a plan with:
   - `plan.md` with frontmatter `id: 999`
   - `tasks/01--dep-task.md` with `status: completed`
   - `tasks/02--main-task.md` with `dependencies: [1]` and `status: pending`

   Copy the skill:
   ```bash
   cp -r templates/skills/task-execute-task "$fixture_dir/"
   ```

5. **Bundled script tests from fixture**
   ```bash
   cd "$fixture_dir"
   node task-execute-task/scripts/find-task-manager-root.cjs
   # Should print $fixture_dir/.ai/task-manager

   node task-execute-task/scripts/validate-plan-blueprint.cjs 999 planFile
   # Should print absolute path to plan file

   node task-execute-task/scripts/check-task-dependencies.cjs 999 2
   # Should exit 0, report dependency resolved

   # Change task 01 status to failed, rerun check-task-dependencies.cjs 999 2
   # Should exit 1
   ```

6. **Cross-validation**
   ```bash
   # Restore task 01 to completed
   # Run both bundled and legacy scripts on same fixture, capture exit codes and stdout
   bundled_exit=$?
   legacy_exit=$?
   # Assert bundled_exit == legacy_exit
   ```

7. **Init regression**
   ```bash
   npx . init --assistants claude,gemini,opencode,codex --destination-directory /tmp/regression-72
   # Inspect generated execute-task command files; they should match the originals
   ```

8. **Test and lint**
   ```bash
   npm test
   npm run lint
   ```

9. **Pack dry-run**
   ```bash
   npm pack --dry-run 2>&1 | grep 'templates/skills/.*/scripts/.*\.cjs'
   # Should list files for all five skills
   ```

### Failure handling
If any step fails, stop immediately, capture the error output, and report it. Do not attempt to fix issues during validation — fixes belong in the preceding tasks.

</details>
