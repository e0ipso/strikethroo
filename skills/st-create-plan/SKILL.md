---
name: st-create-plan
description: Use when the user asks to draft, scope, or write up a new Strikethroo plan for a work order, feature, or initiative in this repository — triggers include create plan, new plan, plan this, scope a plan, strikethroo plan. Do not use to decompose an existing plan into tasks, to execute a plan, or for generic brainstorming outside Strikethroo.
---

# st-create-plan

## Inputs

The user's request supplies the work order.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory. If
it exits non-zero, stop and ask the user to run `npx strikethroo init`.

Treat the path it prints as `<root>` for every subsequent step.

Delegated execution workers skip this step and do not emit update notices.

Run `scripts/check-for-updates.cjs "<root>"` as a separate command using this
skill's script path. Keep the user's working directory. Read the one JSON line
on stdout. When `notice` is present, retain its exact text for the final
user-facing response. Never pause for permission and never run an update.

### 2. Load project context

Read `<root>/config/STRIKETHROO.md` for this project's directory conventions.
Read `<root>/config/hooks/PRE_PLAN.md` and execute its instructions before
proceeding. Read `<root>/config/templates/PLAN_TEMPLATE.md`; the plan must
conform to it.

Also read `<root>/config/shared/clarification-gate.md` and
`<root>/config/shared/anti-rationalization.md`.

### 3. Analyze the work order

Identify:

- Objective.
- Scope and explicit boundaries.
- Success criteria.
- Dependencies, prerequisites, blockers.
- Technical requirements and constraints.

### 4. Clarification loop

If any critical context is missing, ask the user targeted questions. Keep
looping until you have no further questions. Explicitly confirm whether
backwards compatibility is required. Never invent answers; never paper over
a missing answer.

If the user declines to clarify a blocking question, stop and report the
plan as needing clarification. Do not produce a partial plan.

Follow the clarification cadence in `<root>/config/shared/clarification-gate.md`.

Apply `<root>/config/shared/anti-rationalization.md` to this rationalization table:

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "I can reasonably assume the answer." | An assumption is not an answer. Ask the question; never invent answers. |
| "Asking again is annoying." | A question the user can decline is recoverable; a silent wrong assumption is not. Ask. |
| "The user implied it, so it's settled." | An implication is not a confirmation. Surface it as a question and get an explicit answer. |

### 5. Allocate the next plan ID

Run `scripts/get-next-plan-id.cjs` for the next available plan ID. Compute its
zero-padded form for the directory name (`{padded-id}--{slug}`) and use the
unpadded integer in the plan frontmatter.

### 6. Emit the plan

Write the plan to
`<root>/plans/{padded-id}--{slug}/plan-{padded-id}--{slug}.md`, conforming to
`<root>/config/templates/PLAN_TEMPLATE.md` in both frontmatter and sections.
Include no time estimates, task lists, or code samples; those belong to the
task-generation step.

Derive `<slug>` from the plan summary: lowercase, alphanumeric and hyphens
only, collapsed, trimmed.

### 7. Run post-plan hook

Execute `<root>/config/hooks/POST_PLAN.md`.

### 8. Emit the structured summary

Conclude with exactly this block (a retained update notice, when present, follows separately):

```
---

Plan Summary:
- Plan ID: [numeric-id]
- Plan File: [absolute-path-to-plan-file]
```

The summary is consumed by downstream automation; keep the format exact.

When the retained update `notice` is present, append that exact sentence after
the structured summary block, or after your final response when this skill emits
no summary block. Nothing may follow the notice.

## Failure Modes

- **Plan directory already exists for the allocated ID.** Re-run the
  next-plan-id script and retry once. If the conflict persists, stop and
  report.
