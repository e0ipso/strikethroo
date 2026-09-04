---
layout: default
title: Why Strikethroo
nav_order: 2
description: "The design thesis: where human attention gets spent, and which guarantees are compiled rather than requested"
---

# Why Strikethroo

Most spec-driven frameworks optimize the input: better spec in, better code out,
human catches the rest at the end. Strikethroo starts from three premises instead:
**the agent is an unreliable narrator of its own work**, **a second agent
reviewing the first is also unreliable**, and **the scarce resource is your
attention, not tokens**.

## Speed is measured at the wrong checkpoint

The usual clock stops when code appears. The clock that pays your salary stops
when the code is **merged** — and there, generation is a rounding error next to
the review rounds a fast-but-wrong draft costs you. Strikethroo targets the second
clock. That is not quality traded for speed; on that clock they are the same
number.

## Attention is the budget

A correction costs one sentence in the plan and a full review cycle in the diff.
So attention is rationed, not maximized:

| Stage | Your involvement | Why |
| --- | --- | --- |
| **Plan** | Careful read, explicit approval gate | Corrections cost a sentence here. One question asked at a time, so it never gets skim-answered |
| **Blueprint** | None | Generated inside execution. It is machinery, not a decision — inspect it separately only to hand-tune |
| **Execution** | None | Tasks carry runnable acceptance criteria |
| **Result** | Careful read | "Does this do what I asked?" — the one question a machine can't answer |

The automated review gate is a **filter that runs before you look**, not a
replacement for looking. It is scoped to requirement conformance and demonstrable
defects, and forbidden from raising design opinions — that is what your read is
preserved for.

## Guarantees are compiled, not requested

**A rule in Markdown is a request. A rule in TypeScript is a guarantee.** Hooks
and templates are yours to edit. The review gate's certification rule and the
reviewer/implementer separation are compiled, so no hook edit can loosen them: a
review whose findings could not be validated against the schema is never
reported as a clean one, whether the document was missing, invalid, or
unvalidatable because `xmllint` was absent.

The question to ask of any framework: **find the guarantee, then find where it is
enforced.** If the only thing between you and an unbounded loop is a prompt asking
the model to stop, that is not a bound.

## Nobody marks their own homework

The reviewer runs on a **different harness** than the one that wrote the code —
structurally excluded from the candidate set, not merely deprioritized — and it
**detects but never fixes**. Same reason execution routing exists: models fail
differently, so a second model is an independent sample, not a cheaper one.

## The costs

- **The reviewer will miss "works, matches the plan, wrong abstraction."**
  Deliberately excluded: a second model is confidently wrong often enough that a
  narrow mandate beats a broad one, and design judgment is what your own read of
  the diff is preserved for.
- **The gate fixes nothing for you.** It reports; you decide. That costs you a
  read of the findings, and it buys you never having to un-apply a confident
  wrong answer from a model that never ran the tests.
- **A certified review is not a correctness guarantee.** Same class of error a
  human PR approval catches, and the same class left behind.

## Check the claims

| Claim | Where |
| --- | --- |
| An uncertified review is never reported as clean | `reviewedFieldsFor` and `_classify`, `src/skill-scripts/code-review.ts` |
| A missing validator is a distinct failure, not a pass | `validateAgainstSchema`, `src/skill-scripts/shared/review-findings.ts` |
| Reviewer can't be the implementer's harness | `discoverHarnesses`, `src/skill-scripts/shared/harness-discovery.ts` |
| Subagent reports aren't proof | `config/shared/verification-gate.md` |
| Reviewer detects, never fixes | `buildReviewerPrompt`, `src/skill-scripts/code-review.ts` |
| Human approval gates the plan | `config/shared/clarification-gate.md` |

Next: the [Workflow Guide](workflow.html), or [Customization](customization.html).
