---
schema_version: 2
id: >-
  practice-isolate-concurrent-agent-changes-before-committing-by-excluding-entangled-files
title: >-
  Isolate concurrent-agent changes before committing by excluding entangled
  files from staging
kind: practice
tags:
  - git
  - concurrent-agents
  - staging
  - pre-commit
derived_from: []
relates_to:
  - practice-do-not-use-no-verify-to-skip-git-commit-hooks
confidence: high
summary: >-
  When two agents work on the same tree simultaneously, stage only your files;
  verify routing direction against HEAD; expect pre-commit failures from the
  other agent's in-progress WIP.
---
When multiple agents operate on the same working tree, changes from a concurrent process can overwrite or intermingle with yours mid-task. Before committing after such a session:

1. **Check HEAD routing** — determine the currently committed convention. Routing-sensitive files must match HEAD's convention in your isolated commit, not the uncommitted convention from the concurrent agent.
2. **Exclude entangled files from staging** — files where your edits and the concurrent agent's logic changes land in the same hunk cannot be cleanly split; leave them unstaged.
3. **Stage only your pure files** — verify each staged file with `git diff --cached <file>` to confirm no unrelated logic leaked in.
4. **Expect pre-commit hook failures from the concurrent WIP** — the hook runs `npm test` over the whole working tree, so broken tests from the other agent's uncommitted work will block your commit even when your change is green in isolation.
