---
id: 8
group: "tests"
dependencies: [1, 2, 4]
status: "completed"
created: 2026-05-28
skills:
  - jest
  - typescript
---
# Update test fixtures asserting brand identifiers

## Objective
Bring every test under `src/__tests__/` into alignment with the rebrand: any assertion on the bin name, package name, workspace directory path, template source path, or schema-version error message strings must reference the Strikethroo names. Behavioral assertions are not touched.

## Skills Required
- jest — running and reading the test suite, recognizing assertion patterns.
- typescript — editing TypeScript test files.

## Acceptance Criteria
- [ ] Every test file under `src/__tests__/` that asserts on the workspace directory path now expects `.ai/strikethroo/` (not `.ai/task-manager/`).
- [ ] Every test that asserts on the bin name or package name uses the Strikethroo identifiers.
- [ ] Every test that asserts on schema-version error message content checks for `npx strikethroo init` (workspace-older) or `npx skills add e0ipso/strikethroo` (skill-older).
- [ ] Every test that references the template source directory expects `templates/strikethroo/` (not `templates/ai-task-manager/`).
- [ ] No test is disabled, skipped, or `.todo`'d to accommodate the rename. If a test fails after edits, the production code is wrong, not the test.
- [ ] `npm test` exits zero.
- [ ] `grep -rEn 'ai-task-manager|task-manager|TASK_MANAGER\.md' src/__tests__/` returns no hits (other than intentional historical references documented in the task summary, if any).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Do not add new tests for the rebrand. The plan's success criteria are validated by the existing test suite plus the verification task (09); no additional unit tests are warranted.
- Do not change test structure (describe/it shape) or test names beyond replacing identifier substrings.
- If a fixture file (under `src/__tests__/fixtures/` or similar) materializes a workspace layout, rename the path components and update any included `.init-metadata.json` body if it embeds the workspace name.

## Input Dependencies
- Task 01 — package.json and plugin.json identifiers are set, so tests asserting on those can compare against the right values.
- Task 02 — directory layouts referenced by integration tests now resolve.
- Task 04 — workspace path constants and error message strings are updated, so the tests assert against the new strings.

## Output Artifacts
- Updated test files under `src/__tests__/`.

## Implementation Notes
<details>
<summary>Execution detail (test philosophy reminder included)</summary>

**Test philosophy reminder (per the skill's "write a few tests, mostly integration" rule):**

Meaningful tests verify custom business logic, critical paths, and edge cases specific to this application. Test *your* code, not the framework or library. When TO write tests: custom business logic and algorithms; critical user workflows and data transformations; edge cases and error conditions for core functionality; integration points between components; complex validation logic or calculations. When NOT to write tests: third-party library functionality; framework features; simple CRUD operations without custom logic; trivial getters/setters or static configuration; obvious functionality that would break immediately if incorrect. Combine related test scenarios into a single task; favor integration and critical-path coverage over per-method unit tests; do not add per-CRUD test tasks; question whether simple functions need a dedicated test task.

This task does NOT add new tests. It only updates existing assertions whose expected values changed because of the rebrand.

**Execution steps:**

1. **Inventory affected tests.**
   ```bash
   grep -rEln 'ai-task-manager|task-manager|TASK_MANAGER\.md|task-(create-plan|generate-tasks|execute-blueprint|execute-task|refine-plan|full-workflow)|\.ai/task-manager' /workspace/src/__tests__/
   ```
   This lists every test file containing a rebrand-affected identifier.

2. **Read each file** and triage the hits:
   - **Workspace path assertions** (e.g., `expect(...).toContain('.ai/task-manager')` or path joins under a temp dir) → update to `.ai/strikethroo`.
   - **Init metadata file path** (`/.ai/task-manager/.init-metadata.json`) → update.
   - **Template source path** (`templates/ai-task-manager`) → `templates/strikethroo`.
   - **Bin name assertions** (if any test invokes the CLI by `bin.ai-task-manager` or similar) → update to `bin.strikethroo`.
   - **Package name assertions** (if any test reads `package.json` and asserts on `name`) → update to `strikethroo`.
   - **Error message string assertions** (if any test asserts on the schema-version error strings) → update to match the new strings produced by task 04.
   - **Plugin manifest assertions** (if any test reads `.claude-plugin/plugin.json` and asserts on the `name` field or skill paths) → update to `strikethroo` and `st-*` paths.
   - **Test fixture filenames** (e.g., a fixture file at `src/__tests__/fixtures/ai-task-manager/...` if one exists) → rename with `git mv` and update any references.

3. **Run the test suite.**
   ```bash
   cd /workspace && npm test
   ```
   All tests must pass. If a test fails on something unrelated to the identifier rename, halt and investigate — the failure is real, not a side effect of the rebrand.

4. **Identifier sweep within tests.**
   ```bash
   grep -rEn 'ai-task-manager|task-manager|TASK_MANAGER\.md|task-(create-plan|generate-tasks|execute-blueprint|execute-task|refine-plan|full-workflow)|\.ai/task-manager' /workspace/src/__tests__/
   ```
   Should return no hits. Any remaining hit is a missed update or an intentional exception — surface in the task completion summary.

Edge case: integration tests that invoke `init` against a tmp directory will exercise the renamed templates source AND the renamed workspace directory in lockstep. If such a test runs `init`, snapshots the resulting directory layout, and asserts on it, the entire snapshot is updated — both the source path and the destination path.

If a test asserts on the README or AGENTS.md content (unlikely but possible), update those expected strings to match the new prose from task 06. If task 06 has not yet run when this task is reached, the test will simply fail at that point — note it in the summary and re-run after task 06.
</details>
