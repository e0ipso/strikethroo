---
id: 3
group: "config"
dependencies: []
status: "completed"
created: "2026-05-21"
skills:
  - "github-actions"
  - "bash"
---

# Re-path `.gitignore`, `package.json`, and release workflow to the new skill location

## Objective

Three small, related text edits that together move every repo-config reference to the skill output tree from `skills/` to `templates/assistant/skills/`:

1. `.gitignore`: change the rule `skills/*/scripts/` to `templates/assistant/skills/*/scripts/`.
2. `package.json`: drop the `"skills/"` entry from the `files` array (it no longer exists; the full `templates/` tree already ships skill content).
3. `.github/workflows/release-skills.yml`: change the staging step from `git add -f skills/*/scripts/*.cjs` to `git add -f templates/assistant/skills/*/scripts/`.

These are merged into a single task because each is a one-line repath of the same migration, in the same direction, with the same scope. Splitting them would not aid review.

## Skills Required

- `github-actions` — for the workflow staging-step edit.
- `bash` — for verifying the change locally.

## Acceptance Criteria

- [ ] `.gitignore` no longer contains `skills/*/scripts/`; it contains `templates/assistant/skills/*/scripts/` (with the surrounding "Generated skill script bundles" comment preserved).
- [ ] `package.json`'s `files` array contains `"dist/"`, `"templates/"`, and `"LICENSE"` only — the `"skills/"` entry is removed.
- [ ] `.github/workflows/release-skills.yml`'s "Stage built bundles" step runs `git add -f templates/assistant/skills/*/scripts/` (note: the trailing `*.cjs` glob is intentionally dropped since the whole `scripts/` directory contents are build output to stage).
- [ ] All other content of these three files is unchanged.
- [ ] `package.json` remains valid JSON (lint with `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`).
- [ ] `.github/workflows/release-skills.yml` remains valid YAML.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- The release-workflow change must keep all other workflow steps identical (checkout, node setup, install, build, git identity, commit message, tag force-move, push). The contract that release commits are reachable only from tag refs and labeled `[release-bundle]` is preserved by leaving those steps untouched.
- The `package.json` `files` edit must NOT add a negation (`!skills/`) or any other entry — the `skills/` path simply ceases to exist, so referencing it would noise the manifest.

## Input Dependencies

None at edit time. Logically these changes pair with Task 1 (migration) and Task 2 (build script repath) but the file edits do not require either to have happened first.

## Output Artifacts

- `.gitignore` with the re-pathed ignore rule.
- `package.json` with `"skills/"` removed from `files`.
- `.github/workflows/release-skills.yml` with the re-pathed staging step.

## Implementation Notes

<details>
<summary>The three edits in detail</summary>

**1. `.gitignore`** — locate this block (currently around lines 78-79):

```
# Generated skill script bundles
skills/*/scripts/
```

Replace the pattern line, keeping the comment:

```
# Generated skill script bundles
templates/assistant/skills/*/scripts/
```

**2. `package.json`** — locate the `files` array. Currently:

```json
"files": [
  "dist/",
  "skills/",
  "templates/",
  "LICENSE"
],
```

Remove the `"skills/",` line so it becomes:

```json
"files": [
  "dist/",
  "templates/",
  "LICENSE"
],
```

Preserve surrounding whitespace and trailing comma style exactly as the file uses.

**3. `.github/workflows/release-skills.yml`** — locate the "Stage built bundles" step. Currently:

```yaml
      - name: Stage built bundles
        run: git add -f skills/*/scripts/*.cjs
```

Replace with:

```yaml
      - name: Stage built bundles
        run: git add -f templates/assistant/skills/*/scripts/
```

Note the trailing-`*.cjs` drop: the new path stages the whole `scripts/` directory tree, which is conceptually cleaner (the entire directory IS the build output). Since `.gitignore` covers `templates/assistant/skills/*/scripts/` and nothing else is generated under that path, `git add -f templates/assistant/skills/*/scripts/` adds exactly the same set of `.cjs` files the old glob added, no more.

Leave the YAML indentation, the surrounding job/step structure, the file header comment about `[release-bundle]`, and every other step exactly as written.

</details>

<details>
<summary>Verification commands</summary>

```bash
# .gitignore
grep -n 'templates/assistant/skills/\*/scripts/' .gitignore   # expect: one line found
grep -n '^skills/\*/scripts/' .gitignore                        # expect: no output

# package.json
node -e "const f = JSON.parse(require('fs').readFileSync('package.json','utf8')).files; console.log(f.includes('skills/'), JSON.stringify(f))"
# expect: false ["dist/","templates/","LICENSE"]

# workflow
grep -n 'git add -f templates/assistant/skills/\*/scripts/' .github/workflows/release-skills.yml  # expect: one line found
grep -n 'git add -f skills/\*/scripts/\*.cjs' .github/workflows/release-skills.yml                # expect: no output
```

</details>

<details>
<summary>Why merge these three?</summary>

Each edit is independently trivial (one line) and shares a single review concern: "does the new path exactly match `templates/assistant/skills/*/scripts/`, character for character." Splitting into three tasks would inflate task count without adding clarity. The plan's Integration Strategy lists these as separate commits — task minimization keeps them as separate considerations within one task; the executor can still produce three commits if commit hygiene is desired downstream.

</details>
