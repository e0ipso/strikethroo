---
id: 4
group: "discovery"
dependencies: []
status: "completed"
created: "2026-05-21"
skills:
  - "json"
---

# Add `.claude-plugin/plugin.json` declaring all skill paths

## Objective

Create a new file `.claude-plugin/plugin.json` at the repo root that declares every skill path under `templates/assistant/skills/`. This is the documented discovery contract the `vercel-labs/skills` installer uses (per `src/plugin-manifest.ts` in that repo) to find skills when there is no top-level `skills/` directory.

## Skills Required

- `json` — authoring a JSON file conforming to the installer's manifest schema.

## Acceptance Criteria

- [ ] `.claude-plugin/plugin.json` exists at the repo root.
- [ ] The file is valid JSON.
- [ ] The top-level `name` field is present and non-empty (string).
- [ ] The top-level `skills` field is an array.
- [ ] Every entry in `skills` is a string starting with `./` (the installer's `isValidRelativePath` requires this).
- [ ] Every entry in `skills` points to an existing directory under `templates/assistant/skills/` that contains a `SKILL.md`.
- [ ] All six skills are declared: `task-create-plan`, `task-execute-blueprint`, `task-execute-task`, `task-full-workflow`, `task-generate-tasks`, `task-refine-plan`.
- [ ] No other field is included (keep the manifest minimal until a need arises).

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- The installer reads the *parent directory* of each entry and adds it to its priority list, then enumerates children with a `SKILL.md`. In practice, a single entry would be enough to find all sibling skills under `templates/assistant/skills/`. The plan still lists every skill explicitly for documentation value — readers of `plugin.json` get an inventory of what ships.
- `./` prefix is mandatory. Entries like `templates/assistant/skills/task-create-plan` (without `./`) will be silently rejected by `isValidRelativePath`.
- The `name` field is surfaced by the installer as a plugin-grouping label visible to end users. Use `"ai-task-manager"` to match the npm package name (without the scope), or a more user-friendly variant — see implementation notes.

## Input Dependencies

None at file-creation time. Acceptance criterion about directories existing is fulfilled by Task 1.

## Output Artifacts

- `.claude-plugin/plugin.json` declaring all six skill paths.

## Implementation Notes

<details>
<summary>The file contents</summary>

Create `.claude-plugin/plugin.json` with this content:

```json
{
  "name": "ai-task-manager",
  "skills": [
    "./templates/assistant/skills/task-create-plan",
    "./templates/assistant/skills/task-execute-blueprint",
    "./templates/assistant/skills/task-execute-task",
    "./templates/assistant/skills/task-full-workflow",
    "./templates/assistant/skills/task-generate-tasks",
    "./templates/assistant/skills/task-refine-plan"
  ]
}
```

End the file with a single trailing newline (matches the repo's convention for tracked text files).

The `.claude-plugin/` directory is new at the repo root and exists solely to hold this manifest. No other files belong here for the scope of this plan.

</details>

<details>
<summary>Choosing the `name` value</summary>

The `vercel-labs/skills` installer surfaces this name as a grouping label in its output. Options:

- `"ai-task-manager"` — matches the npm package name (sans `@e0ipso/` scope). Recommended for symmetry with how users invoke the installer (`npx skills add e0ipso/ai-task-manager`).
- `"e0ipso-ai-task-manager"` — includes the publisher prefix; verbose but unambiguous.
- `"AI Task Manager"` — display-friendly; differs from the npm name.

Pick `"ai-task-manager"` unless a clear reason to deviate exists. The schema does not constrain the value beyond "non-empty string."

</details>

<details>
<summary>Verification commands (run after this task plus Task 1)</summary>

```bash
# JSON validity
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'))"

# Required fields
jq '.name' .claude-plugin/plugin.json                 # expect: a non-empty quoted string
jq '.skills | length' .claude-plugin/plugin.json      # expect: 6

# Every entry has ./ prefix and points to an existing directory with SKILL.md
jq -r '.skills[]' .claude-plugin/plugin.json | while read -r p; do
  case "$p" in
    ./*) ;;
    *) echo "FAIL: missing ./ prefix: $p"; exit 1;;
  esac
  test -f "${p}/SKILL.md" || { echo "FAIL: missing SKILL.md at $p"; exit 1; }
done
echo OK
```

</details>

<details>
<summary>Why not `marketplace.json`?</summary>

The installer also reads `.claude-plugin/marketplace.json` for multi-plugin catalogs. This repo ships a single coherent set of skills, not a catalog — `plugin.json` is the right shape and is simpler to maintain.

</details>
