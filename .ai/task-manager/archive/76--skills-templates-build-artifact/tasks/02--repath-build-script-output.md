---
id: 2
group: "build"
dependencies: []
status: "completed"
created: "2026-05-21"
skills:
  - "js"
---

# Re-path `scripts/build-skills.cjs` output to `templates/assistant/skills/`

## Objective

Change the `SKILLS_ROOT` constant in `scripts/build-skills.cjs` from `path.join(REPO_ROOT, 'skills')` to `path.join(REPO_ROOT, 'templates', 'assistant', 'skills')` so esbuild emits each compiled `.cjs` bundle directly into `templates/assistant/skills/<name>/scripts/`. No other build logic changes; the `SKILL_ENTRYPOINTS` array, the `EXPECTED_WORKSPACE_SCHEMA_VERSION` `define` substitution, and the post-build smoke check are preserved verbatim.

## Skills Required

- `js` — editing a single CommonJS Node script.

## Acceptance Criteria

- [ ] `scripts/build-skills.cjs` resolves `SKILLS_ROOT` to `path.join(REPO_ROOT, 'templates', 'assistant', 'skills')`.
- [ ] The `SKILL_ENTRYPOINTS` array is unchanged.
- [ ] The `EXPECTED_WORKSPACE_SCHEMA_VERSION` substitution via esbuild `define` is unchanged.
- [ ] The post-build smoke check that fails if the literal `EXPECTED_WORKSPACE_SCHEMA_VERSION` survives in any bundle is unchanged.
- [ ] The header comment is updated so future readers do not look for outputs under a non-existent `skills/`.
- [ ] No other file is modified by this task.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- The change is localized to one constant assignment plus a doc comment refresh. Do not refactor.
- Do NOT add a copy pass. The plan explicitly excludes any "copy authored files" step — outputs and authored content already coexist at the same per-skill path.
- The build script writes to `path.join(SKILLS_ROOT, entry.skill, 'scripts', entry.out)`. After this task, that resolves to `templates/assistant/skills/<entry.skill>/scripts/<entry.out>` — exactly what the rest of the plan expects.

## Input Dependencies

None at the file-edit level. Running `npm run build` to verify the change is meaningful requires Task 1 to have moved authored content (so the build doesn't recreate a stray `skills/` tree), but the edit itself is independent.

## Output Artifacts

- Updated `scripts/build-skills.cjs` that targets the new output base path.

## Implementation Notes

<details>
<summary>The edit</summary>

In `scripts/build-skills.cjs`, replace:

```js
const SKILLS_ROOT = path.join(REPO_ROOT, 'skills');
```

with:

```js
const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'assistant', 'skills');
```

Also update the file's leading JSDoc comment. The current text reads:

```
* Bundles each TypeScript entrypoint under src/skill-scripts/ into a
* self-contained .cjs file inside the corresponding skill directory.
*
* To add a future skill: add a TypeScript entrypoint under
* src/skill-scripts/, register it in SKILL_ENTRYPOINTS below, and
* `npm run build` will produce the bundled .cjs alongside the skill.
```

Update the second paragraph so future readers know where bundles land:

```
* To add a future skill: add a TypeScript entrypoint under
* src/skill-scripts/, register it in SKILL_ENTRYPOINTS below, and
* `npm run build` will produce the bundled .cjs under
* templates/assistant/skills/<skill>/scripts/.
```

Leave the smoke-check block, the `nodeTarget` derivation, the `buildAll` flow, and the catch-and-exit at the bottom exactly as they are.

</details>

<details>
<summary>Sanity check after the edit (optional but recommended)</summary>

Once Task 1 is also complete, you can locally verify:

```bash
npm run build
find templates/assistant/skills -type d -name scripts
```

Expect: six `scripts` directories under `templates/assistant/skills/`, each containing the `.cjs` files declared in `SKILL_ENTRYPOINTS` for that skill. Note: `git status` will show those `.cjs` files as untracked until Task 3 re-paths the `.gitignore` rule — that's expected mid-migration and not a regression of this task.

</details>
