---
name: st-create-plan
description: Create a new Strikethroo plan for this repository. Use when the user asks to draft, plan, or scope a new strikethroo plan — discovers the local .ai/strikethroo root, runs the project's plan hooks, gathers clarifications, allocates the next plan ID, and writes a Markdown plan conforming to PLAN_TEMPLATE.md. Do not use for generic brainstorming or work outside Strikethroo.
---

# st-create-plan

Drive the end-to-end creation of a new Strikethroo plan for the user's
repository. The skill is assistant-agnostic and self-contained: every script
it invokes lives under this skill's `scripts/` directory and is referenced
by relative path.

## Inputs

The user's request supplies the work order. Treat it as the only authoritative
source of intent. Do not invent answers to clarifying questions — prompt the
user instead.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.
The script walks up looking for `.ai/strikethroo/.init-metadata.json` and
prints the absolute path of the resolved root on success.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to create a plan outside of a valid root.

For every subsequent step, treat the path printed by this script as `<root>`.

### 2. Load project context

Read `<root>/config/STRIKETHROO.md` for the directory structure conventions
this project uses. Read `<root>/config/hooks/PRE_PLAN.md` and execute the
instructions it contains before proceeding. Read
`<root>/config/templates/PLAN_TEMPLATE.md` so the plan you emit conforms
to its structure.

### 3. Analyze the work order

Identify:

- Objective and end goal.
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

### 5. Allocate the next plan ID

Run `scripts/get-next-plan-id.cjs` to obtain the next available plan ID.
Pass `<root>` as the first argument when invoking the script from a working
directory that is not inside the project, otherwise no argument is required.
The script prints a single integer.

Compute the zero-padded form for directory naming (`{padded-id}--{slug}`)
and use the unpadded integer in the plan frontmatter and the final summary.

### 6. Emit the plan

Write the plan to:

```
<root>/plans/{padded-id}--{slug}/plan-{padded-id}--{slug}.md
```

The output must:

- Conform to `<root>/config/templates/PLAN_TEMPLATE.md`, including required
  YAML frontmatter fields (at minimum `id`, `summary`, `created`).
- Contain the standard sections from the template body.
- Use Markdown, not free-form prose.
- Avoid time estimates, task lists, or code samples — those belong to the
  later task-generation phase.

The `<slug>` is derived from the plan summary: lowercase, alphanumeric and
hyphens only, collapsed, trimmed.

### 7. Run post-plan hook

Execute `<root>/config/hooks/POST_PLAN.md` after the plan file is written.

### 8. Emit the structured summary

Conclude with exactly this block as the final output:

```
---

Plan Summary:
- Plan ID: [numeric-id]
- Plan File: [absolute-path-to-plan-file]
```

The summary is consumed by downstream automation; keep the format exact.

## Failure Modes

- **No strikethroo root found.** Stop, instruct the user to initialize the
  project. Do not write any files.
- **User refuses to answer a clarifying question that blocks planning.**
  Report `needs-clarification` and stop. Do not produce a plan.
- **Plan ID script fails.** Re-check the resolved root and re-run. If it
  continues to fail, surface stderr to the user and stop — do not guess an ID.
- **Plan directory already exists for the allocated ID.** Re-run the
  next-plan-id script (a concurrent run may have advanced it) and retry once.
  If the conflict persists, stop and report.
