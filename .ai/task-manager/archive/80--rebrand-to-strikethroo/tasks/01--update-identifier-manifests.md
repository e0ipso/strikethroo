---
id: 1
group: "identifiers"
dependencies: []
status: "completed"
created: 2026-05-28
skills:
  - json
---
# Update identifier manifests (package.json, plugin.json)

## Objective
Establish the canonical Strikethroo identifiers in the two manifest files that gate every downstream artifact: `package.json` (npm package + CLI bin) and `.claude-plugin/plugin.json` (skills installer manifest).

## Skills Required
- json — surgical edits to two JSON manifests with no schema changes.

## Acceptance Criteria
- [ ] `package.json` `name` field is `"strikethroo"` (unscoped).
- [ ] `package.json` `bin` object has a single key `"strikethroo"` pointing at `dist/cli.js` (whatever the current entrypoint path is — keep it unchanged).
- [ ] `package.json` `repository`, `bugs`, and `homepage` URLs remain pointing at `e0ipso/ai-task-manager` (repo rename is out of scope per plan).
- [ ] `package.json` `version` is left untouched (semantic-release will bump it).
- [ ] `.claude-plugin/plugin.json` top-level `name` field is `"strikethroo"`.
- [ ] `.claude-plugin/plugin.json` `skills` array contains exactly six entries, all under `./templates/harness/skills/st-<name>` (the renamed paths: `st-create-plan`, `st-generate-tasks`, `st-execute-blueprint`, `st-execute-task`, `st-refine-plan`, `st-full-workflow`).
- [ ] `jq '.skills | length' .claude-plugin/plugin.json` prints `6`.
- [ ] Files remain valid JSON (`jq . <file>` exits zero on both).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Edit only the two named manifest files.
- Do not touch the semantic-release config (`.releaserc` or `release` block); the `templates/harness/skills/*/scripts/*.cjs` and `templates/harness/skills/*/SKILL.md` globs already match the renamed `st-*` directories because they use a wildcard segment.
- Do not change the `dist/cli.js` entrypoint path or move it; only the bin key name changes.

## Input Dependencies
- None. This task anchors the rest of the rebrand.

## Output Artifacts
- Updated `package.json` and `.claude-plugin/plugin.json` committed to the working tree.

## Implementation Notes
<details>
<summary>Execution detail</summary>

1. Read `/workspace/package.json`. Locate the top-level `name` field — currently something like `"@e0ipso/ai-task-manager"`. Replace with `"strikethroo"`.
2. Locate the `bin` object. It currently has one key `"ai-task-manager"` mapping to a path like `"dist/cli.js"`. Replace the key with `"strikethroo"` (keep the path value identical). If the structure is the shorthand form (`"bin": "dist/cli.js"`), rewrite it as `"bin": { "strikethroo": "dist/cli.js" }` so the CLI name is unambiguous.
3. Leave `repository.url`, `bugs.url`, and `homepage` untouched — the plan explicitly defers the GitHub slug rename.
4. Save `package.json`. Confirm with `jq . /workspace/package.json >/dev/null` (no output, exit 0).
5. Read `/workspace/.claude-plugin/plugin.json`. Update the top-level `name` field to `"strikethroo"`.
6. Update the `skills` array entries. The six current entries follow the pattern `"./templates/harness/skills/task-<rest>"`. Replace each with `"./templates/harness/skills/st-<rest>"`. The six expected final paths:
   - `./templates/harness/skills/st-create-plan`
   - `./templates/harness/skills/st-generate-tasks`
   - `./templates/harness/skills/st-execute-blueprint`
   - `./templates/harness/skills/st-execute-task`
   - `./templates/harness/skills/st-refine-plan`
   - `./templates/harness/skills/st-full-workflow`
7. Save `plugin.json`. Confirm with `jq . /workspace/.claude-plugin/plugin.json >/dev/null` and `jq '.skills | length' /workspace/.claude-plugin/plugin.json` (should print `6`).

The output directories that the manifest now references (`templates/harness/skills/st-*/`) do not yet exist in the working tree at the time this task runs. That is intentional and expected: they are emitted later by the build pipeline (task 03) once the source-of-truth directories have been renamed (task 02) and the SKILL_ENTRYPOINTS map has been updated. Do not pre-create them here.
</details>
