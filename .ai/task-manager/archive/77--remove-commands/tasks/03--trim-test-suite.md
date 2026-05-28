---
id: 3
group: "tests"
dependencies: [2]
status: "completed"
created: "2026-05-21"
skills:
  - jest
  - typescript
---
# Trim test suite to match new CLI surface

## Objective
Delete tests that exist only to validate removed code and trim the integration suite so it covers only surviving CLI behaviour. After this task, `npm test` must be green.

## Skills Required
`jest` (Jest test-file structure, mocking patterns) and `typescript` (since the integration tests are TS).

## Acceptance Criteria
- [ ] `src/__tests__/exec.test.ts` deleted
- [ ] `src/__tests__/orchestration.integration.test.ts` deleted
- [ ] `src/__tests__/cli.integration.test.ts` trimmed: no test references `.claude/commands/tasks/`, `.gemini/commands/tasks/`, `.opencode/command/tasks/`, `.cursor/commands/tasks/`, `.codex/prompts/`, or `.github/prompts/`. No test asserts TOML conversion. No test asserts file renaming with `tasks-` prefix.
- [ ] Tests that survive: init creates `.ai/task-manager/` structure, init copies common templates, init writes `.init-metadata.json`, init copies Claude agents, conflict-detection between re-init runs, `--force` flag behaviour, CLI help/version/no-args
- [ ] `src/__tests__/conflict-detection.integration.test.ts` is unchanged (verify by reading it; it operates on `.ai/task-manager/config/` which is unaffected)
- [ ] Skill-script tests (`skill-scripts.test.ts`, `task-full-workflow.skill.test.ts`, `task-generate-tasks.skill.test.ts`, `validate-plan-blueprint.test.ts`, `shared-utils.unit.test.ts`, `scripts.unit.test.ts`, `plan.test.ts`, `status.test.ts`, `utils.test.ts`, `get-next-plan-id.test.ts`) are unchanged unless they import from the deleted `src/exec.ts`
- [ ] `npm test` passes
- [ ] `npm run lint` passes on the trimmed test files

## Technical Requirements
- Delete `src/__tests__/exec.test.ts`
- Delete `src/__tests__/orchestration.integration.test.ts`
- Edit `src/__tests__/cli.integration.test.ts`:
  - Remove all `describe`/`it` blocks whose entire purpose is asserting paths under `.<assistant>/commands/`, `.codex/prompts/`, or `.github/prompts/`
  - Remove the multi-assistant `describe` block testing template renaming and TOML conversion
  - Remove tests that assert Codex's flat-directory naming convention
  - Keep tests that validate: init success, common-template copying, `.ai/task-manager/` structure, metadata creation, CLI flag handling, force-overwrite behaviour, agent copying for claude
  - If `utils.test.ts` tests the removed `convertMdToGitHubPrompt` or `convertMdToToml` functions, remove those test blocks too — check with `grep -n convertMdToGitHubPrompt src/__tests__/utils.test.ts` first

## Input Dependencies
Task 2 (trimmed src/). The test suite cannot pass against the old src/ since the old src/ would have type errors from the partial Stage-2 edits, and the test suite cannot pass against a new src/ that still has the old tests since they reference deleted directories.

## Output Artifacts
A green test suite that meaningfully validates the surviving CLI behaviour.

## Implementation Notes

<details>

**Approach**:
1. Delete the two whole-file casualties first (`exec.test.ts`, `orchestration.integration.test.ts`).
2. Run `npm test`. Many `cli.integration.test.ts` tests will now fail because the directories they expect don't get created.
3. Walk through `cli.integration.test.ts` top-to-bottom. For each failing test, decide: does it assert something about the surviving init behaviour? If yes, fix the assertions. If no (it's testing removed surface), delete the `it(...)` block.
4. Re-run `npm test` after each batch of deletions until green.

**Likely cuts in `cli.integration.test.ts`** (approximate line ranges from the audit):
- Lines 77-86: array of `tasks-*.prompt.md` filenames — GitHub-specific, delete the test that uses this
- Lines 108-113: `commandsPath` setup for multi-assistant test — delete
- Lines 167-200: assertions about per-assistant command file paths (claude/cursor/gemini/github) — delete
- Lines 244-283: cursor-specific `commands/tasks` tree tests — delete
- Lines 292-330: Gemini TOML generation and content tests — delete
- Lines 343-470: per-assistant cross-orthogonality tests — delete
- Lines 640-720: Claude-specific command file tests — delete
- Lines 780-870: Codex prompts directory tests — delete
- Lines 889-920: Cursor commands/tasks structure — delete

These ranges are approximate from the initial audit; the actual line numbers will shift as deletions accumulate. Use test names rather than line numbers as anchors.

**Surviving structure** of `cli.integration.test.ts` (rough sketch):
```typescript
describe('init', () => {
  it('creates .ai/task-manager/ directory structure', ...)
  it('copies common templates', ...)
  it('writes .init-metadata.json with current schema version', ...)
  it('copies Claude agents when assistant is claude', ...)
  it('emits a skills notice for non-Claude assistants', ...) // NEW or adapted
  it('handles --force overwrite', ...)
  it('prompts on conflict between runs', ...)        // if currently here
});
describe('CLI', () => {
  it('shows help with --help', ...)
  it('shows version with --version', ...)
  it('shows help with no args', ...)
  it('rejects unknown commands', ...)
  // NO claude-exec test — that subcommand is gone
});
```

**Snapshot-style tests** (if any) that snapshot the list of created files: update the snapshot to reflect the new (smaller) tree. Do not delete snapshot tests; update them.

</details>
