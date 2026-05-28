---
id: 5
group: "tests"
dependencies: [1, 4]
status: "completed"
created: 2026-05-14
skills:
  - jest
  - typescript
---
# Add Tests for task-generate-tasks Skill Helpers and Bundles

## Objective
Cover the new TypeScript helpers and the bundled `.cjs` artifacts with the existing Jest setup. Tests must validate the actual integration behavior — plan resolution across formats, task ID allocation from real fixtures, and end-to-end bundle execution from a directory containing only the skill — not framework features.

## Skills Required
- `jest` — authoring integration tests in the existing Jest setup.
- `typescript` — TS source for the test file under `src/__tests__/`.

## Acceptance Criteria
- [ ] A new Jest test file (e.g. `src/__tests__/task-generate-tasks.skill.test.ts`) exists covering:
  - `computeNextTaskId` returns `1` for a plan with no `tasks/` dir, `1` for an empty `tasks/` dir, and `max(id)+1` for a populated `tasks/` dir.
  - `resolvePlan` resolves a plan by numeric ID (from a fixture with both `plans/` and `archive/` directories) and by absolute path.
  - The bundled `find-task-manager-root.cjs` under `templates/skills/task-generate-tasks/scripts/` resolves the fixture root, executed self-contained.
  - The bundled `validate-plan-blueprint.cjs` returns the expected `planFile` field for a fixture plan ID.
  - The bundled `get-next-task-id.cjs` output matches the legacy `templates/ai-task-manager/config/scripts/get-next-task-id.cjs` output for the same fixture and plan ID.
- [ ] Tests run from a clean checkout via `npm test` and pass.
- [ ] Tests build their own temp fixtures via `fs.mkdtempSync` and clean up via `afterEach`/`afterAll`. They do not depend on this repository's `.ai/task-manager/` state.
- [ ] Existing tests continue to pass.

## Technical Requirements
- Follow the structure of `src/__tests__/skill-scripts.test.ts` — that file is the model. Reuse its bundle-build `beforeAll` pattern (`execFileSync('npm', ['run', 'build:skills'], …)`) to ensure `.cjs` artifacts exist before smoke tests run.
- Use `execFileSync('node', [bundledScript], { cwd: fixture, encoding: 'utf8' })` for bundle invocations — execute from inside the fixture so the bundles cannot accidentally find the host repository's `.ai/task-manager/`.
- Where the bundled output must agree with the legacy `.cjs`, run both against the same Markdown-only fixture and assert equality. (HTML/Markdown differences in the legacy `.cjs` mirror those documented in the existing test file.)
- Do not test third-party framework features. Test only the new helpers + bundle parity.

## Input Dependencies
- Task 1 — new TypeScript modules must exist for direct-call unit tests.
- Task 4 — build pipeline registration must be in place; `beforeAll` triggers the build, which needs both the entrypoints (task 1) and registry entries (task 4).

## Output Artifacts
- `src/__tests__/task-generate-tasks.skill.test.ts`

## Implementation Notes

<details>

### Fixture builder

Reuse the shape of `buildMixedFixture` from `src/__tests__/skill-scripts.test.ts`. Add a small extension to create a plan with a `tasks/` subdirectory containing markdown task files with `id:` frontmatter values (e.g. ids 1 and 2) so `computeNextTaskId` can be exercised on a populated case.

Pseudocode:

```ts
const writeFile = (filePath: string, contents: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

const buildPlanWithTasks = (root: string, planId: number, taskIds: number[]) => {
  const tm = path.join(root, '.ai', 'task-manager');
  fs.mkdirSync(tm, { recursive: true });
  fs.writeFileSync(path.join(tm, '.init-metadata.json'), JSON.stringify({ version: 'test' }));
  const padded = String(planId).padStart(2, '0');
  const planDir = path.join(tm, 'plans', `${padded}--fixture`);
  writeFile(
    path.join(planDir, `plan-${padded}--fixture.md`),
    `---\nid: ${planId}\nsummary: "fx"\ncreated: 2026-05-14\n---\nbody\n`
  );
  taskIds.forEach((tid) => {
    const tpad = String(tid).padStart(2, '0');
    writeFile(
      path.join(planDir, 'tasks', `${tpad}--task.md`),
      `---\nid: ${tid}\ngroup: "g"\ndependencies: []\nstatus: "pending"\ncreated: 2026-05-14\nskills: ["typescript"]\n---\nbody\n`
    );
  });
  return planDir;
};
```

### Direct-call tests

```ts
import { resolvePlan } from '../skill-scripts/shared/plan-resolve';
import { computeNextTaskId } from '../skill-scripts/shared/task-scan';

test('computeNextTaskId returns 1 when tasks/ missing', () => { … });
test('computeNextTaskId returns max(id)+1 when tasks/ populated', () => { … });
test('resolvePlan resolves by numeric ID from cwd inside the tree', () => { … });
test('resolvePlan resolves by absolute path', () => { … });
```

For numeric resolution, set `process.cwd()` implicitly via the fixture path passed as `startPath` — `resolvePlan(id, startPath)` mirrors the legacy CLI behavior.

### Bundle smoke tests

```ts
beforeAll(() => {
  execFileSync('npm', ['run', 'build:skills'], { cwd: REPO_ROOT, stdio: 'pipe' });
});
```

For each of the three bundled scripts:
- Copy the entire `templates/skills/task-generate-tasks/` directory into the temp fixture (use `fs.cpSync(..., { recursive: true })`).
- Execute the bundled script from inside the fixture (`cwd: tempDir`).
- Assert on stdout. For the `get-next-task-id` parity check, also run the legacy reference and assert equality on a Markdown-only fixture.

### Out of scope

- Do not test the existing `task-create-plan` bundles here — they have their own coverage.
- Do not assert on stderr formatting of error messages beyond exit code, unless the test is genuinely depending on a specific failure path.

</details>
