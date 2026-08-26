# Skill prompt composition

`src/skill-prompts/` contains the Handlebars sources for the seven shipped
`SKILL.md` files. `scripts/build-skill-prompts.cjs` renders them into
`templates/harness/skills/*/SKILL.md`. Handlebars is a development dependency;
the package ships plain Markdown.

Read [`AUTHORING.md`](./AUTHORING.md) before editing prompt content.

## Source layout

```text
src/skill-prompts/
  _partials/                     # Shared *.md.hbs partials
  skills/
    <name>/SKILL.md.hbs          # One source template per skill

templates/harness/skills/
  <name>/SKILL.md                # Rendered output
```

The source skill directory determines the output skill directory.

## Composition

- **Partials.** Files under `_partials/` register by their relative path with
  `.md.hbs` removed. The renderer applies `trimEnd()` before registration.
- **Calls.** Use `{{> name}}` for a partial and hash arguments for values, such
  as `{{> root-discovery action_verb_phrase="create a plan"}}`.
- **Slots.** Put different instructions in named block partials supplied at
  each call site with `{{#*inline "slot_name"}}`. Shared partials must not use
  conditionals for call-site behavior.
- **Compile options.** `noEscape: true` preserves Markdown and shell symbols,
  `ignoreStandalone: true` preserves authored spacing, and `strict: true`
  rejects unknown variables and hash arguments.
- **Frontmatter.** Each source template contains only `name` and `description`.
  The renderer passes both fields through unchanged.

## Build constraints

The renderer writes only `templates/harness/skills/<name>/SKILL.md`. It does
not delete, copy, or create paths under `templates/`. `build:skills` must create
the target skill directories first.

Partials remain under `src/` and never ship. Post-render validation rejects:

- empty output;
- missing `name` or `description`, or `vars` and `target` frontmatter fields;
- a missing `## Operating Procedure` heading;
- unresolved Handlebars markers outside fenced code blocks;
- HTML escaping not present in the source;
- missing referenced scripts; and
- `.hbs` files or `_partials/` directories under `templates/`.

## Editing prompts

1. Edit `skills/<name>/SKILL.md.hbs` or a partial under `_partials/`.
2. Run `npm run build:skill-prompts`, or run the full `npm run build`.
3. Inspect the rendered `templates/harness/skills/<name>/SKILL.md`.

## Adding a partial

Create `_partials/<name>.md.hbs` and reference it with `{{> name}}`. Extract
content when at least two templates use it. Pass values through hash arguments
and behavior through block-partial slots.

## Adding a skill template

Create `skills/<name>/SKILL.md.hbs` with this frontmatter:

```yaml
---
name: <name>
description: "<description>"
---
```

The renderer writes it to `templates/harness/skills/<name>/SKILL.md`.
