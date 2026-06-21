# Skill Prompts — Build-Time Composition

This directory contains the source templates and shared sections that produce
the `SKILL.md` files shipped with each skill. The assembler script
(`scripts/build-skill-prompts.cjs`) resolves includes and variables at build
time, writing self-contained output to `templates/harness/skills/*/SKILL.md`.

This mirrors how `src/skill-scripts/*.ts` produces `.cjs` bundles.

> **Before editing prompt content**, read [`AUTHORING.md`](./AUTHORING.md) — the
> house-style guide for *how* to write these prompts (form-over-narrative, the
> "no nuance clauses" rule, anti-rationalization tables, Skill Discovery
> Optimization for descriptions, imperative phrasing). This file (`README.md`)
> covers the assembly *mechanics*; `AUTHORING.md` covers the writing discipline.

## Directory layout

```
src/skill-prompts/
  sections/             # Reusable procedural blocks (each used by 2+ templates)
  st-create-plan.md     # Source template for each skill
  st-generate-tasks.md
  ...
```

## How it works

**Includes** — `{{include sections/root-discovery.md}}` on its own line is
replaced with the file contents. Paths are relative to `src/skill-prompts/`.
Recursive includes are supported (max depth 3) with cycle detection.

**Variables** — `{{variable_name}}` is replaced with a value from the `vars`
block in the source template's YAML frontmatter.

## Editing a skill's prompt

1. Edit the source template in `src/skill-prompts/<skill-name>.md` or the
   relevant section in `src/skill-prompts/sections/`.
2. Run `npm run build:skill-prompts` (or `npm run build`).
3. The assembled output lands in `templates/harness/skills/<skill>/SKILL.md`.

## Adding a new shared section

1. Create a `.md` file in `src/skill-prompts/sections/`.
2. Reference it from source templates with `{{include sections/<name>.md}}`.
3. A section should be >100 words and used by 2+ templates to justify extraction.

## Adding a new skill template

1. Create `src/skill-prompts/<skill-name>.md` with frontmatter:
   ```yaml
   ---
   name: <skill-name>
   description: "<skill description>"
   target: <skill-directory-name>
   vars:
     key: "value"
   ---
   ```
2. The `target` field maps to `templates/harness/skills/<target>/`.
3. Only `name` and `description` survive into the assembled output.
