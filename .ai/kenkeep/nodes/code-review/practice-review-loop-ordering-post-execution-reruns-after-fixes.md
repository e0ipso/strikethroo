---
type: practice
title: >-
  Review loop ordering: POST_EXECUTION re-runs after fixes, not before
description: >-
  Detect → threshold → fix on implementer route → full re-run of mechanical gates
  → re-verify. The re-run happens after every fix because fixes invalidate the
  prior green build.
tags:
  - review-gate
  - ordering
  - mechanical-gates
kk_schema_version: 3
kk_id: >-
  practice-review-loop-ordering-post-execution-reruns-after-fixes
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---

The code review loop runs **after** `POST_EXECUTION` and is itself terminal. The sequence is:

```
Phase N completes
    ↓
POST_EXECUTION (lint + tests + Self Validation)
    ↓ (green)
CODE_REVIEW (detect findings)
    ↓ findings ≥ floor?
FIX (dispatch to implementer, local text replacements)
    ↓
POST_EXECUTION (re-run in full — fixes invalidated the prior green)
    ↓ (green)
CODE_REVIEW (re-verify)
    ↓
... bounded rounds ...
    ↓
Execution summary and archival
```

**Why the full POST_EXECUTION re-run comes AFTER the fix, not before:**

A fix invalidates the prior green build. If a change touches file `foo.ts`, any tests on `foo.ts` or its call graph need to re-run. The full `POST_EXECUTION` re-run (lint + tests + Self Validation) is the only reliable catcher for a fix that breaks code outside the diff.

Ordering it before the fix would mean:
- "Let me fix this and then re-run" (user workaround)
- Findings from a broken prior attempt mixed with findings about the fix itself
- Diff-based review blind to transitive breakage

Ordering it after makes the mechanical gate itself the blast-radius catcher:

```
detect: diff looks wrong → emit finding
    ↓
fix: apply local text replacement
    ↓
POST_EXECUTION re-run: "tests broke on a caller I didn't see in the diff"
    ↓ (halt on failure)
plan stays in plans/ for debugging
```

If the full re-run passes, the fix is safe enough to re-verify. If it fails, the gate halts like any other `POST_EXECUTION` failure.

**Bounded rounds enforce termination.** By default 3 rounds; clamped in code to `MAX_REVIEW_ROUNDS`. A user editing `CODE_REVIEW.md` can tighten the budget ("2 rounds max") but cannot loosen it or disable termination — the constant in code is the ceiling.

```typescript
// src/skill-scripts/code-review.ts (simplified)
const maxRounds = Math.min(hookBudget, MAX_REVIEW_ROUNDS);
for (let round = 1; round <= maxRounds; round++) {
  const findings = await detect(reviewerHarness, cumulativeDiff);
  if (findings.aboveFloor.length === 0) break;
  await fix(implementerRoute, findings.aboveFloor);
  const rerunResult = await postExecution(); // full re-run
  if (!rerunResult.green) halt();
}
```

This ordering is why the review loop is terminal only and why it must read the `base` commit (not `HEAD`) — the cumulative diff across all prior fixes is the only stable scope.
