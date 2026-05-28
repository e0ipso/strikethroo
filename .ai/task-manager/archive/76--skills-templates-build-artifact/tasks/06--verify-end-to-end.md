---
id: 6
group: "verification"
dependencies: [1, 2, 3, 4, 5]
status: "completed"
created: "2026-05-21"
skills:
  - "bash"
---

# Verify the migration end-to-end against the plan's Self Validation steps

## Objective

Execute the 10 concrete verification steps enumerated in the plan's "Self Validation" section against the post-migration tree. Each step has a precise expected outcome; any failure must be reported and resolved (either by fixing the implementing task or by re-running the verification after a follow-up). This task is the single point where the build, the file moves, the configs, the manifest, and the docs are exercised together.

## Skills Required

- `bash` — running build, find, grep, jq, git ls-tree, and CLI subcommands.

## Acceptance Criteria

- [ ] Step 1 (clean build): `rm -rf node_modules dist templates/assistant/skills/*/scripts && npm ci && npm run build` exits 0 and the post-build `EXPECTED_WORKSPACE_SCHEMA_VERSION` smoke check passes.
- [ ] Step 2 (no top-level `skills/`): `test ! -e skills` exits 0.
- [ ] Step 3 (built tree complete): every authored file moved by Task 1 is present, and every `.cjs` declared by `SKILL_ENTRYPOINTS` in `scripts/build-skills.cjs` exists at `templates/assistant/skills/<skill>/scripts/<out>`.
- [ ] Step 4 (git status): no `templates/assistant/skills/*/scripts/` path appears as untracked or modified after the build.
- [ ] Step 5 (`plugin.json` validation): `jq` confirms every `.skills[]` entry starts with `./templates/assistant/skills/` and points to a directory containing a `SKILL.md`; `.name` is a non-empty string.
- [ ] Step 6 (`npm pack --dry-run`): the listed tarball contents include every authored file under `templates/assistant/skills/<name>/` and every freshly built `templates/assistant/skills/<name>/scripts/*.cjs`; no path under a top-level `skills/` appears.
- [ ] Step 7 (init regression): `node dist/cli.js init --assistants claude,gemini,opencode,codex --destination-directory /tmp/plan76-init-check` succeeds and populates the four assistant directories plus `.ai/task-manager/`; no error references `templates/assistant/skills/`.
- [ ] Step 8 (installer simulation): a local `npx skills add` invocation against the built repo discovers all six declared skills and copies their content into the scratch directory.
- [ ] Step 9 (workflow simulation): on a throwaway local tag, the staging command from the updated workflow stages exactly the expected set of `.cjs` paths.
- [ ] Step 10 (AGENTS.md cross-check): every example command shown in the rewritten "Skills Layer", "Build pipeline", "Distribution", and "GitHub Releases" sections, when run, produces output matching the prose around it.

All ten outcomes are reported, with PASS/FAIL and a one-line note for each. Any FAIL must be remediated before this task is marked completed.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Run from a clean checkout state when possible. If verifying in-place, snapshot `git status` before and after each step so noise is detectable.
- Step 8 (installer simulation) requires network/npx access. If the environment cannot run `npx skills add`, document the limitation and run a fallback: `node -e "console.log(JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')).skills.map(p => ({path: p, exists: require('fs').existsSync(p + '/SKILL.md')})))"` and confirm every entry is `exists: true`.
- Step 9 (workflow simulation) does NOT need to push a real tag. Run only the local pieces:
  ```bash
  git tag v0.0.0-plan76-test
  git add -f templates/assistant/skills/*/scripts/
  git diff --cached --stat
  git reset
  git tag -d v0.0.0-plan76-test
  ```
  Confirm the staged paths match the expected set, then unstage and delete the throwaway tag.

## Input Dependencies

All implementation tasks: Task 1 (migration), Task 2 (build script), Task 3 (configs), Task 4 (plugin manifest), Task 5 (docs).

## Output Artifacts

A verification report (in-conversation or attached to the PR) covering the 10 steps. No file artifact is required.

## Implementation Notes

<details>
<summary>Step-by-step commands</summary>

```bash
# Step 1: clean build
rm -rf node_modules dist
find templates/assistant/skills -type d -name scripts -exec rm -rf {} + 2>/dev/null
npm ci
npm run build
echo "exit=$?"

# Step 2
test ! -e skills && echo "PASS: no top-level skills/" || echo "FAIL: skills/ exists"

# Step 3
find templates/assistant/skills -type f | sort
# Compare against `git ls-files templates/assistant/skills/` (authored) plus the
# expected `.cjs` set derivable from SKILL_ENTRYPOINTS in scripts/build-skills.cjs.

# Step 4
git status --short templates/assistant/skills/
# expect: no output

# Step 5
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'))" && echo "valid JSON"
jq -r '.name' .claude-plugin/plugin.json
jq -r '.skills[]' .claude-plugin/plugin.json | while read -r p; do
  case "$p" in ./templates/assistant/skills/*) ;;
    *) echo "FAIL prefix: $p"; exit 1;; esac
  test -f "${p}/SKILL.md" || { echo "FAIL no SKILL.md: $p"; exit 1; }
done && echo "PASS plugin.json"

# Step 6
npm pack --dry-run 2>&1 | tee /tmp/pack.out
grep -E 'templates/assistant/skills/' /tmp/pack.out | head
grep -E '^npm notice [0-9.]+kB +skills/' /tmp/pack.out
# the first grep should list files; the second should produce no output.

# Step 7
rm -rf /tmp/plan76-init-check
node dist/cli.js init --assistants claude,gemini,opencode,codex --destination-directory /tmp/plan76-init-check
ls /tmp/plan76-init-check
ls /tmp/plan76-init-check/.ai/task-manager/

# Step 8 (preferred)
# Run against a local file source if the installer supports it; otherwise
# use the fallback below.
node -e "const m=JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'));console.log(m.skills.map(p=>({path:p,exists:require('fs').existsSync(p+'/SKILL.md')})))"

# Step 9
git tag v0.0.0-plan76-test
git add -f templates/assistant/skills/*/scripts/
git diff --cached --stat
git reset
git tag -d v0.0.0-plan76-test

# Step 10
# Open AGENTS.md and re-run any command shown in the four rewritten sections.
# Confirm output matches prose. Spot-check at least:
grep -n 'templates/assistant/skills' AGENTS.md | head
```

</details>

<details>
<summary>Reporting format</summary>

Produce a 10-line summary, one line per step:

```
Step 1 (clean build): PASS — exit 0, smoke check OK.
Step 2 (no skills/): PASS.
Step 3 (built tree): PASS — 6 SKILL.md + N .cjs files match SKILL_ENTRYPOINTS.
Step 4 (git status): PASS — no untracked under templates/assistant/skills/scripts.
Step 5 (plugin.json): PASS — 6 entries, all paths exist with SKILL.md.
Step 6 (npm pack): PASS — templates/assistant/skills/ listed, no top-level skills/.
Step 7 (init): PASS — 4 assistant dirs + .ai/task-manager populated.
Step 8 (installer): PASS — all 6 declared paths resolve (fallback used: <yes/no>).
Step 9 (workflow): PASS — N .cjs paths staged.
Step 10 (AGENTS.md): PASS — examples checked: <list>.
```

Any FAIL must include the diagnostic output and a pointer to the responsible task to fix.

</details>
