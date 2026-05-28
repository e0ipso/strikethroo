---
id: 4
group: "testing"
dependencies: [1]
status: "completed"
created: "2026-05-18"
skills:
  - "jest"
  - "typescript"
---
# Add Jest tests for create-feature-branch.ts and bundle smoke checks

## Objective
Cover the new TypeScript source (`create-feature-branch.ts` and `git-utils.ts`) and the generated bundles with tests that mirror the patterns established for plans 68 and 69. Add a cross-validation test that runs both the legacy `create-feature-branch.cjs` and the bundled `.cjs` against temporary git fixtures to assert identical branch names and exit codes for the overlapping surface. Add a bundle smoke check that executes the generated `.cjs` from a directory containing only the skill artifact.

## Skills Required
- `jest` — writing integration tests with temporary fixtures
- `typescript` — importing and testing TypeScript source code

## Acceptance Criteria
- [ ] New tests are added to `src/__tests__/skill-scripts.test.ts` (or a new test file if more appropriate)
- [ ] Tests exercise `create-feature-branch.ts` logic through temporary git repositories:
  - Creating a branch from a clean `main`/`master` working tree
  - Skipping branch creation when not on `main`/`master`
  - Skipping when uncommitted changes exist
  - Reusing an existing branch
  - Sanitizing plan names correctly
- [ ] A cross-validation test runs both the legacy `templates/ai-task-manager/config/scripts/create-feature-branch.cjs` and the bundled `templates/skills/task-execute-blueprint/scripts/create-feature-branch.cjs` against the same temporary git fixture and asserts identical branch names and exit codes
- [ ] A bundle smoke check confirms the three generated `.cjs` files in `templates/skills/task-execute-blueprint/scripts/` execute self-contained from a copied skill directory (no repository context required)
- [ ] `npm test` passes after the new tests are added
- [ ] The legacy `.cjs` files are not modified

## Technical Requirements
- Use `fs.mkdtempSync`, `fs.cpSync`, and `child_process.execFileSync` for fixture management (same pattern as existing `skill-scripts.test.ts`)
- Use `child_process.execSync('git init ...')` to create temporary git repositories
- The cross-validation test must compare the legacy `.cjs` and bundled `.cjs` on a markdown-only fixture so both resolve the same plan
- Do not mock the git commands; use real temporary git repos

## Input Dependencies
- Task 1 output: `src/skill-scripts/create-feature-branch.ts`, `src/skill-scripts/shared/git-utils.ts`, updated `scripts/build-skills.cjs`, and generated bundles under `templates/skills/task-execute-blueprint/scripts/`
- Existing `src/__tests__/skill-scripts.test.ts` for structural patterns
- Legacy `templates/ai-task-manager/config/scripts/create-feature-branch.cjs` as the reference for cross-validation

## Output Artifacts
- Updated or new Jest test file(s) under `src/__tests__/`

## Implementation Notes

<details>

### Meaningful Test Strategy

Your critical mantra for test generation is: "write a few tests, mostly integration".

**When TO write tests:**
- Custom business logic and algorithms (branch name sanitization, plan resolution, git state checks)
- Critical user workflows (feature branch creation from a plan ID)
- Edge cases and error conditions (not on main, dirty working tree, branch already exists)
- Integration points between components (TypeScript source → esbuild bundle → runtime behavior)

**When NOT to write tests:**
- Third-party library functionality (`execSync` itself)
- Framework features (Jest matchers)
- Simple getters/setters or trivial wrappers (the `execGit` wrapper is tested implicitly through the integration tests)

### Test structure

1. **Git fixture builder** — Create a helper that:
   - Makes a temp directory
   - Runs `git init`, `git checkout -b main`, optionally creates a plan file inside `.ai/task-manager/...`
   - Returns the directory path

2. **Unit-style integration tests for `create-feature-branch.ts`** (import the exported `main` or internal helpers if exported):
   - `sanitizeBranchName`: test non-alphanumeric collapse, hyphen trimming, 60-char truncation
   - `extractPlanName`: test parsing `{id}--{name}` directories
   - `main` with a temp git repo: create branch, skip when dirty, skip when wrong branch, reuse existing

3. **Cross-validation test**:
   - Build a fixture with `.ai/task-manager`, a plan file, and a git repo on `main`
   - Run the legacy `.cjs` with the plan ID and capture exit code + branch name
   - Run the bundled `.cjs` with the same plan ID and capture exit code + branch name
   - Assert both exit codes are `0` and both branch names match exactly

4. **Bundle smoke check**:
   - After `npm run build:skills`, copy `templates/skills/task-execute-blueprint/` to a temp directory
   - From a nested working directory inside a fixture, run each `.cjs`:
     - `find-task-manager-root.cjs` → resolves fixture root
     - `validate-plan-blueprint.cjs <id> planFile` → returns absolute plan path
     - `create-feature-branch.cjs <id>` → creates the expected branch

### Important notes

- The legacy `create-feature-branch.cjs` imports `resolvePlan` from `./shared-utils.cjs`, which only recognizes `.md` plans. The bundled `.cjs` uses `shared/plan-resolve.ts`, which also recognizes `.html`. For the cross-validation test, use a `.md` plan so both resolve it identically.
- Make sure to run `npm run build:skills` in a `beforeAll` hook if the bundles are needed for tests, mirroring the existing `skill-scripts.test.ts` pattern.
- If the legacy `.cjs` is not executable from a standalone copy (because it depends on `shared-utils.cjs`), run it from the repository root where the sibling file exists, and compare behavior against the bundled version run from a standalone copy.

</details>
