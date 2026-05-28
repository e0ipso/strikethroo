---
id: 2
group: "content-extraction"
dependencies: []
status: "completed"
created: "2026-05-26"
skills:
  - markdown-content
complexity_score: 7
complexity_notes: "Requires side-by-side analysis of 6 SKILL.md files totaling 1281 lines, careful extraction of ~10 shared sections preserving semantic equivalence, and authoring 6 source templates including the complex task-full-workflow composition"
---
# Extract Shared Sections and Write Source Templates

## Objective

Analyze the 6 current SKILL.md files, extract shared procedural blocks into reusable section files under `src/skill-prompts/sections/`, and create 6 source templates in `src/skill-prompts/` that reference these sections via `{{include}}` directives and use `{{variable}}` substitution for per-skill parameterization.

## Skills Required

- **markdown-content**: Careful analysis of existing prose, extraction of canonical shared blocks, authoring of parameterized templates

## Acceptance Criteria

- [ ] `src/skill-prompts/sections/` contains shared section files, each referenced by at least 2 source templates
- [ ] `src/skill-prompts/` contains 6 source templates: `task-create-plan.md`, `task-generate-tasks.md`, `task-refine-plan.md`, `task-execute-blueprint.md`, `task-execute-task.md`, `task-full-workflow.md`
- [ ] Each source template has YAML frontmatter with `name`, `description`, `target`, and `vars` (where needed)
- [ ] Each source template uses `{{include sections/...}}` to reference shared blocks instead of duplicating them
- [ ] Variable substitution (`{{verb}}`, `{{action_noun}}`, etc.) handles per-skill wording differences
- [ ] When assembled by the assembler script (task 1), the output is semantically equivalent to the current SKILL.md files — an AI following either version would produce identical behavior
- [ ] The extraction criterion is applied: sections >100 words appearing in 2+ source templates are extracted; shorter or single-use content stays inline
- [ ] `task-full-workflow.md` source template composes its three phases from sections shared with the standalone skills, with only the orchestration glue (progress indicators, context passing, critical rule) remaining unique
- [ ] No shared section is a verbatim copy of only one skill's version — each section represents the canonical/best version reconciling minor differences across skills

## Technical Requirements

### Current SKILL.md files to analyze

| Skill | Path | Lines |
|---|---|---|
| task-create-plan | `templates/harness/skills/task-create-plan/SKILL.md` | 120 |
| task-execute-blueprint | `templates/harness/skills/task-execute-blueprint/SKILL.md` | 139 |
| task-execute-task | `templates/harness/skills/task-execute-task/SKILL.md` | 195 |
| task-full-workflow | `templates/harness/skills/task-full-workflow/SKILL.md` | 378 |
| task-generate-tasks | `templates/harness/skills/task-generate-tasks/SKILL.md` | 244 |
| task-refine-plan | `templates/harness/skills/task-refine-plan/SKILL.md` | 205 |

### Shared blocks identified in the plan

These are the blocks duplicated across skills (from plan analysis). Extract each as a section file:

1. **root-discovery.md** (~100 words, 6 copies) — "Run find-task-manager-root.cjs..." Identical except for one verb.
2. **plan-resolution.md** (~120 words, 4 copies) — "Run validate-plan-blueprint.cjs..." Identical.
3. **phase-execution-loop.md** (~400 words, 2 copies) — PRE_PHASE -> dispatch -> verify -> POST_PHASE. 90% identical.
4. **task-minimization.md** (~300 words, 2 copies) — Minimization principles + antipatterns. 95% identical.
5. **test-philosophy.md** (~200 words, 2 copies) — "Write a few tests, mostly integration". 95% identical.
6. **post-execution-archive.md** (~200 words, 2 copies) — POST_EXECUTION + summary + archive. 95% identical.
7. **dependency-analysis.md** (~80 words, 2 copies) — Hard/soft dependency identification. Identical.
8. **task-id-allocation.md** (~100 words, 2 copies) — get-next-task-id.cjs usage. 98% identical.
9. **granularity-skill-rules.md** — Single-purpose, atomic, skill-specific, verifiable task rules.
10. **task-file-output.md** — Emit task files with frontmatter spec.
11. **validation-checklist.md** — Pre-completion validation list for task generation.

Evaluate during extraction whether all 11 meet the >100 words / 2+ templates threshold. Drop or merge sections that don't qualify.

### Source template structure

Each source template follows this pattern:

```markdown
---
name: <skill-name>
description: "<skill description from current SKILL.md>"
target: <skill-directory-name>
vars:
  verb: "<per-skill verb>"
  action_noun: "<per-skill noun>"
---

# <skill-name>

<Unique preamble for this skill>

## Inputs

<Unique input description>

## Operating Procedure

### 1. Locate the task-manager root

{{include sections/root-discovery.md}}

### 2. <Next step>
...
```

### Variable usage

Where two skills share a section but differ by a word or phrase, parameterize with variables rather than duplicating the section. For example, root-discovery might use `{{verb}}` to say "before continuing with {{verb}}" where the verb differs per skill.

Keep variable count minimal — only introduce variables when the alternative is duplicating an entire section for a one-word difference.

## Input Dependencies

None — this task requires only reading the current SKILL.md files, which are in the repository.

## Output Artifacts

- `src/skill-prompts/sections/*.md` — shared section files (estimated ~8-11 files)
- `src/skill-prompts/*.md` — 6 source template files
- These files are consumed by the assembler script (task 1) to produce the final SKILL.md output

## Implementation Notes

<details>

### Recommended workflow

1. Read all 6 current SKILL.md files into working memory
2. Identify the shared blocks listed above by comparing corresponding sections across skills
3. For each shared block, choose the best/most complete version as the canonical source. Note where skills differ and determine if the difference can be parameterized via variables or if it requires skill-specific inline content
4. Create section files in `src/skill-prompts/sections/`
5. Create the 5 simpler source templates first (task-create-plan, task-generate-tasks, task-refine-plan, task-execute-blueprint, task-execute-task)
6. Create `task-full-workflow.md` last — it composes from the standalone skills' sections and adds the orchestration glue

### Handling the 5-10% differences in "95% identical" blocks

When blocks are 95% identical, the differences typically fall into these categories:

- **Verb/noun changes** ("create a plan" vs "generate tasks") → use `{{variable}}` substitution
- **Extra sentence in one skill** → if the sentence is meaningful and doesn't contradict other skills, include it in the canonical section. If it's truly skill-specific, keep it inline in the source template before/after the `{{include}}` directive
- **Different ordering of bullet points** → standardize on the most logical order

### task-full-workflow composition strategy

task-full-workflow's 378 lines break down into:
- ~50 lines unique orchestration (preamble, context passing, progress indicators, critical rule)
- ~330 lines from the three standalone skills (plan creation, task generation, blueprint execution)

The source template should import the shared sections directly. The orchestration glue between phases stays inline.

### Semantic equivalence verification

After creating all files, you can manually verify by mentally assembling each template (or waiting for the assembler from task 1) and comparing the result against the current SKILL.md. The key question: "Would an AI assistant following the assembled version produce different behavior than one following the current version?" If no, the extraction is correct.

</details>
