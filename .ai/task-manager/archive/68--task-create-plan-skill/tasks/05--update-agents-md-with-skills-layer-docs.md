---
id: 5
group: "documentation"
dependencies: [2, 3]
status: "completed"
created: "2026-05-14"
skills:
  - markdown
---
# Document the skills layer in AGENTS.md

## Objective
Add a short, accurate section to `AGENTS.md` describing the new skills layer: where TypeScript source lives, where skill artifacts live, the build command that produces bundled `.cjs` outputs, the git-ignored nature of the generated outputs, the npm publish path, and the explicit deferral of distribution into user projects. The documentation must reflect the actual implementation produced in tasks 1–3.

## Skills Required
- `markdown`: edit `AGENTS.md` in place, matching its existing structure, headings, and tone.

## Acceptance Criteria
- [ ] `AGENTS.md` gains a section (or subsection) that documents:
  - Where TypeScript source for skill scripts lives (`src/skill-scripts/`).
  - Where skill artifacts live (`templates/skills/<skill-name>/`), and that skill directories are flat (no nesting).
  - The build command (`npm run build`) and that it produces both `dist/` and skill bundles.
  - That generated `.cjs` files are git-ignored and distributed via the existing `files: ["templates/"]` rule.
  - The entrypoint-to-skill mapping convention used by the build script, so future skills can be added without re-architecting the pipeline.
  - That distribution into user projects (init copy, registry, manual install) is deferred and the existing `init` flow remains unchanged.
- [ ] The new section is placed alongside related existing documentation (e.g. near the build/development commands or the architecture overview) and uses the same heading style.
- [ ] No other section of `AGENTS.md` is rewritten or removed. Edits are additive.
- [ ] No claims in the documentation contradict the implementation (e.g. don't claim `init` copies the skill — it does not).
- [ ] `README.md` is inspected to determine whether it enumerates commands; if it does, add a brief mention of the new skill. If it does not, leave `README.md` untouched (per the plan).

## Technical Requirements
- Use Markdown matching the existing `AGENTS.md` style (heading levels, fenced code blocks, table conventions).
- Use the actual paths, filenames, and script names landed by tasks 1–3 — verify by reading the repo state at the moment of authoring, not by assumption.

## Input Dependencies
- Task 2: build pipeline must exist so the documentation accurately describes the `npm run build` behavior and the entrypoint-mapping convention.
- Task 3: skill artifact at `templates/skills/task-create-plan/` must exist so the documentation describes a real artifact.

## Output Artifacts
- Updated `AGENTS.md` with the new skills-layer section.
- Optionally: a small addition to `README.md` only if `README.md` already enumerates assistant commands.

## Implementation Notes

<details>
<summary>Step-by-step implementation guidance</summary>

1. **Read the current `AGENTS.md`** to identify the right placement. Reasonable candidates: directly after the "Directory Structure and Organization" section, or as a new top-level section like "## Skills Layer" near the build/development commands.
2. **Read the actual implementation** before writing prose: confirm the entrypoint filenames produced by task 1, the build-script path chosen in task 2, and the contents of `templates/skills/task-create-plan/SKILL.md` from task 3. Quote real names, not hypothetical ones.
3. **Draft the section**. Suggested skeleton:
   ```markdown
   ## Skills Layer

   The repository ships Agent Skills under `templates/skills/<skill-name>/`. Skills are
   assistant-agnostic — the same skill works for any assistant that supports the Agent
   Skills format. Skill directories are flat (no nested skills).

   ### TypeScript source

   The executable logic each skill needs at runtime is authored in TypeScript under
   `src/skill-scripts/`. Shared helpers are co-located here so future skills can reuse
   them. The directory type-checks and lints alongside the rest of `src/`, but its
   output is produced by the bundler, not by `tsc`.

   ### Build pipeline

   `npm run build` runs the TypeScript compile and then bundles each skill-script
   entrypoint into a self-contained `.cjs` file inside the corresponding skill's
   `scripts/` directory using `esbuild`. The entrypoint → skill mapping lives in
   `scripts/build-skills.cjs` (or wherever task 2 landed it); to add a future skill,
   add a TypeScript entrypoint under `src/skill-scripts/` and register it in that
   mapping — no other plumbing changes are needed.

   Generated `.cjs` files under `templates/skills/*/scripts/` are git-ignored and
   distributed via the existing `files: ["templates/"]` entry in `package.json`.

   ### Distribution

   How skills reach user projects (init copy, registry, manual install) is currently
   deferred. The `init` command does not copy skills today. The skill artifact in this
   repository is standards-compliant and portable so any future distribution mechanism
   can use it unchanged.
   ```
   Adjust prose, paths, and headings to match the existing document's voice.
4. **Inspect `README.md`** for an enumeration of commands or skills. If present, add a single line referencing the new skill. If absent, leave `README.md` alone.
5. **Sanity check**: re-read the new section once it's saved. Every path, filename, and script name must exactly match what tasks 1–3 produced. Run a quick `grep` for any stale path you may have copy-pasted (e.g. `src/skills/`, `templates/skill/`).

</details>
