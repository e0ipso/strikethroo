---
id: 3
group: validation
dependencies:
  - 1
  - 2
status: completed
created: '2026-05-19'
skills:
  - bash
  - testing
---

# Run Regression Validation

## Objective

Execute the full validation and regression checklist from Plan 74 to confirm that modifying `SKILL.md` and `AGENTS.md` does not break the build, tests, lint, init pipeline, or bundled script behavior.

## Skills Required

- **bash**: Executing shell commands and inspecting filesystem artifacts.
- **testing**: Interpreting test output and asserting expected behavior.

## Acceptance Criteria

- [ ] `npm run build` completes successfully and `templates/skills/task-create-plan/scripts/` contains the expected `.cjs` files with unchanged content.
- [ ] `npm test` passes with zero failures.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npx . init --assistants claude,gemini,opencode,codex --destination-directory /tmp/regression-74` generates both `create-plan.md` and `create-plan-auto.md` identically to before.
- [ ] Bundle smoke tests (manual or via `src/__tests__/skill-scripts.test.ts`) pass for `find-task-manager-root.cjs` and `get-next-plan-id.cjs`.
- [ ] `npm pack --dry-run` lists the skill directory and its generated `scripts/*.cjs` files.

## Technical Requirements

- All commands must be run from the workspace root (`/workspace`).
- The init regression must use `/tmp/regression-74` as the destination directory to avoid polluting the workspace.
- If any test or lint failure occurs, stop immediately and report the failure details; do not proceed to later checks.
- The bundle smoke test can be executed manually by creating a temporary fixture directory with `.ai/task-manager/.init-metadata.json` and running the bundled `.cjs` files against it.

## Input Dependencies

- Task 1 completed (SKILL.md updated).
- Task 2 completed (AGENTS.md updated).
- Existing `npm test` suite.
- Existing `scripts/build-skills.cjs` and `npm pack` configuration.

## Output Artifacts

- Validation report (can be a summary comment or stdout capture) confirming all checks passed.
- `/tmp/regression-74` directory (can be cleaned up after verification).

## Implementation Notes

<details>
<summary>Click to expand detailed instructions for the non-thinking executor</summary>

1. Ensure you are in `/workspace`.
2. Run the build:
   ```bash
   npm run build
   ```
3. Verify bundled scripts exist and are unchanged:
   ```bash
   ls -la templates/skills/task-create-plan/scripts/
   # Expected: find-task-manager-root.cjs, get-next-plan-id.cjs
   ```
4. Run the test suite:
   ```bash
   npm test
   ```
5. Run lint:
   ```bash
   npm run lint
   ```
6. Run init regression:
   ```bash
   rm -rf /tmp/regression-74
   npx . init --assistants claude,gemini,opencode,codex --destination-directory /tmp/regression-74
   ```
   Then verify both command files exist:
   ```bash
   ls /tmp/regression-74/.claude/commands/tasks/create-plan.md
   ls /tmp/regression-74/.claude/commands/tasks/create-plan-auto.md
   ls /tmp/regression-74/.opencode/command/tasks/create-plan.md
   ls /tmp/regression-74/.opencode/command/tasks/create-plan-auto.md
   # Check other assistants as needed
   ```
7. Run bundle smoke test manually (if `npm test` does not already cover it):
   ```bash
   mkdir -p /tmp/smoke-74/.ai/task-manager
   echo '{"version":"1.0.0"}' > /tmp/smoke-74/.ai/task-manager/.init-metadata.json
   node templates/skills/task-create-plan/scripts/find-task-manager-root.cjs
   # Should print the absolute path if run from /tmp/smoke-74, otherwise fail gracefully
   ```
8. Run pack dry-run:
   ```bash
   npm pack --dry-run
   ```
   Inspect the output to confirm `templates/skills/task-create-plan/` and its scripts are included.
9. If all checks pass, report success. If any check fails, report the exact error and stop.
</details>
