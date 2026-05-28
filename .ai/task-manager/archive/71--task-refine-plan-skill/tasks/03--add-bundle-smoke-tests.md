---
id: 3
group: "testing"
dependencies: [1]
status: "completed"
created: "2026-05-18"
skills: ["jest", "nodejs"]
---
# Add bundle smoke tests for task-refine-plan scripts

## Objective
Add a Jest `describe` block to `src/__tests__/skill-scripts.test.ts` that smoke-checks the `task-refine-plan` bundled `.cjs` files end-to-end from a temporary fixture. This mirrors the existing bundle smoke checks for `task-create-plan` and `task-execute-blueprint`.

## Skills Required
- `jest`: Writing integration tests using the project's existing Jest setup.
- `nodejs`: Executing bundled scripts via `child_process.execFileSync` and asserting filesystem behavior.

## Acceptance Criteria
- [ ] A new `describe('task-refine-plan bundle smoke check', ...)` block is added to `src/__tests__/skill-scripts.test.ts`.
- [ ] The test block has a `beforeAll` that runs `npm run build:skills` so bundles exist.
- [ ] The test block has a `beforeEach` that:
  - Creates a temp directory with a valid `.ai/task-manager` root.
  - Creates a sample plan directory under `plans/` with a `plan-{id}--{name}.md` file containing valid frontmatter.
  - Copies the entire `templates/skills/task-refine-plan/` directory into the temp fixture.
- [ ] One test case runs `scripts/find-task-manager-root.cjs` from inside the fixture (from a nested working directory) and asserts it resolves the fixture's root, not the repository's root.
- [ ] One test case runs `scripts/validate-plan-blueprint.cjs <plan-id> planFile` from inside the fixture and asserts it returns the absolute path to the sample plan file.
- [ ] All tests in the file continue to pass (`npm test`).

## Technical Requirements
- Use the same helper patterns as the existing `skill bundle smoke check` and `task-execute-blueprint bundle smoke check` tests in the same file.
- Use `fs.cpSync` to copy the skill directory; use `fs.mkdtempSync` for the temp directory.
- Clean up temp directories in `afterEach`.

## Input Dependencies
- Task 1 must be complete so `npm run build:skills` produces the `task-refine-plan` bundles.

## Output Artifacts
- Updated `src/__tests__/skill-scripts.test.ts` with the new `task-refine-plan` test block.

## Implementation Notes
<details>
1. Locate the existing `describe('task-execute-blueprint bundle smoke check', ...)` block at the end of `src/__tests__/skill-scripts.test.ts`. Use it as the exact structural template.
2. Add a new `describe` block immediately after it.
3. In `beforeEach`, build a fixture with `.ai/task-manager/.init-metadata.json`, a plan directory like `plans/03--alpha/plan-03--alpha.md`, and copy `templates/skills/task-refine-plan/` into the temp dir.
4. Write two test cases:
   - `find-task-manager-root.cjs resolves fixture root` — run from inside the plan directory, assert stdout equals the fixture's task-manager root.
   - `validate-plan-blueprint.cjs returns plan file path` — run with args `['3', 'planFile']`, assert stdout equals the absolute path to `plan-03--alpha.md`.
5. Ensure `afterEach` removes the temp directory.
6. Run `npm test` to verify.
</details>
