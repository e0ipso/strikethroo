---
id: 1
group: "repo-restructure"
dependencies: []
status: "completed"
created: 2026-05-20
skills:
  - typescript
  - bash
---
# Restructure skill directories to `skills/` at repo root

## Objective
Hard-cut move of all six skill directories from `templates/skills/` to `skills/` at the repository root, including every reference in build scripts, ignore rules, package manifest, and AGENTS.md path mentions. After this task, `npx skills add e0ipso/ai-task-manager` would resolve the expected layout at a release ref.

## Skills Required
- `typescript` — touching build script (CommonJS) and validating that no TypeScript source under `src/` hardcodes the legacy path.
- `bash` — `git mv`, grep sweeps to verify all references are updated.

## Acceptance Criteria
- [ ] All six skill directories live directly under `skills/` at repo root: `skills/task-create-plan/`, `skills/task-execute-blueprint/`, `skills/task-execute-task/`, `skills/task-full-workflow/`, `skills/task-generate-tasks/`, `skills/task-refine-plan/`.
- [ ] `templates/skills/` no longer exists.
- [ ] `scripts/build-skills.cjs` has `SKILLS_ROOT` pointing at `path.join(REPO_ROOT, 'skills')`.
- [ ] `.gitignore` ignores `skills/*/scripts/` (not `templates/skills/*/scripts/`).
- [ ] `package.json` `files` array includes both `"skills/"` and existing entries (`dist/`, `templates/`, `LICENSE`).
- [ ] `AGENTS.md` no longer contains the literal string `templates/skills` (paths and the git-ignore note refreshed to `skills/`).
- [ ] `git grep -F 'templates/skills'` returns no matches across the working tree (excluding plan/archive markdown files belonging to this plan).
- [ ] `npm run build` completes successfully and produces `.cjs` bundles under `skills/<name>/scripts/`.
- [ ] `npm pack --dry-run` lists the `skills/` directory contents in the package tarball.

## Technical Requirements
- Repo layout becomes `skills/<skill-name>/SKILL.md` + `skills/<skill-name>/scripts/` to match the `vercel-labs/skills` installer convention.
- Build pipeline central constant `SKILLS_ROOT` is the only change required in `scripts/build-skills.cjs` (line 16); the existing `SKILL_ENTRYPOINTS` array's `dest` derives from `SKILLS_ROOT`, so 17 entrypoint mappings reroute automatically.
- `.gitignore` line 79: `templates/skills/*/scripts/` → `skills/*/scripts/`.
- `package.json` `files` array (currently `["dist/", "templates/", "LICENSE"]`) gets `"skills/"` appended; `"templates/"` stays because command templates still live there.
- `AGENTS.md` known references to update:
  - Line 281 — narrative path mention.
  - Line 283 — long paragraph naming each skill's `templates/skills/<name>/` path.
  - Line 298 — git-ignored bundles paragraph.
  - Any other occurrences surfaced by `git grep -F 'templates/skills' AGENTS.md`.
- Verified before planning: no source code under `src/` hardcodes the legacy path; the only references are in the build-time script and docs. Re-verify with a final grep.

## Input Dependencies
None.

## Output Artifacts
- `skills/<six-skill-dirs>/` checked into the repo.
- Updated `scripts/build-skills.cjs`, `.gitignore`, `package.json`, `AGENTS.md`.
- Downstream tasks (schema-version skill-side check, release workflow, documentation) consume the new path.

## Implementation Notes

<details>
<summary>Step-by-step implementation</summary>

1. **Move directories with git history preserved**
   ```bash
   git mv templates/skills skills
   git status   # verify renames detected; ensure no extra files moved
   ```
   If `templates/` contains other tracked content (it does — command templates, hooks, plan templates), only the `skills/` subdir is being moved. The rest of `templates/` stays put.

2. **Update `scripts/build-skills.cjs`**
   At line 16 change:
   ```js
   const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'skills');
   ```
   to:
   ```js
   const SKILLS_ROOT = path.join(REPO_ROOT, 'skills');
   ```
   This is the only change needed in the build script; the `outDir` computation at line 115 derives from this constant.

3. **Update `.gitignore` line 79**
   Change `templates/skills/*/scripts/` → `skills/*/scripts/`. This keeps generated `.cjs` bundles git-ignored on `main` (they'll be force-added only at release tags by the release workflow).

4. **Update `package.json` `files` array**
   The current array (line ~43) is `["dist/", "templates/", "LICENSE"]`. Add `"skills/"` while keeping the existing entries:
   ```json
   "files": [
     "dist/",
     "skills/",
     "templates/",
     "LICENSE"
   ]
   ```
   Keep alphabetical or original ordering — match whatever style the file already uses.

5. **Update `AGENTS.md`**
   Run `git grep -nF 'templates/skills' AGENTS.md` and replace every match with `skills/`. Known locations from planning: lines 281, 283, 298. Sentences should read naturally with the new path. Example line 281: `The repository ships Agent Skills under \`skills/<skill-name>/\`.`

6. **Sanity-check `src/` for hardcoded legacy paths**
   ```bash
   git grep -F 'templates/skills' src/
   ```
   Expect no results. If anything turns up, update it.

7. **Verify build still works end-to-end**
   ```bash
   npm run build
   ls skills/task-create-plan/scripts/   # expect: .cjs files generated locally
   ```

8. **Verify package tarball includes the new dir**
   ```bash
   npm pack --dry-run | grep -E '^npm notice .* skills/'
   ```

9. **Final sweep**
   ```bash
   git grep -F 'templates/skills'
   ```
   Expect zero matches outside this plan's own markdown files.

**Pitfalls to avoid**:
- Don't introduce a symlink for backward compatibility — plan explicitly calls out a hard cut.
- Don't move `templates/ai-task-manager/` or other `templates/` subdirs; the move is scoped to `templates/skills/` only.
- Don't delete the `"templates/"` entry in `package.json` `files`; command templates still ship from there.
- Don't update AGENTS.md content about Schema Version Contract or GitHub Releases here — those are separate subsection additions handled in the documentation task.

</details>
