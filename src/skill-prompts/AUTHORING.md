# Authoring Strikethroo Skill Prompts — House Style

*How* to write prompt source under `src/skill-prompts/`; for assembly mechanics
(`{{include}}`/`{{variable}}`, build steps) see [`README.md`](./README.md). Read
this before editing prompts.

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
  - *Build-time include* (`{{include sections/*.md}}`) — procedural blocks reused
    by 2+ templates; inlined into each `SKILL.md` at build.
  - *Runtime config* (`config/hooks/*.md`, `config/shared/*.md`, read via "if
    `<root>/config/.../X.md` exists, read it and apply it") — cross-skill
    enforcement disciplines a project should be able to customize. **Runtime config
    is instructions only** — no meta about init, hash tracking, or how the file is
    loaded; put customization notes in `docs/customization.md` / `AGENTS.md`.
    Reference defensively ("if present") for backwards-compat.
  - *Inline* — genuinely skill-specific content (e.g. a skill's own rationalization
    rows). The `vars` parser is single-line only, so multi-row tables cannot be
    `{{variable}}` values; keep them inline.
  Put heavy detail behind `<details>`.

## After editing

Run `npm run build`; confirm the affected `SKILL.md` reassembles with no
unresolved `{{…}}` directives and an intact `## Operating Procedure` heading.
