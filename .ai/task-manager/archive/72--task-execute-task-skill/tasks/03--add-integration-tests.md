---
id: 3
group: "testing"
dependencies: [1]
status: "completed"
created: "2026-05-18"
skills: ["jest", "typescript"]
status: "completed"
status: "completed"
---
# Add integration tests for check-task-dependencies and skill bundles

## Objective

Cover the new TypeScript source and the generated `.cjs` bundles with integration tests that verify correctness, self-containment, and semantic equivalence with the legacy `check-task-dependencies.cjs`. Follow the project's existing test philosophy: "write a few tests, mostly integration."

## Skills Required

- jest (integration test authoring, fixture setup/teardown)
- typescript (testing TypeScript entrypoints, spawn/exec APIs)

## Acceptance Criteria

- [ ] Tests exist that exercise `check-task-dependencies.ts` logic via the bundled `.cjs` against real filesystem fixtures
- [ ] Bundle smoke check confirms each of the three generated `.cjs` files runs self-contained from a temporary directory that contains only the copied skill artifact
- [ ] Cross-validation test runs both the bundled `check-task-dependencies.cjs` and the legacy `.cjs` on the same fixture and confirms identical exit codes and semantically equivalent output
- [ ] Dependency validation tests cover: no dependencies, all completed, one failed, one in-progress, task not found, plan not found
- [ ] Tests follow the existing `skill-scripts.test.ts` patterns (temp directories, `execFileSync`, `beforeAll`/`beforeEach`/`afterEach`)
- [ ] `npm test` passes after the new tests are added

## Technical Requirements

- Use `fs.mkdtempSync`, `fs.cpSync`, and `fs.rmSync` for fixture lifecycle
- Use `execFileSync` from `child_process` to invoke scripts
- Build bundles in `beforeAll` via `execFileSync('npm', ['run', 'build:skills'], ...)` so `.cjs` artifacts exist
- Strip ANSI codes from output before assertions (see existing tests for the pattern)
- Place new tests in `src/__tests__/skill-scripts.test.ts` (append to the existing file, following the existing `describe` blocks)

## Input Dependencies

- Task 1 output: `src/skill-scripts/check-task-dependencies.ts` and updated `scripts/build-skills.cjs`
- Legacy reference script: `templates/ai-task-manager/config/scripts/check-task-dependencies.cjs`
- Existing test patterns: `src/__tests__/skill-scripts.test.ts`

## Output Artifacts

- Updated `src/__tests__/skill-scripts.test.ts` (new `describe` blocks appended)

## Implementation Notes

<details>

### Test fixture builder
Create a helper `buildTaskFixture(root, planId, tasks)` that:
1. Creates `.ai/task-manager/.init-metadata.json` with `{ version: 'test' }`
2. Creates `plans/<planId>--<name>/plan-<planId>--<name>.md` with valid frontmatter
3. Creates `plans/<planId>--<name>/tasks/` with the specified task files

Task file frontmatter should include `id`, `status`, and `dependencies` fields as needed.

### Bundle smoke check structure
Follow the exact pattern from the existing `task-execute-blueprint bundle smoke check`:

```typescript
describe('task-execute-task bundle smoke check', () => {
  let tempDir: string;
  let fixtureSkillDir: string;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], { cwd: REPO_ROOT, stdio: 'pipe' });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-smoke-exec-task-'));
    // build fixture...
    fixtureSkillDir = path.join(tempDir, 'task-execute-task');
    fs.cpSync(path.join(REPO_ROOT, 'templates', 'skills', 'task-execute-task'), fixtureSkillDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('find-task-manager-root.cjs resolves fixture root', () => { ... });
  test('validate-plan-blueprint.cjs returns plan file', () => { ... });
  test('check-task-dependencies.cjs reports resolved deps', () => { ... });
  test('check-task-dependencies.cjs reports unresolved deps', () => { ... });
});
```

### Dependency scenarios to test
1. **No dependencies**: task with `dependencies: []` → exit 0, message contains "no dependencies"
2. **All completed**: task depends on task A with `status: completed` → exit 0, message contains "All dependencies are resolved"
3. **One failed**: task depends on task A with `status: failed` → exit 1, message contains the failed dep
4. **One in-progress**: task depends on task A with `status: in-progress` → exit 1
5. **Task not found**: pass a nonexistent task ID → exit 1
6. **Plan not found**: pass a nonexistent plan ID → exit 1

### Cross-validation test
Create a fixture with at least one completed dep and one pending task that depends on it. Run:
- `bundledScript = path.join(REPO_ROOT, 'templates', 'skills', 'task-execute-task', 'scripts', 'check-task-dependencies.cjs')`
- `legacyScript = path.join(REPO_ROOT, 'templates', 'ai-task-manager', 'config', 'scripts', 'check-task-dependencies.cjs')`

For both scripts on the same fixture:
- Assert `exitCode` matches exactly
- Assert `stdout` contains the same dependency summary semantics (both report "ready to execute" or same unresolved list)

Then mutate the dependency task to `status: failed` and rerun both, asserting matching exit codes again.

### Important: `NO_COLOR=1`
Set `NO_COLOR: '1'` in the environment when spawning scripts to avoid ANSI codes in output.

### Import existing helpers
You can import `findTaskManagerRoot` and `resolvePlan` from the TypeScript source directly for unit-style assertions, but the primary coverage should be integration tests running the actual bundled `.cjs` files.

</details>
