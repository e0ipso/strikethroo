---
type: practice
title: >-
  Optional-by-absence pattern: new workspace files do not bump schema version
description: >-
  CODE_REVIEW.md and self-review-v2.xsd are both optional by absence;
  their presence/absence gates the feature. v4 workspaces keep working unchanged.
tags:
  - schema-version
  - compatibility
  - optional-gates
kk_schema_version: 3
kk_id: >-
  practice-optional-by-absence-new-files-absent-means-feature-off
kk_derived_from: []
kk_relates_to:
  - practice-documentation-captures-current-state-only
kk_depends_on: []
kk_confidence: high
---

The code review gate depends on two optional workspace files:
- `.ai/strikethroo/config/hooks/CODE_REVIEW.md` (user-editable mandate)
- `.ai/strikethroo/config/schemas/self-review-v2.xsd` (vendored XSD)

**Both files are optional by absence.** A missing hook, an empty hook, or a missing XSD routes to a documented clean skip. An empty XSD is present, so it reaches schema validation and fails certification instead of disabling the feature.

```
const skipReasons = [
  'hook-absent',        // CODE_REVIEW.md does not exist
  'hook-empty',         // CODE_REVIEW.md exists but is empty
  'xsd-absent',         // self-review-v2.xsd does not exist
  'validator-absent',   // xmllint not on PATH, so no review can be certified
  'base-commit-absent', // Not a git repo or no commits
  'no-reviewer-candidate', // Only current harness reachable
  'empty-diff'          // Nothing changed between base and working tree
];
```

All of them route to: skip cleanly, note it in the execution summary, exit 0, produce no error.

`empty-diff` is not an absence of workspace shape like the others — it is the detector for a collapsed review scope. A reviewer dispatched with nothing to read returns no findings, which is indistinguishable from a clean review, so an empty scope would otherwise surface as a pass.

**`CURRENT_WORKSPACE_SCHEMA_VERSION` deliberately remains 4.** Adding an optional file is not an incompatible workspace-shape change. v4 workspaces continue to function unchanged; the feature is dormant until the user runs `init` again and receives the new files. This approach:

- Avoids universal migration burden — users who never want code review are not forced to `init`
- Preserves the schema-version contract — the constant changes only on genuine shape incompatibility
- Reuses the fail-safe branch that must exist anyway (an emptied hook should skip)

The workspace-shape guards are direct:

```typescript
// src/skill-scripts/code-review.ts, simplified
if (!exists(hook)) return skip('hook-absent');
if (read(hook).trim() === '') return skip('hook-empty');
if (!exists(xsd)) return skip('xsd-absent');
```

This is the pattern established by `PRE_TASK_EXECUTION`, which ships a default test-first discipline that existing workspaces can keep or override on re-run.

<!-- kk:related:start -->
# Related

- Related: [practice-documentation-captures-current-state-only](/conventions/practice-documentation-captures-current-state-only.md)
<!-- kk:related:end -->
