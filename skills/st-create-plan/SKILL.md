---
name: st-create-plan
description: Use when the user asks to draft, scope, or write up a new Strikethroo plan. Do not use to refine an existing plan.
---

# st-create-plan

## Inputs

The user's request supplies the work order.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory. If
it exits non-zero, stop and ask the user to run `npx strikethroo init`.

Treat the path it prints as `<root>` for every subsequent step.

### 2. Load project context

Read these files, in order:

- `<root>/config/STRIKETHROO.md` for this project's directory conventions.
- `<root>/config/hooks/PRE_PLAN.md`, and execute its instructions before
  proceeding.

### 3. Analyze the work order

Identify:

- Objective.
- Scope and explicit boundaries.
- Success criteria.
- Dependencies, prerequisites, blockers.
- Technical requirements and constraints.
- Blast radius size.

### 4. Clarification loop

If any critical context is missing, ask the user targeted questions. Keep
looping until you have no further questions. Explicitly confirm whether
backwards compatibility is required. Never invent answers; never paper over
a missing answer.

If the user declines to clarify a blocking question, stop and report the
plan as needing clarification. Do not produce a partial plan.

Read `<root>/config/shared/clarification-gate.md` and follow its clarification
cadence.

Read `<root>/config/shared/anti-rationalization.md` and apply it to this
rationalization table:

| You catch yourself thinking… | …do this instead |
| --- | --- |
| "I can deduce the answer." | An assumption is not an answer. Ask the question and never invent answers. |
| "Asking again is annoying." | A silent wrong assumption is unrecoverable. Ask. |
| "The user implied it, so it's settled." | An implication is not a confirmation. Surface it as a question and get an explicit answer. |

### 5. Allocate the next plan ID

Run `scripts/get-next-plan-id.cjs` for the next available plan ID. Compute its
zero-padded form for the directory name (`{padded-id}--{slug}`) and use the
unpadded integer in the plan frontmatter.

### 6. Emit the plan

Read `<root>/config/templates/PLAN_TEMPLATE.md`. Projects customize this
template, so follow it instead of any default plan layout.

Write the plan to
`<root>/plans/{padded-id}--{slug}/plan-{padded-id}--{slug}.md`, conforming to
the plan template in both frontmatter and sections. Derive `<slug>` from the
plan summary: lowercase, alphanumeric and hyphens only, no prepositions, no
conjunctions, repeated hyphens collapsed, trimmed.

Do not include time estimates, task lists, or code samples.

### 7. Run post-plan hook

Execute `<root>/config/hooks/POST_PLAN.md`.

### 8. Emit the structured summary

Conclude with exactly this block (an update notice, when present, follows separately):

```
---

Plan Summary:
- Plan ID: [numeric-id]
- Plan File: [absolute-path-to-plan-file]
```

The summary is consumed by downstream automation; keep the format exact.

Before you write the final response, run `scripts/check-for-updates.cjs "<root>"`
as a separate command using this skill's script path. Keep the user's working
directory. Read the one JSON line on stdout.
Never pause for permission and never run an update.
When `notice` is present, append its exact text after the structured summary
block, or after your final response when this skill emits no summary block.
Nothing may follow the notice.

## Failure Modes

- **Plan directory already exists for the allocated ID.** Determine the next
  available plan ID by re-running `scripts/get-next-plan-id.cjs`, then update
  the frontmatter and paths to match.
