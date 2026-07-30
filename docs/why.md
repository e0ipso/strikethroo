---
layout: default
title: Why Strikethroo
nav_order: 2
description: "The design thesis: where human attention gets spent, and which guarantees are compiled rather than requested"
---

# Why Strikethroo

Most spec-driven frameworks optimize the input: better spec in, better code out,
human catches the rest at the end. Strikethroo starts from three different
premises.

1. **The agent is an unreliable narrator of its own work.** A success report is a
   claim, not evidence.
2. **A second agent reviewing the first is also unreliable.** It will overstate
   confidence and manufacture findings to justify its round.
3. **The scarce resource is your attention, not tokens.**

Everything below follows from those.

## Speed is measured at the wrong checkpoint

The usual clock starts at the prompt and stops when code appears. The clock that
pays your salary stops when the code is **merged** — and on that clock,
generation is a rounding error next to the review rounds a fast-but-wrong draft
costs you.

Strikethroo is built against the second clock. That is not quality traded for
speed. On that clock they are the same number.

## Attention is the budget

A correction costs one sentence in the plan and a full review cycle in the diff.
So attention is rationed, not maximized:

| Stage | Your involvement | Why |
| --- | --- | --- |
| **Plan** | Careful read, explicit approval gate | Corrections cost a sentence here |
| **Blueprint** | Quick verification pass | Structure, not substance |
| **Execution** | None | Tasks carry runnable acceptance criteria |
| **Result** | Careful read | "Does this do what I asked?" — the one question a machine can't answer |

The clarification gate makes the first row work: **one question at a time**,
multiple-choice where possible, explicit scope confirmation before anything is
written. Decline a blocking question and planning *stops* rather than inventing
an answer.

The automated review gate is a **filter that runs before you look**, not a
replacement for looking. It is scoped to requirement conformance and demonstrable
defects, and explicitly forbidden from raising design opinions — because design
judgment is what your read is being preserved for.

## Guarantees are compiled, not requested

**A rule in Markdown is a request. A rule in TypeScript is a guarantee.**

- **Negotiable** — hooks at eleven workflow points, plan/task templates, project
  context. Plain Markdown. Yours.
- **Compiled** — termination bounds, severity/confidence floors, fail-safe
  defaults, reviewer/implementer separation. Not read from a hook, so not
  loosenable by editing one.

Concretely: `MAX_REVIEW_ROUNDS` is a constant. A hook may state a round budget and
it is honored — after clamping. **You can tighten the bound; nothing can raise
it.** A finding that *omits* `severity` or `confidence` falls below every floor,
so omission is never a route to auto-applying a change.

The question to ask of any framework: **find the guarantee, then find where it is
enforced.** If the only thing between you and an unbounded loop is a prompt asking
the model to stop, that is not a bound.

## Nobody marks their own homework

The reviewer runs on a **different harness** than the one that wrote the code —
the current harness is structurally removed from the candidate set, not merely
deprioritized. The reviewer **detects and never fixes**; remediation is dispatched
separately.

This also reframes execution routing. Sending tasks to different models looks like
cost optimization. Here it is the review gate's idea in another hat: **models fail
differently, so a second model is an independent sample, not a cheaper one.**

Two more places the distrust is structural rather than requested:

- **An empty diff is reported, never certified.** A reviewer handed nothing
  returns no findings — indistinguishable from a clean review. Empty scope
  short-circuits to a recorded skip before any reviewer is dispatched.
- **A skip is not a pass.** No second harness, no validator, no base commit → the
  gate records that it did not run, and why. It never degrades into silence that
  reads as success.

## The costs

- **The reviewer will miss "works, matches the plan, wrong abstraction."** Real
  category, deliberately excluded: the gate is unattended and auto-applies fixes,
  so false-positive rate matters more than recall.
- **A fix that isn't a local text replacement is recorded, not applied.** This is
  what structurally prevents speculative refactors landing unattended.
- **A green gate is not a correctness guarantee.** It reduces the same class of
  error a human PR approval reduces, and leaves the same class behind.
- **Blast-radius analysis is partial.** Callsites of changed symbols, not your
  whole codebase.

## Check the claims

| Claim | Where |
| --- | --- |
| Round bound compiled, not raisable by config | `MAX_REVIEW_ROUNDS` in `src/skill-scripts/shared/review-findings.ts` |
| Missing attributes fail safe | `partitionFindings`, same file |
| Reviewer can't be the implementer's harness | `discoverHarnesses` in `src/skill-scripts/shared/harness-discovery.ts` |
| Subagent reports aren't proof | `config/shared/verification-gate.md` |
| Excuses enumerated per skill | rationalization tables in `src/skill-prompts/st-*.md` |
| Reviewer detects, never fixes | Role section, `src/skill-prompts/st-code-review.md` |
| Empty scope skips instead of passing | `empty-diff` branch in `src/skill-scripts/code-review.ts` |
| Human approval gates the plan | `config/shared/clarification-gate.md`, [Workflow](workflow.html) |

Next: the [Workflow Guide](workflow.html), or [Customization](customization.html)
for the surfaces you own.
