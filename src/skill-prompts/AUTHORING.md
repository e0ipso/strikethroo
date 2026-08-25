# Authoring Strikethroo Skill Prompts — House Style

*How* to write prompt source under `src/skill-prompts/`; for assembly mechanics
(Handlebars partials, hash arguments, build steps) see
[`README.md`](./README.md). Read this before editing prompts.

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
- **Imperative phrasing.** "Run the proving command", not "you could run". Give
  the exact command/URL/log that proves the work; "verify it works" is not a check.
- **Descriptions are triggers, not summaries.** Lead with "Use when…", list
  triggering conditions + keywords, add a short "Do not use…" guard, and omit the
  workflow recitation. Keep it tight.
- **Shared vs inline vs runtime.** Three levels of reuse:
  - *Build-time partial* (`_partials/*.md.hbs`, called as `{{> name}}`) —
    every procedural block duplicated across 2+ templates, with no size
    threshold: extract it even if it is one line, because a threshold has to
    be re-argued at every extraction and the argument always favors leaving
    the duplication in place. Call-site differences are hash arguments
    (`{{> name heading="###" }}`); hash arguments and block partials hold
    multi-line content, so a multi-row table belongs in a partial too, not
    inline, once it is duplicated.
  - *Runtime config* (`config/hooks/*.md`, `config/shared/*.md`, required by the
    workspace schema) — cross-skill enforcement disciplines a project should be
    able to customize. **Runtime config is instructions only** — no meta about
    init, hash tracking, or how the file is loaded; put customization notes in
    `docs/customization.md` / `AGENTS.md`.
  - *Inline* — genuinely skill-specific content that only one template ever
    uses (e.g. a skill's own rationalization rows). If a second call site ever
    needs the same content, it moves to a partial — the reuse count decides,
    not the content's shape.
  Put heavy detail behind `<details>`.

- **The slot rule.** When two call sites need genuinely different behavior
  from the same shared procedure — not a substituted value, a different
  instruction — express the difference as a partial reference supplied at the
  call site, never as a conditional inside the shared partial. A slot is a
  hash argument whose value names a partial (a block partial filled with
  `{{#*inline "slot_name"}}...{{/inline}}`, or a dynamic partial), never a
  boolean. This is the "no nuance clauses" rule applied to templating: an
  `{{#if autonomous}}` inside a partial body puts the branch where the agent
  rendering that partial has to evaluate it; a slot puts the branch at the
  call site, where a reader looking at that one call site can see directly
  which behavior applies. Reject any conditional found inside a
  `_partials/*.md.hbs` file during review — it is a slot that was not taken.

## After editing

Run `npm run build`; confirm the affected `SKILL.md` reassembles with no
unresolved `{{…}}` marker and an intact `## Operating Procedure` heading.
