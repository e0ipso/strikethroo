---
layout: default
title: Why Strikethroo
nav_order: 2
description: "The design thesis: where human attention gets spent, and which guarantees are compiled rather than requested"
---

# Why Strikethroo

Most spec-driven development frameworks optimize the same thing: the input. Write
a better specification, get better code. They differ in artifact shape and
ceremony — a constitution, a set of personas, WHEN/THEN scenarios — but they share
one assumption: **that an agent handed a good spec will faithfully implement it,
and that a human at the end will catch it when it doesn't.**

Strikethroo starts somewhere else. It assumes the agent is an unreliable narrator
of its own work, that a second agent asked to check the first is *also* an
unreliable narrator, and that the scarce resource in the whole loop is not tokens
but **your attention**. Nearly every design decision below follows from those
three premises.

---

## Speed is measured at the wrong checkpoint

The industry clock starts when you type the prompt and stops when code appears.
By that clock, a tool that generates a thousand lines in ninety seconds is fast.

That is not the clock that pays your salary. The clock that matters starts when
you pick up the work and stops **when the code is merged**. On that clock,
generation is a rounding error. The cost is in what comes after:

- The review round where someone finds that a requirement was quietly dropped.
- The second round, after the fix, because the fix broke something adjacent.
- The re-read of a diff you have already read twice, because you no longer trust
  your own earlier pass.
- The judgment call you cannot make from the diff alone, so you go re-derive what
  the feature was supposed to do.

None of that appears in a demo. All of it appears in your week. A framework that
generates quickly and lands slowly has not made you faster — it has moved the
cost somewhere nobody is counting.

Strikethroo is built against the time-to-merge clock. That is not a trade of
speed for quality. On that clock, they are the same number.

---

## Your attention is the budget

If the bottleneck is human review, the design question is not *how do we reduce
review* — it is **where in the process is a correction cheapest?**

Correcting a plan costs one sentence. Correcting the same misunderstanding in a
diff costs a review cycle, a rework cycle, and a re-review. The ratio is not
close. So Strikethroo deliberately rations attention rather than maximizing it:

| Stage | Your involvement | Why |
| --- | --- | --- |
| **Plan** | A careful read, with an explicit approval gate | Corrections are one sentence here. This is where your judgment is worth the most. |
| **Blueprint** | A quick verification pass | Structure, not substance. A skim is the correct level of care. |
| **Execution** | None | Every task carries concrete, runnable acceptance criteria. There is nothing here your attention improves. |
| **Result** | A careful read | Does this do what you asked? The one question a machine cannot answer for you. |

The clarification gate exists to make the first row work. It asks **one question
at a time**, offers multiple choice with a recommended default where it can, and
requires explicit confirmation of scope before it writes anything. Batched
questionnaires get skim-answered; that is a known failure mode, and it is
designed against directly. If you decline to answer a blocking question, planning
**stops** rather than proceeding on an invented answer.

This is why the automated review gate is not a replacement for you. It is a
**filter that runs before you look**, so that your read lands on "this doesn't do
what I asked" instead of "you forgot the null check." The gate is scoped to
conformance and demonstrable defects and is explicitly forbidden from raising
design opinions — because design judgment is precisely the thing your read is
being preserved for. It is built to *not* do your job.

---

## Guarantees are compiled, not requested

Here is the distinction that most cleanly separates Strikethroo from frameworks
whose enforcement lives entirely in prompt text: **a rule written in Markdown is a
request. A rule written in TypeScript is a guarantee.**

Strikethroo draws that line deliberately and in the same place every time.

**Negotiable — plain Markdown you own and edit.** Hooks at eleven points in the
workflow, plan and task templates, and one project-context file. This is the
adaptation surface. Change it freely; it is yours.

**Non-negotiable — compiled into the runtime.** Termination bounds, safety floors,
fail-safe defaults, and the separation between reviewer and implementer. You
cannot loosen these by editing a hook, because they are not read from one.

Concretely, in `src/skill-scripts/shared/review-findings.ts`:

- `MAX_REVIEW_ROUNDS` is a compiled constant. The review hook may state a round
  budget, and it is honored — but it is clamped to the ceiling first. **A user
  editing the hook can tighten the bound. Nothing can raise it.** The parser is
  documented as "forgiving in exactly one direction."
- A finding that **omits** `severity` or `confidence` is treated as falling below
  *every* floor. Omission is never a route to getting a change auto-applied. The
  default is fail-safe, and there is exactly one place in the code where that
  default lives.
- Severity and confidence are independent axes with separate floors, because they
  answer different questions — *how bad if real* versus *how sure it is real* —
  and an automated consumer that conflates them will apply speculative changes to
  working code.

This is the property to check if you are evaluating Strikethroo against anything
else: **find the guarantee, then find where it is enforced.** If the only thing
standing between you and an unbounded loop is a sentence in a prompt file asking
the model to stop, that is not a bound.

---

## Nobody marks their own homework

When the optional review gate runs, the reviewer runs on a **different harness**
than the one that wrote the code. This is not a preference or a default — the
current harness is structurally removed from the candidate set in
`src/skill-scripts/shared/harness-discovery.ts`, with the reason stated inline:
*a reviewer on the same harness as the implementer defeats the point of the gate.*

The same separation holds at the role level. The reviewer **detects and never
fixes**. It may not edit files, run formatters, or commit. Remediation is
dispatched separately, and the implementer receives the finding without the
reviewer's reasoning about it.

This also reframes execution routing. Sending tasks to different models looks
like a cost optimization, and elsewhere it is marketed as one. In Strikethroo it
is the same idea as the review gate wearing a different hat: **models fail
differently, so a second model is an independent sample, not merely a cheaper
one.** Heterogeneity is a correctness mechanism here.

---

## The agent is not trusted, including about itself

Two shared disciplines are loaded at runtime by the skills that need them. They
are short on purpose.

**The verification gate.** Before any claim that something is complete, passing,
or working: identify the command that proves it, run it *now*, read the full
output and exit code, then state the result. Its operative line, which the phase
loop restates: *"Do not accept a subagent's report of success as proof."* A report
is a claim. The words *should*, *probably*, *seems to*, and a premature *Done!*
are named as red flags meaning the gate has not been run.

**Anti-rationalization.** Every skill that enforces a discipline ships a table of
**the specific excuses a model generates when it is about to skip that
discipline**, each paired with a binding rule. Not general advice — enumerated
failure modes. From the planner:

> *"I can reasonably assume the answer."* → An assumption is not an answer. Ask the
> question; never invent answers.

And the reviewer's table points entirely at the reviewer:

> *"I have found nothing above the floor; I should look harder so this round
> produces something."* → A clean diff is a valid result. Manufacturing a finding
> to justify the round **is** the defect this gate exists to prevent.

> *"This is only minor, but it is real, so I will call it major so it gets
> fixed."* → Severity is impact if real, never a lever for clearing the floor.

There is no "unless it matters" exception, and that is stated explicitly, because
a discipline with a judgment-call escape hatch is a discipline the model will
negotiate its way out of under pressure.

Two more places the same distrust shows up in code:

- **An empty diff is reported, never certified.** A reviewer handed nothing to
  read returns no findings — which is indistinguishable from a clean review. So
  an empty scope short-circuits to a recorded skip *before* a reviewer is
  dispatched. Without that branch, the one observable symptom of a collapsed
  review scope would be a pass.
- **A skip is not a pass.** When the gate cannot run — no second harness, no
  schema validator, no recorded base commit — it records that it did not run and
  says why. It never degrades into silence that reads as success.

---

## The costs, stated plainly

A framework that only lists its advantages is asking you to trust it. These are
in the source with their reasoning attached.

- **The reviewer will miss "this works, matches the plan, and the abstraction is
  wrong."** That is a real category, and one a second model is unusually good at
  spotting. It is excluded deliberately: the gate is unattended and auto-applies
  fixes, so its false-positive rate matters more than its recall. The trade is
  documented in the reviewer prompt as an accepted cost, not an oversight.
- **A fix that cannot be expressed as a local text replacement is recorded and
  not applied.** This is what structurally prevents an unattended reviewer from
  landing broad speculative refactors — a constraint on shape rather than a
  request for restraint.
- **A green gate is not a correctness guarantee.** It reduces exposure to the same
  class of error a human PR approval reduces, and leaves the same class behind.
- **Blast-radius analysis is a partial mitigation**, not a complete one. The
  reviewer reads callsites of changed symbols outside the diff; it does not read
  your whole codebase.

---

## Check the claims

Every claim above about Strikethroo is verifiable in this repository. That is
intentional — you should not have to take positioning on faith.

| Claim | Where to check |
| --- | --- |
| Round bound is compiled and cannot be raised by config | `MAX_REVIEW_ROUNDS` in `src/skill-scripts/shared/review-findings.ts` |
| Missing attributes fail safe | `partitionFindings` in the same file |
| Reviewer cannot be the implementer's harness | `discoverHarnesses` in `src/skill-scripts/shared/harness-discovery.ts` |
| Subagent reports are not accepted as proof | `config/shared/verification-gate.md`, and the phase loop in `src/skill-prompts/sections/phase-execution-loop.md` |
| Excuses are enumerated per skill | the rationalization tables in `src/skill-prompts/st-*.md` |
| Reviewer detects and never fixes | the Role section of `src/skill-prompts/st-code-review.md` |
| Empty scope skips instead of passing | the `empty-diff` branch in `src/skill-scripts/code-review.ts` |
| Human approval gates the plan | `config/shared/clarification-gate.md` and [Workflow](workflow.html) |

---

## In one paragraph

Strikethroo spends your attention at the plan, where a correction costs a
sentence, and withholds it from the diff, where the same correction costs a review
cycle. It treats the model — including a model reviewing another model — as a
component with known failure modes rather than a colleague with good intentions,
and it enforces the bounds that matter in compiled code rather than asking for
them in prose. The result is not a trade of speed for quality. On a clock that
starts at the idea and stops at the merge, it is the same thing.

Next: the [Workflow Guide](workflow.html) for the step-by-step, or
[Customization](customization.html) for the surfaces you own.
