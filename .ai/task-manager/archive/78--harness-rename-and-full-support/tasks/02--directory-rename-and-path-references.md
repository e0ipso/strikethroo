---
id: 2
group: "terminology-rename"
dependencies: [1]
status: "completed"
created: "2026-05-25"
skills:
  - ci-cd
---
# Directory Rename and Path Reference Updates

## Objective
Rename the `templates/assistant/` directory to `templates/harness/` and update all configuration, build, and workflow files that reference this path. Also update the template path reference in the init logic (`src/index.ts`).

## Skills Required
- **ci-cd**: Build scripts, GitHub Actions workflows, plugin manifests, gitignore rules

## Acceptance Criteria
- [ ] `templates/assistant/` directory renamed to `templates/harness/` (preserving all contents: `agents/`, `skills/`)
- [ ] `.claude-plugin/plugin.json` skill paths updated from `./templates/assistant/skills/<name>` to `./templates/harness/skills/<name>`
- [ ] `.gitignore` rule updated from `templates/assistant/skills/*/scripts/` to `templates/harness/skills/*/scripts/`
- [ ] `.github/workflows/release-skills.yml` path references updated
- [ ] `scripts/build-skills.cjs` `SKILLS_ROOT` path updated from `'templates', 'assistant', 'skills'` to `'templates', 'harness', 'skills'`
- [ ] `src/index.ts` template path reference updated from `path.join('assistant', 'agents')` to `path.join('harness', 'agents')`
- [ ] `npm run build` succeeds
- [ ] `npm run build:skills` succeeds (or at least the path resolution is correct)
- [ ] `npm pack --dry-run` shows `templates/harness/` in package contents

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Use `git mv templates/assistant templates/harness` to preserve git history
- The `package.json` `files` field includes `"templates/"` which covers both old and new names — no change needed there
- Verify no other files reference the old `templates/assistant/` path (use `grep -rn "templates/assistant" .` excluding `node_modules/` and `.git/`)

## Input Dependencies
- Task 1 must be complete so that `src/index.ts` already uses `createHarnessStructure()` — this task updates the template path string inside that function

## Output Artifacts
- Renamed `templates/harness/` directory with all original contents intact
- Updated `.claude-plugin/plugin.json`
- Updated `.gitignore`
- Updated `.github/workflows/release-skills.yml`
- Updated `scripts/build-skills.cjs`
- Updated template path in `src/index.ts`

## Implementation Notes

<details>

### Step-by-step

1. **Rename the directory**:
   ```bash
   git mv templates/assistant templates/harness
   ```

2. **Update `.claude-plugin/plugin.json`**: Replace all 6 occurrences of `./templates/assistant/skills/` with `./templates/harness/skills/`. The current content has entries like:
   ```json
   "./templates/assistant/skills/task-create-plan"
   ```
   Change each to:
   ```json
   "./templates/harness/skills/task-create-plan"
   ```

3. **Update `.gitignore`** (line 79): Change:
   ```
   templates/assistant/skills/*/scripts/
   ```
   to:
   ```
   templates/harness/skills/*/scripts/
   ```

4. **Update `.github/workflows/release-skills.yml`** (line 50): Change:
   ```
   git add -f templates/assistant/skills/*/scripts/
   ```
   to:
   ```
   git add -f templates/harness/skills/*/scripts/
   ```

5. **Update `scripts/build-skills.cjs`** (line 17): Change:
   ```js
   const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'assistant', 'skills');
   ```
   to:
   ```js
   const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'harness', 'skills');
   ```
   Also check line 9 comment referencing `templates/assistant/skills/` and update it.

6. **Update `src/index.ts`** (line 330): Change:
   ```ts
   const sourceAgentsDir = getTemplatePath(path.join('assistant', 'agents'));
   ```
   to:
   ```ts
   const sourceAgentsDir = getTemplatePath(path.join('harness', 'agents'));
   ```

7. **Sweep for stragglers**:
   ```bash
   grep -rn "templates/assistant" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai
   ```
   Fix any remaining references found.

8. **Verify**:
   ```bash
   npm run build
   npm pack --dry-run 2>&1 | grep templates
   ```

</details>
