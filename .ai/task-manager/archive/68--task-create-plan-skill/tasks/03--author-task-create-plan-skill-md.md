---
id: 3
group: "skill-artifact"
dependencies: [1]
status: "completed"
created: "2026-05-14"
skills:
  - markdown
---
# Author SKILL.md for the task-create-plan Agent Skill

## Objective
Create the authored content of the `task-create-plan` Agent Skill at `templates/skills/task-create-plan/SKILL.md`. The skill must be standards-compliant per the Agent Skills specification: a single flat directory, valid frontmatter whose `name` matches the directory, a plan-creation-specific description, and prose instructions that drive the create-plan workflow by orchestrating the bundled scripts produced by the build pipeline. The skill must be assistant-agnostic — no `$ARGUMENTS`, no slash-command syntax, no per-assistant placeholders.

## Skills Required
- `markdown`: author a Markdown document with YAML frontmatter following the Agent Skills spec, with clear, non-interactive operational prose.

## Acceptance Criteria
- [ ] File exists at `templates/skills/task-create-plan/SKILL.md`.
- [ ] Frontmatter contains at least `name: task-create-plan` (matching the directory) and a `description` specific to plan creation for this task-manager (specific enough to trigger only on plan-creation requests, not generic task work).
- [ ] Skill name uses lowercase letters, numbers, and hyphens only; the directory is flat (no nested skill directories underneath).
- [ ] Prose instructions adapt the contract of the existing `templates/assistant/commands/tasks/create-plan.md` command: discover `.ai/task-manager`, read `config/TASK_MANAGER.md`, execute `PRE_PLAN.md` and `POST_PLAN.md` hooks, gather clarifications, allocate the next plan ID via the bundled next-plan-id script, write the plan into `plans/{padded-id}--{slug}/plan-{padded-id}--{slug}.html` conforming to `config/templates/PLAN_TEMPLATE.html`, and finish with a structured `Plan Summary` block.
- [ ] All script invocations reference bundled scripts by paths **relative to the skill root** (e.g. `scripts/find-task-manager-root.cjs`, `scripts/get-next-plan-id.cjs`). No absolute paths. No references to `templates/ai-task-manager/config/scripts/`.
- [ ] No assistant-specific syntax appears: no `$ARGUMENTS`, no `$1`, no `{{args}}`, no `/tasks:` prefixes, no Codex/Cursor/Gemini-specific blocks.
- [ ] If supplementary reference material is split out (e.g. a plan-format reminder), it lives under `templates/skills/task-create-plan/references/` and is referenced from `SKILL.md` by relative path; otherwise omit `references/` entirely.
- [ ] No `scripts/` content is authored by this task — `scripts/` is produced by the build pipeline (task 2). The skill directory may be otherwise empty besides `SKILL.md` (and `references/` if used).

## Technical Requirements
- Markdown with YAML frontmatter following the Agent Skills spec.
- Reference points for the create-plan contract: the existing command at `templates/assistant/commands/tasks/create-plan.md`, the plan template at `templates/ai-task-manager/config/templates/PLAN_TEMPLATE.html`, and the PRE/POST hooks under `templates/ai-task-manager/config/hooks/`.
- The skill must NOT depend on any file outside its own directory at runtime — its only external reads are the user's `.ai/task-manager` tree, which it locates via its own bundled `find-task-manager-root` script.

## Input Dependencies
- Task 1: TypeScript entrypoint names determine the bundled script filenames the SKILL.md will reference. (The actual `.cjs` files are produced by task 2 at build time, but the names are decided in task 1.)

## Output Artifacts
- `templates/skills/task-create-plan/SKILL.md`
- Optionally: `templates/skills/task-create-plan/references/*.md` if progressive-disclosure material is split out.

## Implementation Notes

<details>
<summary>Step-by-step implementation guidance</summary>

1. **Read the existing command** at `templates/assistant/commands/tasks/create-plan.md` to understand the exact workflow contract: hook invocation, clarification gathering, plan ID allocation, semantic HTML emission, structured `Plan Summary` block, and any guardrails (e.g. "do not invent answers", "do not skip clarifications").
2. **Read the Agent Skills documentation** (see Background section of the plan and the reference at `https://agentskills.io/home`) for the frontmatter shape, naming rules, and discovery model. Skills require a top-level `SKILL.md` with at least `name` and `description`.
3. **Create the directory**: `templates/skills/task-create-plan/`. Do NOT create `scripts/` — the build pipeline owns that subdirectory.
4. **Write `SKILL.md`** with frontmatter:
   ```yaml
   ---
   name: task-create-plan
   description: Create a new AI Task Manager plan for this repository — discovers the local .ai/task-manager root, runs the project's plan hooks, gathers clarifications, allocates the next plan ID, and writes a semantic HTML plan conforming to PLAN_TEMPLATE.html.
   ---
   ```
   Tune the description so it triggers only on requests that match plan creation for the AI Task Manager (not generic "make a plan" prose).
5. **Author the body** as a sequence of operational steps. Adapt directly from `create-plan.md`. Key guidelines:
   - Use neutral imperative prose ("Locate the task-manager root by running `scripts/find-task-manager-root.cjs` from the user's working directory…"). Avoid slash-command syntax.
   - Reference bundled scripts by relative paths only: `scripts/find-task-manager-root.cjs`, `scripts/get-next-plan-id.cjs`, etc.
   - State explicitly that the user's request supplies the work order and that the skill must not invent answers to clarifying questions — it should prompt the user.
   - Specify the exact output: a file at `<root>/plans/{padded-id}--{slug}/plan-{padded-id}--{slug}.html`, validated against `<root>/config/templates/PLAN_TEMPLATE.html`, ending with a `Plan Summary` block that includes the new plan ID and the absolute path of the new file.
   - Describe failure modes: missing `.ai/task-manager` root → instruct to stop and ask the user to run `init`; clarification refusal → mark as `needs-clarification` and stop.
6. **(Optional)** If the prose grows large or repeats the plan-template structure verbatim, split that section into `templates/skills/task-create-plan/references/plan-format.md` and reference it from `SKILL.md`. Only do this if it improves progressive disclosure; otherwise keep it inline.
7. **Verify**:
   - The directory has exactly `SKILL.md` (and `references/` if used). `scripts/` is absent until `npm run build` runs.
   - `grep` the new file for `$ARGUMENTS`, `$1`, `{{args}}`, `/tasks:`, `templates/ai-task-manager` — all must return zero matches.
   - The `name:` frontmatter value equals `task-create-plan` and equals the directory name.

</details>
