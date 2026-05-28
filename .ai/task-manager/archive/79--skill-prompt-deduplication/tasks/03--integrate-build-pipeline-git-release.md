---
id: 3
group: "integration"
dependencies: [1, 2]
status: "completed"
created: "2026-05-26"
skills:
  - build-tooling
  - ci-cd-config
---
# Integrate into Build Pipeline, Git, and Release

## Objective

Wire the assembler script into the project's build pipeline, configure git to ignore generated SKILL.md on main, configure semantic-release to force-add them in release commits, and verify the end-to-end build produces semantically equivalent output.

## Skills Required

- **build-tooling**: npm scripts, build pipeline orchestration
- **ci-cd-config**: `.gitignore` rules, semantic-release asset configuration

## Acceptance Criteria

- [ ] `npm run build` executes the assembler and produces all 6 SKILL.md files in `templates/harness/skills/*/`
- [ ] A new `build:skill-prompts` npm script exists and is called as part of the build chain
- [ ] `.gitignore` contains a rule ignoring `templates/harness/skills/*/SKILL.md`
- [ ] `.releaserc` `@semantic-release/git` assets array includes `templates/harness/skills/*/SKILL.md`
- [ ] `npm run build` completes without errors (assembler validation passes)
- [ ] `npm test` passes with no regressions
- [ ] `npm pack --dry-run` output includes all 6 `templates/harness/skills/*/SKILL.md` files
- [ ] For each skill, the assembled SKILL.md is semantically equivalent to the current version (diff review)

## Technical Requirements

### package.json changes

Current build scripts:
```json
"build": "tsc && npm run build:skills",
"build:skills": "tsc --noEmit -p tsconfig.skill-scripts.json && node scripts/build-skills.cjs"
```

Add a `build:skill-prompts` script and wire it into the build chain:
```json
"build:skill-prompts": "node scripts/build-skill-prompts.cjs",
"build:skills": "tsc --noEmit -p tsconfig.skill-scripts.json && node scripts/build-skills.cjs && npm run build:skill-prompts"
```

Or alternatively, run it as a parallel step. The key constraint: the assembler must run during `npm run build`.

### .gitignore changes

Add this line alongside the existing `templates/harness/skills/*/scripts/` rule:
```
templates/harness/skills/*/SKILL.md
```

After adding this rule, the current hand-authored SKILL.md files will show as deleted in git status. This is expected — they become build output.

### .releaserc changes

Current `@semantic-release/git` assets:
```json
["CHANGELOG.md", "package.json", "package-lock.json", "templates/harness/skills/*/scripts/*.cjs"]
```

Add the SKILL.md glob:
```json
["CHANGELOG.md", "package.json", "package-lock.json", "templates/harness/skills/*/scripts/*.cjs", "templates/harness/skills/*/SKILL.md"]
```

### Verification steps

1. Run `npm run build` — must complete with zero errors
2. Run `npm test` — must pass with no regressions
3. Run `npm pack --dry-run` — verify all 6 SKILL.md files appear in the package
4. For each skill, diff the assembled output against the git HEAD version: `git diff HEAD -- templates/harness/skills/*/SKILL.md`. Differences should be limited to formatting; semantic content must be equivalent.
5. Grep assembled output for unresolved directives: `grep -r '{{' templates/harness/skills/*/SKILL.md` — should only match content inside fenced code blocks (if any)

## Input Dependencies

- Task 1: `scripts/build-skill-prompts.cjs` must exist and be functional
- Task 2: `src/skill-prompts/` source templates and sections must exist

## Output Artifacts

- Updated `package.json` (build scripts)
- Updated `.gitignore`
- Updated `.releaserc`
- 6 assembled SKILL.md files in `templates/harness/skills/*/` (now build output, not source)

## Implementation Notes

<details>

### Order of operations

1. Update `package.json` to add `build:skill-prompts` and wire it into the build chain
2. Run `npm run build` to generate the SKILL.md files — verify output
3. Diff each assembled SKILL.md against the current git version. Fix any semantic differences by adjusting source templates (task 2 artifacts) or the assembler (task 1 artifact)
4. Once output is verified, update `.gitignore` to ignore generated SKILL.md files
5. Update `.releaserc` to include SKILL.md in release assets
6. Run `npm test` to confirm no regressions
7. Run `npm pack --dry-run` to confirm packaging

### Handling the git transition

When `.gitignore` is updated, git will consider the existing tracked SKILL.md files as deleted. This is the intended behavior — from this point forward, SKILL.md files are build output. The release workflow's `git add --force` ensures they appear in tagged releases.

To verify this works correctly: after updating `.gitignore`, run `git status` and confirm the 6 SKILL.md files show as deleted. Then run `npm run build` and confirm they're regenerated (but still ignored by git). This matches exactly how `.cjs` bundles work today.

</details>
