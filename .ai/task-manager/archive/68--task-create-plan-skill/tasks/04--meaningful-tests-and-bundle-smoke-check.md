---
id: 4
group: "validation"
dependencies: [2]
status: "completed"
created: "2026-05-14"
skills:
  - jest
  - typescript
---
# Add meaningful tests for skill helpers and bundle smoke check

## Objective
Cover the centralized TypeScript helpers with focused Jest tests and add a smoke check that runs each generated `.cjs` end-to-end against a temporary fixture directory that contains only the skill (not the repository). The intent is to catch logic drift between the existing `.cjs` reference scripts and the new TypeScript port — especially around plan ID allocation across `.md` and `.html` plans, and `plans/` versus `archive/`.

## Skills Required
- `jest`: write integration-style tests using the project's existing Jest setup.
- `typescript`: tests are authored in TypeScript and import the helpers from `src/skill-scripts/`.

## Acceptance Criteria
- [ ] At least one test file exists under `src/__tests__/` (matching the project's existing test layout) covering the TypeScript helpers from task 1. Focus on:
  - Plan ID allocation across `plans/` and `archive/`.
  - Plan ID allocation correctly handling both `.md` and `.html` plan files (mix in the same fixture).
  - Task-manager root discovery from a nested working directory.
- [ ] A smoke check executes each generated `.cjs` bundle from a temporary fixture directory that contains only the skill (no `src/`, no `dist/`, no other repo files). Verify the bundle is self-contained.
- [ ] The plan-ID smoke check is cross-validated against the existing `templates/ai-task-manager/config/scripts/get-next-plan-id.cjs` running over the same fixture: both must produce the same integer.
- [ ] The smoke check exists as a Jest test (so `npm test` exercises it) and uses real filesystem operations (temp directory via `fs.mkdtempSync(path.join(os.tmpdir(), ...))`); no mocking of `fs`.
- [ ] Tests run `npm run build` (or invoke the build script programmatically) as part of the setup if needed; otherwise they are skipped with a clear message if the bundles are not present, AND CI documentation notes that `npm run build` must precede `npm test` for full coverage. The simpler path — building in the test setup — is preferred.
- [ ] `npm test` passes after this task.
- [ ] No test cheating: no environment-detection branches in the source to bypass real behavior, no assertion edits to mask logic drift. If a test exposes a bug, fix the bug in task 1's source.

## Technical Requirements
- Jest configuration is already in place; tests follow the conventions visible in `src/__tests__/`.
- Temporary fixtures are created at runtime, written to disk, and cleaned up in `afterAll` / `afterEach`.
- The fixture for the smoke check must mirror the minimum directory structure required to operate: `.ai/task-manager/.init-metadata.json` (with `{ "version": "..." }`), `.ai/task-manager/plans/<some-existing-plan>/plan-NN--name.md` and `.ai/task-manager/archive/<another>/plan-NN--name.html`, then the skill directory copied in with its `scripts/*.cjs` bundles.
- Cross-validation step runs the existing `.cjs` via `child_process.execFileSync('node', [referenceCjs, root])` and the bundled `.cjs` via `child_process.execFileSync('node', [bundledCjs])` from inside the fixture; compare stdout.

## Input Dependencies
- Task 2: `npm run build` must produce the bundled `.cjs` files this task executes. Task 2 also transitively requires task 1's source.

## Output Artifacts
- One or more new test files under `src/__tests__/` covering helpers and the bundle smoke check.
- Possibly a small test utility under `src/__tests__/helpers/` to construct fixture directories (if useful for reuse).

## Implementation Notes

> **Meaningful Test Strategy Guidelines (copied for in-task reference)**
>
> Your critical mantra for test generation is: "write a few tests, mostly integration".
>
> **Definition of "Meaningful Tests":** Tests that verify custom business logic, critical paths, and edge cases specific to the application. Focus on testing YOUR code, not the framework or library functionality.
>
> **When TO Write Tests:**
> - Custom business logic and algorithms
> - Critical user workflows and data transformations
> - Edge cases and error conditions for core functionality
> - Integration points between different system components
> - Complex validation logic or calculations
>
> **When NOT to Write Tests:**
> - Third-party library functionality (already tested upstream)
> - Framework features
> - Simple CRUD operations without custom logic
> - Getter/setter methods or basic property access
> - Configuration files or static data
> - Obvious functionality that would break immediately if incorrect
>
> **Test Task Creation Rules:**
> - Combine related test scenarios into single tasks.
> - Focus on integration and critical path testing over unit test coverage.
> - Avoid creating separate tasks for testing each CRUD operation individually.
> - Question whether simple functions need dedicated test tasks.

<details>
<summary>Step-by-step implementation guidance</summary>

1. **Add one Jest file** like `src/__tests__/skill-scripts.test.ts`. Inside it:
   - `describe('plan ID allocation')`: build a fixture directory in `beforeAll` with this layout:
     ```
     <tmp>/.ai/task-manager/.init-metadata.json   { "version": "test" }
     <tmp>/.ai/task-manager/plans/03--alpha/plan-03--alpha.md   (frontmatter id: 3)
     <tmp>/.ai/task-manager/plans/07--beta/plan-07--beta.html   (<meta name="id" content="7">)
     <tmp>/.ai/task-manager/archive/02--gamma/plan-02--gamma.md (id: 2)
     ```
     Import the TS helper from `src/skill-scripts/...` and assert `getAllPlans(root)` returns 3 entries with IDs `[2,3,7]` in some order, and the next-plan-id computation returns `8`.
   - `describe('task-manager root discovery')`: create a fixture, `process.chdir` into a nested subdirectory, call the helper, expect the returned path. Restore `process.chdir` in `afterEach`.
   - `describe('bundle smoke check')`: run `npm run build` once in `beforeAll` (use `execFileSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'pipe' })`), then copy `templates/skills/task-create-plan/` into a temp dir (containing only the skill and a fresh `.ai/task-manager/...` fixture). From inside that temp dir, execute `node <tmp>/task-create-plan/scripts/get-next-plan-id.cjs` and `node <tmp>/task-create-plan/scripts/find-task-manager-root.cjs`. Assert both succeed and produce the expected outputs.
   - Cross-validate against `templates/ai-task-manager/config/scripts/get-next-plan-id.cjs` running over the same fixture's `.ai/task-manager` root; both stdout integers must match.
2. **Use `fs.mkdtempSync` + `fs.rmSync(..., { recursive: true })`** in `afterAll`. Never reuse a hard-coded tmp path.
3. **Do not mock `fs`, `child_process`, or `path`**. Use real filesystem operations consistent with the rest of the codebase's tests.
4. **If the smoke check requires `npm run build` to have run**, prefer building in `beforeAll`. If runtime is excessive, mark just the smoke-check block as conditional via `process.env.SKIP_SKILL_BUILD_SMOKE` only when there is a concrete CI reason — and document it clearly. Default is: build in `beforeAll`.
5. **Confirm no production code added test-specific branches**. Re-read the files modified in task 1 and confirm no `if (process.env.NODE_ENV === 'test')` or similar exists.
6. **Run `npm run lint` and `npm test`** to confirm both pass.

</details>
