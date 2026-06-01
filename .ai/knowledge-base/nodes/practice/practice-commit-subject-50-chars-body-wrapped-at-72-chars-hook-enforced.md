---
schema_version: 1
id: practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced
title: Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)
kind: practice
tags:
  - git
  - commit
  - hooks
  - formatting
derived_from: []
relates_to:
  - practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers
confidence: high
summary: >-
  A commit-message hook enforces 50-char subject lines and 72-char body
  wrapping; violations abort the commit.
---
The project enforces a commit-message formatting hook: subject lines must be ≤50 characters and body lines must wrap at ≤72 characters. Commits that violate either rule are aborted by the hook immediately — before the test suite runs.

This is a separate hook from the AI-attribution rejection rule; both operate independently on every commit.

When authoring commit messages, keep the subject imperative and ≤50 chars; hard-wrap any body paragraph text at the 72-char boundary.
