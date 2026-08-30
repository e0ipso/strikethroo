---
type: practice
title: lint-staged scopes lint/format but pre-commit still runs the full test suite
description: >-
  lint-staged runs eslint+prettier on staged src files; the pre-commit hook
  still runs the full npm test suite after lint-staged completes.
tags:
  - linting
  - tooling
  - eslint
  - prettier
  - pre-commit
kk_schema_version: 3
kk_id: >-
  practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite
kk_derived_from: []
kk_relates_to:
  - >-
    practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution
kk_depends_on: []
kk_confidence: high
---
The `.husky/pre-commit` hook first rejects staged generated skill artifacts from either `skills/` or `templates/harness/skills/`. It then runs `npx lint-staged`, followed by `npm test`.

lint-staged runs `eslint --fix` and `prettier --write` on `src/**/*.{ts,tsx}` and `prettier --write` on `src/**/*.css`. A commit containing only Kenkeep Markdown skips those formatters, but it still runs the full unit and end-to-end suite. Commit time is therefore dominated by `npm test`, not lint-staged.

lint-staged config in package.json:
```json
"lint-staged": {
  "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "src/**/*.css": ["prettier --write"]
}
```

<!-- kk:related:start -->
# Related

- Related: [practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution](/git/practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution.md)
<!-- kk:related:end -->
