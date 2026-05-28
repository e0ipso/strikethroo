---
id: 6
group: "verification"
dependencies: [3, 4, 5]
status: "completed"
created: "2026-05-21"
skills:
  - bash
---
# Final verification — leave-no-trace sweep

## Objective
Prove the cleanup is complete: zero residual command references in source or docs, build green, tests green, lint green, and a smoke init produces the expected smaller tree.

## Skills Required
`bash` — running grep sweeps, build/test/lint commands, and a smoke `init` against a tmpdir.

## Acceptance Criteria
- [ ] `git grep -nE "(/tasks:|commands/tasks|claude-exec)" -- src/ templates/ docs/ README.md AGENTS.md MIGRATION.md` returns no output (CHANGELOG excluded by virtue of not being listed)
- [ ] `git ls-files templates/assistant/commands/ | wc -l` returns `0`
- [ ] `npm run build` succeeds
- [ ] `grep -nE "(claude-exec|/tasks:)" dist/cli.js dist/exec.js 2>/dev/null` returns no output (and `dist/exec.js` should not exist)
- [ ] `npm test` is green
- [ ] `npm run lint` passes with zero warnings
- [ ] Smoke test (Claude): `mktemp -d` → `node dist/cli.js init --assistants claude --destination-directory <tmpdir>` → verify `<tmpdir>/.ai/task-manager/` exists, `<tmpdir>/.claude/agents/plan-creator.md` exists, `<tmpdir>/.claude/commands/` does **not** exist
- [ ] Smoke test (non-Claude): same with `--assistants gemini,codex,cursor,github,opencode` → verify only `<tmpdir>/.ai/task-manager/` exists, and the output mentions installing skills via `npx skills add e0ipso/ai-task-manager`
- [ ] Unknown-command rejection: `node dist/cli.js claude-exec 1` exits non-zero with `Unknown command: claude-exec`

## Technical Requirements
Run the commands listed in the acceptance criteria from the repo root. Capture failures as concrete reports; do not paper over them.

## Input Dependencies
Tasks 3 (tests), 4 (top-level docs), 5 (docs site). The verification needs the full final state.

## Output Artifacts
A passing verification record. If any step fails, the failure is reported back to whoever is coordinating the plan and the failing task is re-opened.

## Implementation Notes

<details>

**Exact command sequence**:
```
# 1. Grep sweep — must return empty
git grep -nE "(/tasks:|commands/tasks|claude-exec)" -- src/ templates/ docs/ README.md AGENTS.md MIGRATION.md

# 2. Confirm command templates are gone
git ls-files templates/assistant/commands/ | wc -l           # expect 0
ls templates/assistant/                                       # expect: agents  skills

# 3. Build
npm run build

# 4. Inspect built artifacts
grep -nE "(claude-exec|/tasks:)" dist/cli.js                  # expect no output
ls dist/exec.js 2>/dev/null && echo "FAIL: dist/exec.js still exists"

# 5. Tests + lint
npm test
npm run lint

# 6. Smoke init — Claude
TMPDIR1=$(mktemp -d)
node dist/cli.js init --assistants claude --destination-directory "$TMPDIR1"
test -d "$TMPDIR1/.ai/task-manager" || echo "FAIL: no .ai/task-manager"
test -f "$TMPDIR1/.claude/agents/plan-creator.md" || echo "FAIL: no plan-creator agent"
test -d "$TMPDIR1/.claude/commands" && echo "FAIL: .claude/commands/ still emitted"
rm -rf "$TMPDIR1"

# 7. Smoke init — non-Claude assistants
TMPDIR2=$(mktemp -d)
node dist/cli.js init --assistants gemini,codex,cursor,github,opencode --destination-directory "$TMPDIR2"
test -d "$TMPDIR2/.ai/task-manager" || echo "FAIL: no .ai/task-manager for multi-assistant"
test ! -d "$TMPDIR2/.gemini" || echo "FAIL: .gemini/ should not exist"
test ! -d "$TMPDIR2/.codex" || echo "FAIL: .codex/ should not exist"
test ! -d "$TMPDIR2/.cursor" || echo "FAIL: .cursor/ should not exist"
test ! -d "$TMPDIR2/.github/prompts" || echo "FAIL: .github/prompts/ should not exist"
test ! -d "$TMPDIR2/.opencode" || echo "FAIL: .opencode/ should not exist"
rm -rf "$TMPDIR2"

# 8. Unknown command rejection
node dist/cli.js claude-exec 1
# expect: exit code != 0, message contains "Unknown command: claude-exec"
```

**Failure handling**: if any check fails, this task stays `in-progress` and a clear failure summary is reported. Do not edit other tasks' files from this task — flag failures back to the coordinator.

</details>
