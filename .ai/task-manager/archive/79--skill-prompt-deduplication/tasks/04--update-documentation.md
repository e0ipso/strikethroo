---
id: 4
group: "documentation"
dependencies: [1, 2, 3]
status: "completed"
created: "2026-05-26"
skills:
  - documentation
---
# Update Documentation

## Objective

Create a README for the new `src/skill-prompts/` directory and update the AGENTS.md file to document that SKILL.md files are now build outputs assembled from source templates.

## Skills Required

- **documentation**: Technical writing, updating existing docs to reflect architectural changes

## Acceptance Criteria

- [ ] `src/skill-prompts/README.md` exists and explains: the composition system, how to edit skill prompts, how to add new sections, and how the build pipeline produces SKILL.md files
- [ ] AGENTS.md "Skills Layer" section is updated to document that SKILL.md files are build output from `src/skill-prompts/`
- [ ] AGENTS.md "Build pipeline" section is updated to include the `build:skill-prompts` step
- [ ] Documentation is accurate relative to the actual implementation from tasks 1-3
- [ ] No stale references to hand-authored SKILL.md files remain in AGENTS.md

## Technical Requirements

### src/skill-prompts/README.md

Brief document (~30-50 lines) covering:
- What the directory contains (source templates + shared sections)
- How the composition system works (includes + variables)
- How to edit an existing skill's prompt
- How to add a new shared section
- How to add a new skill template
- How the build pipeline produces the final SKILL.md files
- Reference to the assembler script (`scripts/build-skill-prompts.cjs`)

### AGENTS.md updates

Two sections need updates:

1. **Skills Layer** (around line starting with "The repository ships Agent Skills..."): Add that SKILL.md files are now build outputs assembled from `src/skill-prompts/`, parallel to how `.cjs` bundles are built from `src/skill-scripts/`. Mention the source template → assembled output flow.

2. **Build pipeline** (around "npm run build runs..."): Add the `build:skill-prompts` step to the documented build chain. Describe what the assembler does at a high level (resolve includes + variables, validate output).

3. **Git strategy**: Update any references to SKILL.md tracking to note they're now git-ignored on main and force-added in releases, same as `.cjs` bundles.

## Input Dependencies

- Tasks 1-3 must be complete so documentation reflects the actual implementation

## Output Artifacts

- `src/skill-prompts/README.md`
- Updated `AGENTS.md`

## Implementation Notes

<details>

### Keep it brief

The README should be concise and practical. Developers already understand the `.cjs` bundle pattern — frame the SKILL.md composition as "the same idea, but for prompt content instead of runtime scripts."

### AGENTS.md diff should be small

The existing AGENTS.md documentation is thorough. The update is additive — mention the new source directory and build step alongside the existing `.cjs` pipeline documentation. Don't restructure the existing content.

### Verify accuracy

Before writing documentation, read the actual implementation:
- `scripts/build-skill-prompts.cjs` — to accurately describe the assembler's behavior
- `package.json` — to accurately describe the build scripts
- `src/skill-prompts/` directory — to accurately describe the file layout
- `.gitignore` and `.releaserc` — to accurately describe the git/release strategy

</details>
