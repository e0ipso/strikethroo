# Authoring Strikethroo Skill Prompts — House Style

This guide codifies *how* to write the prompt source under `src/skill-prompts/`.
It exists so the enforcement disciplines these skills rely on stay consistent as
prompts evolve. Read it before adding or editing a section or a skill template.
For the assembly mechanics (`{{include}}`/`{{variable}}`, build steps), see
[`README.md`](./README.md).

These rules are drawn from three external skill frameworks correlated against
Strikethroo (superpowers' `writing-skills`, addyosmani/agent-skills' "process,
not prose", and Amp). They sharpen enforcement of principles Strikethroo already
holds; they do not introduce a new methodology.

## 1. Form follows failure

Pick the prompt form by the *failure mode* you are preventing, not by habit:

| If the agent tends to… | Use this form |
| --- | --- |
| Skip a discipline under pressure ("just this once") | An **anti-rationalization table** (excuse → counter) + a red-flags list |
| Do the right steps in the wrong order, or skip a step | A **numbered procedure** with explicit checkpoints and exit criteria |
| Claim success without proof | An **evidence gate** (identify → run → read → verify → then claim) |
| Produce free-form output where structure is required | A **template slot** the output must fill |
| Forget a constraint that is usually right | A **positive recipe** ("do X") stated imperatively |

Process, not prose: prefer steps, checkpoints, and exit criteria over
paragraphs of advice. If a rule can be checked, phrase it as something
checkable.

## 2. No nuance clauses

Never soften a hard rule with "unless it matters", "when appropriate", "use your
judgment", or similar. A nuance clause reopens a negotiation the agent has
already lost under pressure — it is precisely the loophole an
anti-rationalization table closes. State the rule, then enumerate the *named*
exceptions explicitly if any genuinely exist.

## 3. Imperative phrasing

Address the agent directly and imperatively: "Run the proving command", not "you
could run" or "it might help to run". Tell the agent how to check its own work —
the exact command, URL, log line, or observable signal that constitutes a
feedback loop. Vague "verify it works" is not a feedback loop.

## 4. Anti-rationalization table vs positive recipe vs template slot

- **Anti-rationalization table** — when a discipline is correct but agents
  rationalize skipping it (scope control, clarification, verification). Pair it
  with the shared red-flags list in
  [`sections/anti-rationalization.md`](./sections/anti-rationalization.md), and
  supply the skill-specific excuse rows inline in the consuming template (the
  build's `vars` parser is single-line only, so multi-row tables cannot be
  passed as `{{variable}}` values).
- **Positive recipe** — when the agent simply needs to know the right steps and
  there is no temptation to cut corners.
- **Template slot** — when downstream automation parses the output, or a
  template (`PLAN_TEMPLATE.md`, `TASK_TEMPLATE.md`) defines the required shape.

## 5. Skill Discovery Optimization (descriptions)

A skill's `description` frontmatter is its *trigger*, not its summary. A
description that recites the workflow gives the agent a shortcut to act on the
description instead of reading the skill, which hurts load accuracy.

- Lead with **"Use when…"** and enumerate concrete triggering conditions,
  symptoms, and keywords.
- **Do not** recite the operating procedure (no "discovers the root, runs hooks,
  allocates the ID, writes Markdown" — that belongs in the body).
- Add a short **"Do not use…"** guard to suppress false triggers.
- Keep it tight (a soft token budget): triggers and keywords, nothing more.

## 6. Shared sections vs inline content

Extract a `sections/*.md` include when the block is reused by 2+ templates and
is substantial (>100 words). Keep skill-specific content (e.g. a particular
skill's rationalization rows) inline in that skill's template. Place heavy
detail behind progressive disclosure (`<details>`) so `SKILL.md` files stay
readable and within budget.

## 7. After any prompt edit

Run `npm run build` and confirm the affected `templates/harness/skills/*/SKILL.md`
reassembles with no unresolved `{{include}}`/`{{variable}}` directives, no missing
frontmatter, and an intact `## Operating Procedure` heading. New variables must be
declared in each consuming template's frontmatter `vars` block.
