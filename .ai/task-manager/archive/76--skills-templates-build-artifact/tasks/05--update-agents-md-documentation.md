---
id: 5
group: "documentation"
dependencies: [1, 2, 3, 4]
status: "completed"
created: "2026-05-21"
skills:
  - "documentation"
---

# Rewrite the `AGENTS.md` Skills Layer / Build / Distribution / GitHub Releases sections

## Objective

Update `AGENTS.md` so its description of skills layout, build pipeline, distribution, and release workflow precisely matches the post-migration reality: source AND compiled output both live under `templates/assistant/skills/<name>/`; the top-level `skills/` directory no longer exists; `vercel-labs/skills` discovers skills via `.claude-plugin/plugin.json` rather than via a priority directory; the release workflow stages `templates/assistant/skills/*/scripts/`. The Schema Version Contract subsection is left untouched (the contract is preserved at the new path; no functional change).

## Skills Required

- `documentation` — rewriting narrative + code-fence examples in Markdown without drift from the actual code.

## Acceptance Criteria

- [ ] The "Skills Layer" section describes `templates/assistant/skills/<name>/` as both the authoring location and the compiled-output location, and notes that the top-level `skills/` directory does not exist.
- [ ] The "Skills Layer" section still enumerates the six current skills with their role descriptions (preserve that prose; only swap the path references).
- [ ] The "Build pipeline" subsection describes esbuild emitting `.cjs` bundles directly into `templates/assistant/skills/<name>/scripts/` and explicitly states there is no copy pass.
- [ ] The "Build pipeline" subsection mentions the new ignore rule: `templates/assistant/skills/*/scripts/` (instead of `skills/*/scripts/`).
- [ ] The "Distribution" subsection documents `.claude-plugin/plugin.json` as the discovery contract: a JSON manifest at the repo root with a `skills:` array of `./templates/assistant/skills/<name>` paths and an optional `name` grouping label. Explicitly distinguishes `templates/assistant/skills/` (consumed by `vercel-labs/skills` at install time) from its siblings `templates/assistant/agents/` and `templates/assistant/commands/` (consumed by `npx . init`).
- [ ] The "Distribution" subsection drops or rewrites the sentence "walks any GitHub repo's `skills/` directory" — that is no longer how this repo is discovered.
- [ ] The "GitHub Releases" subsection updates the `git ls-tree` invariants from `'skills/*/scripts/*.cjs'` to a glob/path under `templates/assistant/skills/*/scripts/`, and updates the staging-step description accordingly.
- [ ] The "Schema Version Contract" subsection is unchanged in substance.
- [ ] No other section of `AGENTS.md` is modified.
- [ ] All `npm pack --dry-run`, `git ls-tree`, and `git ls-files` example commands shown in the updated sections produce the expected output when run against the post-migration repo (cross-check during execution).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- The current sections live around the headings: `## Skills Layer`, `### TypeScript source of truth`, `### Build pipeline`, `### Distribution`, `### Schema Version Contract`, `### GitHub Releases`. Edit in place; do not reorder the headings.
- Existing examples like `git ls-tree -r v<tag> -- 'skills/*/scripts/*.cjs'` become `git ls-tree -r v<tag> -- 'templates/assistant/skills/*/scripts/*.cjs'`. The wrapping single quotes are kept to prevent glob expansion in user shells.
- Keep the `[release-bundle]` commit label, the `main`-stays-bundle-free contract, and the schema-version description verbatim.

## Input Dependencies

- Task 1 (so the documented authoring path actually exists).
- Task 2 (so the documented output path actually exists).
- Task 3 (so the documented `.gitignore` and workflow paths actually exist).
- Task 4 (so the `.claude-plugin/plugin.json` referenced by the docs actually exists).

## Output Artifacts

- Rewritten "Skills Layer", "Build pipeline", "Distribution", and "GitHub Releases" sections in `AGENTS.md`.

## Implementation Notes

<details>
<summary>Sectional rewrite checklist</summary>

**"Skills Layer" opening paragraph** (currently begins "The repository ships Agent Skills under `skills/<skill-name>/` at the repo root."):

- Change `skills/<skill-name>/` → `templates/assistant/skills/<name>/`.
- Add a sentence explicitly stating there is no top-level `skills/` directory and that authored + compiled content coexist under each per-skill directory (with `scripts/` reserved for compiled output).
- Preserve the "Skill directories are flat (no nested skills)" sentence.

**The six-skill enumeration paragraph** (currently lists `task-create-plan` (`skills/task-create-plan/`), etc.):

- Replace each `(skills/<name>/)` parenthetical with `(templates/assistant/skills/<name>/)`.
- The behavioral descriptions stay the same.

**"TypeScript source of truth" subsection**: no edits required — it talks about `src/skill-scripts/` only.

**"Build pipeline" subsection**:

- The current paragraph about esbuild outputting to "the corresponding skill's `scripts/` directory" stays accurate in spirit; tighten the path reference if it appears.
- The sentence "Generated `.cjs` files under `skills/*/scripts/` are git-ignored on `main` and force-added only at release tags…" becomes "Generated `.cjs` files under `templates/assistant/skills/*/scripts/` are git-ignored on `main` and force-added only at release tags…"
- The sentence "They ship in the published npm package via the `files: ["skills/"]` entry in `package.json`…" must change. Replace with: "They ship in the published npm package via the `files: ["templates/"]` entry in `package.json` (which already covers `templates/assistant/skills/`; the previous separate `"skills/"` entry was removed when the top-level `skills/` directory was eliminated)."

**"Distribution" subsection**:

- The current opening sentence claims the installer "walks any GitHub repo's `skills/` directory and places files into per-agent dirs." Rewrite to reflect plugin-manifest discovery: "Skills are distributed via [vercel-labs/skills](https://github.com/vercel-labs/skills), a generic Anthropic-adjacent installer. It discovers skills in this repo by reading `.claude-plugin/plugin.json` at the repo root, which declares each skill's path under `templates/assistant/skills/<name>/`."
- Keep the rest of the paragraph (the `npx skills add e0ipso/ai-task-manager` example, the note that `init` does not copy skills, the two-channels-coupled-only-by-schema-version line).
- Add a paragraph clarifying the semantic distinction: `templates/assistant/skills/` is build/install-time content (read by `vercel-labs/skills` at `npx skills add` time); `templates/assistant/agents/` and `templates/assistant/commands/` are per-project init-time content (copied into `.<assistant>/...` by `npx . init`). The CLI's `init` does not read `templates/assistant/skills/`.

**"Schema Version Contract" subsection**: unchanged. The contract operates at the new path, but no edit is required because the section talks only about `src/metadata.ts`, the `EXPECTED_WORKSPACE_SCHEMA_VERSION` define, and the post-build smoke check — none of which reference `skills/` directly. Read through once to confirm.

**"GitHub Releases" subsection**:

- The sentence "force-adds the otherwise git-ignored `skills/*/scripts/*.cjs` files" becomes "force-adds the otherwise git-ignored `templates/assistant/skills/*/scripts/` directory contents".
- The `git ls-tree` example block currently shows:
  ```bash
  git ls-tree -r v<tag> -- 'skills/*/scripts/*.cjs'   # expect: bundles listed
  git ls-tree -r main -- 'skills/*/scripts/*.cjs'     # expect: empty
  ```
  Replace with:
  ```bash
  git ls-tree -r v<tag> -- 'templates/assistant/skills/*/scripts/*.cjs'   # expect: bundles listed
  git ls-tree -r main -- 'templates/assistant/skills/*/scripts/*.cjs'     # expect: empty
  ```
- The `[release-bundle]` label paragraph stays exactly as is.

</details>

<details>
<summary>Cross-check before completing</summary>

After the edits, run these and verify each section matches the surrounding prose:

```bash
# Skills paths exist
ls templates/assistant/skills/

# Build outputs land where docs say
npm run build && find templates/assistant/skills -name '*.cjs' | sort | head

# Plugin manifest exists where docs say
cat .claude-plugin/plugin.json

# Workflow path matches docs
grep 'templates/assistant/skills' .github/workflows/release-skills.yml

# Ignore rule matches docs
grep 'templates/assistant/skills/\*/scripts/' .gitignore
```

</details>

<details>
<summary>What NOT to do</summary>

- Do not add a "GENERATED — do not edit" callout anywhere in AGENTS.md. The user explicitly declined that affordance for `SKILL.md`; the documentation reinforces this without re-litigating it.
- Do not rewrite sections unrelated to the migration (Plan Review Loop, Refine-Plan, etc.). Scope is strict.
- Do not add a "Migration Guide" or "How to Upgrade" subsection — this is a one-shot internal refactor, not a public migration.

</details>
