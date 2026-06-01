---
id: 4
group: "verification"
dependencies: [3]
status: "completed"
created: 2026-05-28
skills:
  - jest
  - typescript
---
# Integration tests for the workspace data layer

## Objective
Write integration-first tests for the workspace model covering the plan's
explicit success criteria: derived state, mermaid extraction, the no-tasks
`drafted` case, frontmatter list-form variance, archive flagging, and config
enumeration counts — using real filesystem fixtures (this repo's own
`.ai/strikethroo/` for the happy path; small synthetic fixtures for edge cases).

## Skills Required
- **jest**: Integration tests with ts-jest against real filesystem fixtures.
- **typescript**: Typed test setup and assertions against the model's exports.

## Acceptance Criteria
- [ ] Against this repository's own `.ai/strikethroo/`, a test asserts plan 38
      reads as `state: done`, `done: 3`, `total: 3`, `phaseCount: 1`.
- [ ] A test asserts plan 38's Architectural Approach mermaid source is
      extracted and non-empty.
- [ ] A test asserts the model contains at least one entry with
      `archived: true` (parsed from `archive/`).
- [ ] A test asserts config enumeration yields 9 hooks and 4 templates, each
      with `id`, file, and content.
- [ ] A synthetic fixture with a `plan.md` but no `tasks/` directory parses as
      `state: drafted` without throwing.
- [ ] A test asserts a task file with an unknown/in-progress status does not
      throw and is counted as started (contributes to `doing`).
- [ ] A test covers frontmatter list-form variance: both inline-array
      (`dependencies: []`) and dashed-list (`skills:\n  - typescript`) forms
      parse correctly.
- [ ] `npm test`, `npm run lint`, and `npm run build` all pass.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Tests under the existing test location/convention (e.g. `src/__tests__/`),
  using Jest + ts-jest as the rest of the suite does.
- Happy-path assertions run against the live repo workspace at
  `.ai/strikethroo/`. Edge cases use small synthetic on-disk fixtures created
  in a temp directory (real files, not mocks).
- Import the model's exported functions/types from `src/serve/workspace-model.ts`.

## Input Dependencies
- Task 3: the complete exported workspace model API.

## Output Artifacts
- A test file (or files) exercising the success criteria above, plus any small
  synthetic fixture files needed for the edge cases.

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

**Test philosophy — "write a few tests, mostly integration."**
Meaningful tests verify custom business logic, critical paths, and edge cases
specific to this application. Test *your* code, not the framework or library.

*When TO write tests:* custom business logic and algorithms; critical user
workflows and data transformations; edge cases and error conditions for core
functionality; integration points between components; complex validation logic
or calculations.

*When NOT to write tests:* third-party library functionality; framework
features; simple CRUD operations without custom logic; trivial getters/setters
or static configuration; obvious functionality that would break immediately if
incorrect.

*Test task creation rules:* combine related test scenarios into a single task;
favor integration and critical-path coverage over per-method unit tests; avoid
one test task per CRUD operation; question whether simple functions need a
dedicated test task.

Apply this directly: do NOT write exhaustive per-function unit tests for the
parsing primitives. Drive coverage through the assembled model against real
fixtures, adding only the targeted edge-case fixtures the success criteria
demand.

**Happy path.** Point the model at this repo's `.ai/strikethroo/` (resolve the
path relative to the test file or `process.cwd()`). Find plan 38 in the model
output and assert `state`, `done`, `total`, `phaseCount`, and non-empty
Architectural Approach mermaid. Assert ≥1 `archived: true` entry and
`config.hooks.length === 9`, `config.templates.length === 4`.

**Synthetic fixtures.** In a temp dir (e.g. via `fs.mkdtempSync`), construct a
minimal `.ai/strikethroo/` containing:
- a plan with a valid `plan.md` and NO `tasks/` dir → expect `drafted`, no
  throw;
- a plan whose task has an unknown status (e.g. `status: in-progress` or a
  made-up value) → expect no throw, counted as started → plan `doing`;
- task frontmatter using inline-array deps and dashed-list skills → assert both
  parse to the expected arrays.
Clean up temp dirs in `afterEach`/`afterAll`.

Ensure `npm test`, `npm run lint`, and `npm run build` are green before
completing.
</details>
