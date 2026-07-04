---
type: practice
title: Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)
description: >-
  A commit-message hook enforces 50-char subject lines and 72-char body
  wrapping; violations abort the commit.
tags:
  - git
  - commit
  - hooks
  - formatting
kk_schema_version: 3
kk_id: practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced
kk_derived_from: []
kk_relates_to:
  - practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers
kk_depends_on: []
kk_confidence: high
---
The project enforces a commit-message formatting hook: subject lines must be ≤50 characters and body lines must wrap at ≤72 characters. Commits that violate either rule are aborted by the hook immediately — before the test suite runs.

This is a separate hook from the AI-attribution rejection rule; both operate independently on every commit.

When authoring commit messages, keep the subject imperative and ≤50 chars; hard-wrap any body paragraph text at the 72-char boundary.

<!-- kk:related:start -->
# Related

- Related: [practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers](/git/practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md)
<!-- kk:related:end -->
