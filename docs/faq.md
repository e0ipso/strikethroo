---
layout: default
title: FAQ
nav_order: 6
description: "Frequently asked questions about Strikethroo"
---

# Frequently Asked Questions

<div class="st-cards" markdown="0">
<a class="st-card" href="#setup-and-installation">
<span class="st-card__icon st-card__icon--package" aria-hidden="true"></span>
<p class="st-card__title">Setup &amp; Installation</p>
<p>Keys, costs, setup time, and existing projects.</p>
</a>
<a class="st-card" href="#workflow">
<span class="st-card__icon st-card__icon--workflow" aria-hidden="true"></span>
<p class="st-card__title">Workflow</p>
<p>The two commands, automation, and plan mode.</p>
</a>
<a class="st-card" href="#code-review">
<span class="st-card__icon st-card__icon--shield-check" aria-hidden="true"></span>
<p class="st-card__title">Code Review</p>
<p>Optional automated review gate, disabling, and limitations.</p>
</a>
<a class="st-card" href="#customization">
<span class="st-card__icon st-card__icon--sliders-horizontal" aria-hidden="true"></span>
<p class="st-card__title">Customization</p>
<p>Hooks, templates, and file formats.</p>
</a>
<a class="st-card" href="#architecture">
<span class="st-card__icon st-card__icon--network" aria-hidden="true"></span>
<p class="st-card__title">Architecture</p>
<p>Context isolation, failures, and parallelism.</p>
</a>
<a class="st-card" href="#comparison-with-other-tools">
<span class="st-card__icon st-card__icon--git-fork" aria-hidden="true"></span>
<p class="st-card__title">Comparison</p>
<p>How Strikethroo differs from other tools.</p>
</a>
</div>

## Setup and Installation

**Does Strikethroo require API keys or additional costs?**

No. It works within your existing AI assistant subscriptions (Claude Pro/Max, Gemini, GitHub Copilot, Codex, Open Code, Kiro). No API keys, no pay-per-token charges, no external service dependencies.

**How long does setup take?**

Under 30 seconds. Run `npx strikethroo init --harnesses claude` followed by `npx skills add e0ipso/strikethroo`, and the workspace is ready.

**Does it work with existing projects?**

Yes. The `init` command merges with existing project structures without breaking existing files. Hash-based conflict detection preserves your customizations on re-init.

**Can I use multiple AI assistants on the same project?**

Yes. Initialize with multiple harnesses (`--harnesses claude,gemini,codex`). All harnesses share the same plans, tasks, and configuration. Team members can use different harnesses while collaborating.

## Workflow

**What is the workflow?**

Two commands:

1. **Planning**: `/st-create-plan <your request>` refines your work order into a comprehensive plan. You read it and approve it.
2. **Execution**: `/st-execute-blueprint <plan-id>` decomposes the plan into an execution blueprint -- atomic tasks in dependency-mapped phases -- and then implements each task using sub-agents with focused context.

Everything lands in `.ai/strikethroo/plans/`, so you can inspect any of it at any point.

**Why is there no separate task-generation step?**

There is one -- `st-generate-tasks` -- but you rarely need to run it. `st-execute-blueprint` generates the tasks and blueprint itself when the plan does not have them yet, so the normal path is plan, review, execute.

Running it separately is worth it when you want to see or hand-tune the decomposition before execution starts: an unusually large plan, or one whose phase ordering you want to check. It is a detour, not a step. Your careful reading is better spent on the plan, where a correction costs a sentence.

**What if I want fully automated execution?**

The `st-full-workflow` skill runs planning and execution in a single invocation, with no stop for your approval of the plan. It is best suited for well-defined features with clear scope. For anything where the plan is worth a read first, use the two-command workflow.

**How does Strikethroo relate to plan mode?**

It augments plan mode rather than replacing it. The output of your assistant's built-in plan mode is often a useful starting point -- feed it into the `st-create-plan` skill for structured refinement.

## Code Review

**Does a passing review mean my code is correct?**

No. A green review gate reduces the same class of error a human PR approval reduces, and leaves the same class of error behind. The gate is useful for catching conformance violations and real defects, but it is not a correctness guarantee. Always run the test suite and read the diff yourself.

**Why didn't the review gate run?**

Five reasons it may skip cleanly:

- **Hook file missing** — code review is optional. `init` copies the default hook; older workspaces don't have it until they update.
- **Hook file empty** — if you delete the contents, the gate skips.
- **XSD schema absent** — the vendored XSD is copied by `init`; older workspaces don't have it.
- **No base commit** — the workspace is not a git repository, or has no commits yet.
- **No second harness discovered** — only one AI assistant is installed and responsive, or all candidates are the current harness. That is expected, not a failure.

Any of these routes to a clean skip with a note in the execution summary. No error.

**The gate ran but the round failed. What does that mean?**

A failed round is not a skip: the gate ran and could not certify the result, so execution halts rather than reporting a clean review. One cause is handled for you. If the reviewer completed its review but could not write `review.xml`, the gate recovers the document from the reviewer's own output, writes it to the expected path, and validates it against the same schema -- the round then proceeds like any other, and you will not see a failure at all. So a round that still fails means the reviewer could not perform the review: it could not inspect the repository, or it produced no valid findings document. That is a genuine failure and the recovery path is not meant to paper over it. Read the reported detail, fix the cause, and re-run the gate.

**How do I disable code review?**

Edit or delete `.ai/strikethroo/config/hooks/CODE_REVIEW.md`. The gate skips cleanly on next run. No error.

**Can I configure the thresholds?**

Yes. Edit `CODE_REVIEW.md` to set the minimum severity (`critical`, `major`, `minor`, `info`), minimum confidence (`high`, `medium`, `low`), and maximum rounds (default 3). The round budget is enforced in code and cannot be disabled by editing the file — you can only tighten it.

**What if the review keeps finding issues?**

Rounds are bounded (default 3 rounds, enforced in code). If exhausted, the plan stays in `plans/` with all findings recorded for your review. You can then edit the plan files and re-run execution, or disable the gate if you believe it is over-rejecting.

**Can the review fix security issues?**

The conformance-only scope emphasizes traces back to explicit plan requirements. A real security defect counts; a speculative "this could be exploited if..." does not. The gate is conservative to avoid injecting speculative changes.

## Customization

**Can I customize the workflow?**

Yes. Eleven lifecycle hooks, four templates, and project-context files are all editable Markdown. See the [Customization Guide](customization.html) for examples.

**What file formats does it use?**

All configuration, plans, tasks, hooks, and templates are Markdown (`.md`) with YAML frontmatter where applicable. No proprietary formats.

## Architecture

**How does context isolation work?**

Each step and each task runs with a focused context window. The planning step sees only the work order. Task generation sees only the plan. During execution, each sub-agent receives only the single task it is executing plus its declared dependencies -- not the full plan or other tasks. This prevents the context window from growing unboundedly across a complex project.

**What happens when a task fails during execution?**

The `POST_ERROR_DETECTION` hook fires, enabling custom remediation logic. The task status is set to `failed`, and dependent tasks are not started. You can fix the issue and re-run execution.

**How are tasks executed in parallel?**

Tasks within the same phase have no mutual dependencies and execute concurrently via sub-agents. Phases themselves run in sequence, so a phase starts only after all tasks in the previous phase have completed.

## Comparison with Other Tools

**How does Strikethroo differ from other spec-driven development frameworks?**

Most spec-driven frameworks optimize the input: write a better specification, get better code, and rely on a human at the end to catch what went wrong. They differ from each other mainly in artifact shape and ceremony. Strikethroo differs on three premises instead:

1. **The agent is an unreliable narrator of its own work.** A subagent reporting success is making a claim, not supplying evidence. A shared verification gate requires identifying the proving command, running it fresh, and reading its exit code before any completion claim. Each skill also ships an anti-rationalization table enumerating the specific excuses a model produces when it is about to skip a discipline.
2. **A second agent reviewing the first is also unreliable.** So the review gate grades severity and confidence on independent axes with independent floors, treats a missing attribute as below every floor, and explicitly names "manufacturing a finding to justify the round" as the failure it is built to resist.
3. **The scarce resource is your attention, not tokens.** Your careful read is spent on the plan (where a correction costs a sentence) and on the result, not on the diff (where the same correction costs a review cycle).

The structural consequence is that Strikethroo separates *negotiable* configuration from *compiled* guarantees. Hooks and templates are plain Markdown you own. Termination bounds, safety floors, fail-safe defaults, and the reviewer/implementer separation are compiled into the runtime and cannot be loosened by editing a hook. See [Why Strikethroo](why.html) for the full thesis and the list of claims you can verify in the source.

**Is Strikethroo slower because of all the gates?**

Not on the clock that matters. Measured from prompt to first draft, a tool with no gates is faster. Measured from picking up the work to merging it, the cost sits in the review rounds a fast-but-wrong draft generates -- the dropped requirement found in review, the fix that breaks something adjacent, the re-read of a diff you have already read twice. Strikethroo is designed against that second clock, and it runs tasks in parallel within each phase rather than serially.

**Does the automated review gate replace human code review?**

No. It is a filter that runs *before* you look, not a substitute for looking. Its mandate is deliberately narrow -- requirement conformance and demonstrable defects only -- and it is explicitly forbidden from raising design or abstraction opinions, because design judgment is what your read is being preserved for. A green gate is not a correctness guarantee; it reduces exposure to the same class of error a human PR approval reduces, and leaves the same class behind.

**How does Strikethroo differ from API-based tools like Plandex or Claude Task Master?**

API-based tools require separate service setup, API keys, and pay-per-token pricing. Strikethroo works within your existing subscription at no additional cost. It uses file-based configuration (editable Markdown) rather than API configuration, and most operations work offline.

**When should I use plan mode instead of Strikethroo?**

Use plan mode for simple tasks (fewer than 3 steps) with clear requirements where scope creep is not a concern and the AI can complete the work in one session. Use Strikethroo for complex multi-step projects, tight scope control, multi-session work, or when you need review gates between planning and execution.
