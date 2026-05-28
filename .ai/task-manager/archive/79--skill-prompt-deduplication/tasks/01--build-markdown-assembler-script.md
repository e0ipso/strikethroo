---
id: 1
group: "build-tooling"
dependencies: []
status: "completed"
created: "2026-05-26"
skills:
  - node-scripting
---
# Build the Markdown Assembler Script

## Objective

Create `scripts/build-skill-prompts.cjs`, a Node.js script that reads source templates from `src/skill-prompts/`, resolves `{{include}}` directives and `{{variable}}` substitutions, and writes assembled SKILL.md files to `templates/harness/skills/*/SKILL.md`.

## Skills Required

- **node-scripting**: File I/O, string processing, YAML frontmatter parsing, cycle detection

## Acceptance Criteria

- [ ] `scripts/build-skill-prompts.cjs` exists and runs with `node scripts/build-skill-prompts.cjs`
- [ ] Resolves `{{include sections/foo.md}}` directives by inlining the referenced file content (paths relative to `src/skill-prompts/`)
- [ ] Resolves `{{variable_name}}` placeholders using values defined under a `vars` key in the source template's YAML frontmatter
- [ ] Supports recursive includes with cycle detection and a max depth of 3
- [ ] Reads the `target` frontmatter field to determine the output path: `templates/harness/skills/<target>/SKILL.md`
- [ ] Strips `vars` and `target` fields from the output frontmatter, preserving only `name` and `description`
- [ ] Post-build validation: fails with a clear error if any `{{` directive remains unresolved in assembled output
- [ ] Post-build validation: fails if assembled output is missing `name` or `description` in frontmatter
- [ ] Post-build validation: fails if assembled output does not contain `## Operating Procedure`
- [ ] Prints a summary line per skill (e.g., `assembled task-create-plan/SKILL.md`) matching the style of `scripts/build-skills.cjs`
- [ ] Exits non-zero on any error (missing include file, unresolved variable, cycle detected, validation failure)

## Technical Requirements

- Standalone `.cjs` file using only Node.js built-ins (`fs`, `path`)
- No external dependencies — follows the pattern of `scripts/build-skills.cjs`
- Source templates live in `src/skill-prompts/*.md`; shared sections in `src/skill-prompts/sections/*.md`
- YAML frontmatter parsing: extract the block between `---` markers, parse `name`, `description`, `target`, and `vars` fields. A lightweight regex/split approach is fine — no need for a full YAML parser since the frontmatter is simple key-value with one nested map (`vars`)
- Include directive pattern: `{{include <relative-path>}}` on its own line
- Variable pattern: `{{<variable_name>}}` (alphanumeric + underscore)
- Distinguish between include directives (have the `include ` prefix) and variable references (no prefix) to avoid false matches
- If `{{` appears in prose that is NOT a directive (e.g., inside a code fence), it should NOT be treated as an error during validation. Limit the unresolved-directive check to occurrences outside of fenced code blocks (` ``` `)

## Input Dependencies

None — this task is independently executable. The script can be developed and tested with minimal fixture files before the real source templates exist.

## Output Artifacts

- `scripts/build-skill-prompts.cjs` — the assembler script, ready to be wired into the build pipeline (task 3)
- The script's contract: given `src/skill-prompts/*.md` source templates and `src/skill-prompts/sections/*.md` shared sections, it produces `templates/harness/skills/*/SKILL.md` assembled output

## Implementation Notes

<details>

### Script structure

```
1. Glob src/skill-prompts/*.md (top-level only, not sections/)
2. For each source template:
   a. Read the file
   b. Parse YAML frontmatter → extract name, description, target, vars
   c. Process body: resolve includes recursively, then substitute variables
   d. Reassemble frontmatter (name + description only) + processed body
   e. Write to templates/harness/skills/<target>/SKILL.md
   f. Run validation assertions on the output
   g. Print summary line
3. Exit 0 on success, non-zero on any failure
```

### Frontmatter parsing

Split on `---` to extract the frontmatter block. Parse it line-by-line:
- Top-level keys: `name: "value"`, `description: "value"`, `target: value`
- Nested `vars:` block: subsequent indented lines are `key: "value"` pairs

Output frontmatter contains only `name` and `description`.

### Include resolution

```javascript
function resolveIncludes(content, basePath, depth = 0, seen = new Set()) {
  if (depth > 3) throw new Error('Max include depth exceeded');
  return content.replace(/^\{\{include (.+?)\}\}$/gm, (match, relPath) => {
    const absPath = path.resolve(basePath, relPath);
    if (seen.has(absPath)) throw new Error(`Cycle detected: ${absPath}`);
    seen.add(absPath);
    const included = fs.readFileSync(absPath, 'utf8');
    return resolveIncludes(included, path.dirname(absPath), depth + 1, new Set(seen));
  });
}
```

The `basePath` for top-level templates is `src/skill-prompts/`. For included files, it's the directory of the including file.

### Variable substitution

After include resolution, replace `{{var_name}}` with values from the `vars` map. Iterate the vars keys and do a global replace. Any `{{...}}` remaining after substitution that is NOT inside a fenced code block is an error.

### Validation

For the "no unresolved directives" check, strip fenced code blocks (` ```...``` `) from the output before scanning for `{{`. This avoids false positives from Mustache-style examples or template syntax shown in prose.

### Reference

Study `scripts/build-skills.cjs` for the project's conventions around build scripts: console output style, error handling, exit codes.

</details>
