# Skill Prompts — Build-Time Composition

This directory contains the source templates and shared partials that produce
the `SKILL.md` files shipped with each skill. `scripts/build-skill-prompts.cjs`
compiles them with [Handlebars](https://handlebarsjs.com/) at build time and
writes self-contained output to `templates/harness/skills/*/SKILL.md`.
Handlebars is a build-time `devDependency` only — it never ships; the compiled
output is plain Markdown with no templating runtime attached.

This mirrors how `src/skill-scripts/*.ts` produces `.cjs` bundles.

> This file covers assembly *mechanics*. For *how to write* the prompts
> (house style), read [`AUTHORING.md`](./AUTHORING.md) before editing content.

## Directory layout

```
src/skill-prompts/
  _partials/                     # Shared partials, *.md.hbs, never shipped
    procedure-create-plan.md.hbs
    root-discovery.md.hbs
    ...
  skills/
    st-create-plan/SKILL.md.hbs  # Source template for each skill
    st-generate-tasks/SKILL.md.hbs
    ...
```

The source tree mirrors the output tree, which is what lets the output path
be derived from the source path instead of declared in frontmatter.

## How it works

**Partial registration** — every `_partials/**/*.md.hbs` file is registered
under its path relative to `_partials/` with the `.md.hbs` extension stripped
(so `_partials/procedure-create-plan.md.hbs` registers as
`procedure-create-plan`). Each partial's body is `trimEnd()`ed at registration
so authoring a trailing newline in the source file never shifts rendered
output.

**Call syntax** — a template pulls a partial in with `{{> name}}` and
parameterizes it with call-site hash arguments:

```handlebars
{{> root-discovery action_verb_phrase="create a plan"}}
```

A partial that needs a genuine behavioral divergence — not just a
substituted value — takes a *slot*: a hash argument whose value is itself a
block partial supplied at the call site with `{{#*inline}}`:

```handlebars
{{#> procedure-create-plan heading="###" action_verb_phrase="create a plan"}}
{{#*inline "clarification_gate"}}
Follow the clarification cadence in `<root>/config/shared/clarification-gate.md`.
{{/inline}}
{{/procedure-create-plan}}
```

See `src/skill-prompts/skills/st-create-plan/SKILL.md.hbs` and
`.../st-full-workflow/SKILL.md.hbs` for two call sites that fill the same
slot two different ways, and
`src/skill-prompts/_partials/procedure-create-plan.md.hbs` for the partial
that declares it.

**Compile options** — `Handlebars.compile(source, { noEscape: true,
ignoreStandalone: true, strict: true })`:

- `noEscape: true` — this is Markdown, not HTML. Without it, `&`, `<`, and
  `>` in substituted values become entity references, and these prompts are
  full of shell redirects, comparison operators, and `<root>` placeholders
  that must reach the output byte-for-byte.
- `ignoreStandalone: true` — Handlebars' default "standalone" handling strips
  a partial tag along with the blank lines around it. That silently reformats
  Markdown spacing (list/heading adjacency) in ways that are easy to miss in
  review. Disabling it keeps authored spacing intact.
- `strict: true` — an unknown variable or misspelled hash argument fails the
  build instead of rendering as an empty string and deleting prompt text.

**Frontmatter** is exactly `name` + `description`, passed through verbatim —
it is exactly what ships, so the renderer treats the whole file as one
template with no parse-and-reconstruct step.

**Output path** is derived, not declared: `skills/<name>/SKILL.md.hbs` renders
to `templates/harness/skills/<name>/SKILL.md`, where `<name>` is the source
directory name. This path-mirroring is what retired the old `target:`
frontmatter field — there is nothing left for it to say.

## Render in place

The renderer's only write target is
`templates/harness/skills/<name>/SKILL.md`. It never wipes, copies, or
recreates any other path under `templates/`.

This differs from the kenkeep reference implementation this is modelled on.
kenkeep's `build-templates.mjs` opens with `rmSync(dest, { recursive: true,
force: true })` and copies its whole source tree over the destination —
safe there because kenkeep's `templates/` is 100% generated and gitignored.
Strikethroo's `templates/` is mostly **committed source**:
`templates/strikethroo/` and `templates/harness/agents/` are tracked, and
`templates/harness/skills/*/scripts/*.cjs` are written by `build:skills`
immediately before this script runs in the same `npm run build` chain. A
wipe-and-copy here would delete tracked files and the bundles just written.
Treat any `rmSync`, `cpSync`, or `mkdirSync` against `templates/` in this
script as a defect.

A consequence worth noting: because `_partials/` lives only under `src/`,
"never ship `_partials/`" is **structural** here, not a cleanup step. kenkeep
needs `rmSync(join(dest, '_partials'))` because it copies its whole source
tree; nothing here ever copies `_partials/` anywhere, so there is nothing to
remove. The post-render sweep instead asserts no `.hbs` file and no
unresolved `{{…}}` marker exists anywhere in the shipped tree.

## Editing a skill's prompt

1. Edit the source template at `src/skill-prompts/skills/<skill>/SKILL.md.hbs`
   or the relevant partial under `src/skill-prompts/_partials/`.
2. Run `npm run build:skill-prompts` (or `npm run build`).
3. The assembled output lands in `templates/harness/skills/<skill>/SKILL.md`.

## Adding a new shared partial

1. Create a `.md.hbs` file in `src/skill-prompts/_partials/`.
2. Reference it from a template or another partial with `{{> name}}`
   (or `{{#> name}}...{{/name}}` for a block partial with slots), passing
   any call-site differences as hash arguments.
3. Extract every duplicated procedure, including thin ones — there is no
   size threshold. A word-count bar has to be re-argued at every extraction,
   and the argument always favors leaving the duplication in place, which is
   how duplicated content drifts into disagreeing copies. A rule with no
   threshold has nothing to argue about.

## Adding a new skill template

1. Create `src/skill-prompts/skills/<skill-name>/SKILL.md.hbs` with
   frontmatter carrying only:
   ```yaml
   ---
   name: <skill-name>
   description: "<skill description>"
   ---
   ```
2. The output path is derived from the directory name — no `target:` field
   exists or is needed.
3. `name` and `description` pass through into the assembled output verbatim.
