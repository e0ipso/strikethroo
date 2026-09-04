# Authoring Strikethroo skill prompts

This file defines the writing rules for `src/skill-prompts/`. See
[`README.md`](./README.md) for Handlebars syntax and build behavior.

## Form follows failure

Pick the prompt form by the failure you are preventing:

| Agent tends to… | Use |
| --- | --- |
| Skip a discipline under pressure | anti-rationalization table (excuse → counter) |
| Skip or reorder steps | numbered procedure with exit criteria |
| Claim success without proof | evidence gate (identify → run → read → verify) |
| Free-form where structure is required | a template slot to fill |
| Forget a usually-right constraint | a positive recipe, stated imperatively |

Prefer steps, checkpoints, and checkable rules over paragraphs of advice.

## Rules

- **No nuance clauses.** Never soften a hard rule with "unless it matters" or
  "use judgment" — that reopens a negotiation. Name real exceptions explicitly.
- **Never restate a script's own output.** If a script prints a usage line or
  a JSON contract, the prompt names the command and, for JSON, the field the
  step reads. Not the full usage text, not the complete field list. The script
  is the source of truth for what it prints; a prompt copy is a second copy
  that can drift from it.
- **Never carry packaging, install, or build facts.** Where a skill's scripts
  live, how the skill is installed, or how the project is built are the
  agent's environment, not something the agent acts on mid-procedure. That
  belongs in `AGENTS.md` or `README.md`, not in a prompt step.
- **Imperative phrasing.** "Run the proving command", not "you could run". Give
  the exact command/URL/log that proves the work; "verify it works" is not a check.
- **Descriptions are triggers, not summaries.** Lead with "Use when…", list
  triggering conditions + keywords, add a short "Do not use…" guard, and omit the
  workflow recitation. Keep it tight.
- **Shared vs inline vs runtime.** Three levels of reuse:
  - *Build-time partial* (`_partials/*.md.hbs`, called as `{{> name}}`) —
    content used by two or more templates. Pass values with hash arguments.
    Pass different instructions with block-partial slots.
  - *Runtime config* (`config/hooks/*.md`, `config/shared/*.md`, required by the
    workspace schema) — cross-skill enforcement disciplines a project should be
    able to customize. **Runtime config is instructions only** — no meta about
    init, hash tracking, or how the file is loaded; put customization notes in
    `docs/customization.md` / `AGENTS.md`.
  - *Inline* — genuinely skill-specific content that only one template ever
    uses, such as a skill's own rationalization rows.

- **Inline vs `references/`.** A skill's `references/*.md` files ship next to
  `SKILL.md` and are read when a step points at them.

  | Stays inline in `SKILL.md` | Moves to `references/` |
  | --- | --- |
  | Rationalization rows and excuse counters | Rubric and scoring tables |
  | Exit criteria and hard rules | Field lists a template already carries |
  | Structured summary blocks | Worked examples a schema already certifies |

  The test before moving a block: some script or schema must already catch
  its omission (an unscored task fails `complexityScoresValid`; a malformed
  findings document fails the XSD). If nothing downstream catches a skipped
  read, the block is discipline and stays inline regardless of size. Each
  moved block is replaced by one sentence that names the file and says when
  to read it. Reference files are plain Markdown, never Handlebars, and carry
  no frontmatter. A file named from a shared partial lives in `_references/`
  and is copied into every skill whose rendered prompt points at it; a file
  named only from one skill's template lives in that skill's `references/`.

- **The slot rule.** Supply different instructions as named block partials at
  each call site. Do not put `{{#if}}` branches in shared partials.

## After editing

Run `npm run build`; confirm the affected `SKILL.md` reassembles with no
unresolved `{{…}}` marker and an intact `## Operating Procedure` heading.
