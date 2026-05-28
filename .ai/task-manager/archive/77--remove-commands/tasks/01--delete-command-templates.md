---
id: 1
group: "templates"
dependencies: []
status: "completed"
created: "2026-05-21"
skills:
  - bash
---
# Delete the command-templates directory

## Objective
Remove `templates/assistant/commands/` and every file it contains so the project no longer carries the slash-command source-of-truth.

## Skills Required
`bash` for the recursive removal; no code generation involved.

## Acceptance Criteria
- [ ] `templates/assistant/commands/` does not exist on disk
- [ ] `git status` shows nine deletions under `templates/assistant/commands/tasks/` (create-plan.md, create-plan-auto.md, generate-tasks.md, execute-task.md, execute-blueprint.md, refine-plan.md, refine-plan-auto.md, fix-broken-tests.md, full-workflow.md) plus the directory itself
- [ ] `templates/assistant/agents/` and `templates/assistant/skills/` are unchanged

## Technical Requirements
`rm -rf` against the directory, then verify with `git ls-files templates/assistant/commands/` returns empty.

## Input Dependencies
None. This task starts the work.

## Output Artifacts
A clean `templates/assistant/` tree with only `agents/` and `skills/` remaining. After this task, the CLI build will not work until task 2 finishes — that's expected.

## Implementation Notes

<details>

Run from the repo root:

```
rm -rf templates/assistant/commands
git ls-files templates/assistant/commands | wc -l    # expect 0
ls templates/assistant/                                # expect: agents  skills
```

Do **not** touch `templates/assistant/agents/` or `templates/assistant/skills/`. Do **not** edit `.claude-plugin/plugin.json` — its only references are to `templates/assistant/skills/*` entries, which this task does not affect (verify with `cat .claude-plugin/plugin.json`).

</details>
