---
id: 3
group: "testing"
dependencies: [1]
status: "completed"
created: "2026-05-18"
skills: ["jest", "typescript"]
---
# Add bundle smoke tests for task-full-workflow scripts

## Objective

Cover the five generated `.cjs` bundles for `task-full-workflow` with integration tests that verify each script is self-contained, runs correctly from a standalone fixture, and behaves identically to the legacy reference scripts where applicable. Follow the project's existing test philosophy: "write a few tests, mostly integration."

## Skills Required

- jest (integration test authoring, fixture setup/teardown)
- typescript (testing Node.js scripts, spawn/exec APIs, filesystem operations)

## Acceptance Criteria

- [ ] Bundle smoke tests exist for all five generated `.cjs` files under `templates/skills/task-full-workflow/scripts/`
- [ ] Each test confirms the bundled script resolves the fixture root (not the repository root) and behaves identically to legacy `.cjs` helpers
- [ ] Tests follow the existing `skill-scripts.test.ts` and `task-generate-tasks.skill.test.ts` patterns (temp directories, `execFileSync`, `beforeAll`/`beforeEach`/`afterEach`)
- [ ] Tests are placed in an appropriate existing or new test file under `src/__tests__/`
- [ ] `npm test` passes after the new tests are added

## Technical Requirements

- Use `fs.mkdtempSync`, `fs.cpSync`, and `fs.rmSync` for fixture lifecycle
- Use `execFileSync` from `child_process` to invoke scripts
- Build bundles in `beforeAll` via `execFileSync('npm', ['run', 'build:skills'], ...)` so `.cjs` artifacts exist
- Set `NO_COLOR: '1'` in the environment when spawning scripts to avoid ANSI codes in output
- Place new tests in `src/__tests__/skill-scripts.test.ts` (append to the existing file, following existing `describe` block patterns), or in a new `src/__tests__/task-full-workflow.skill.test.ts` if that keeps the file size manageable

## Input Dependencies

- Task 1 output: `scripts/build-skills.cjs` now registers `task-full-workflow` entrypoints
- Existing test patterns: `src/__tests__/skill-scripts.test.ts` and `src/__tests__/task-generate-tasks.skill.test.ts`
- Legacy reference scripts under `templates/ai-task-manager/config/scripts/`

## Output Artifacts

- Updated or new test file under `src/__tests__/`

## Implementation Notes

<details>

### Test structure

Create a `describe('task-full-workflow bundle smoke check', () => { ... })` block following the existing smoke check pattern.

### Fixture setup

```typescript
const buildFixtureRoot = (root: string): string => {
  const tm = path.join(root, '.ai', 'task-manager');
  fs.mkdirSync(tm, { recursive: true });
  fs.writeFileSync(
    path.join(tm, '.init-metadata.json'),
    JSON.stringify({ version: 'test' })
  );
  return tm;
};
```

Create a plan directory with tasks under the fixture so that `validate-plan-blueprint.cjs` and `get-next-task-id.cjs` have something to inspect.

### Tests to write

1. **`find-task-manager-root.cjs`**: Invoke from a nested working directory inside the fixture. Assert stdout resolves to the fixture's `.ai/task-manager` path.

2. **`get-next-plan-id.cjs`**: Invoke from fixture root. Assert output is `1` for a fresh fixture (no existing plans).

3. **`validate-plan-blueprint.cjs <planId> planFile`**: Create a sample plan, then invoke the script. Assert stdout is the absolute path to the plan file.

4. **`get-next-task-id.cjs <planId>`**: Create a sample plan with tasks `[1, 2]`. Assert output is `3`.

5. **`create-feature-branch.cjs <planFile>`**: Initialize a git repo in the fixture with a `main` branch and a clean commit. Invoke the script with the sample plan file. Assert it creates and switches to a branch named `feature/<planId>--<plan-name>`.

### Cross-validation against legacy
For `find-task-manager-root.cjs`, `get-next-plan-id.cjs`, and `validate-plan-blueprint.cjs` (which have legacy equivalents under `templates/ai-task-manager/config/scripts/`), optionally run both bundled and legacy versions on the same markdown-only fixture and assert identical output, mirroring the cross-validation tests in `skill-scripts.test.ts`.

### Environment
Always set `NO_COLOR: '1'` in the `env` passed to `execFileSync`.

</details>
