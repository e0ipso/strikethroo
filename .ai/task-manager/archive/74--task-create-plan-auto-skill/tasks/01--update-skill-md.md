---
id: 1
group: skill-extension
dependencies: []
status: completed
created: '2026-05-19'
skills:
  - markdown
---

# Update SKILL.md with Autonomous Clarification Mode

## Objective

Restructure Step 4 (Clarification loop) in `templates/skills/task-create-plan/SKILL.md` to cover both Interactive Clarification and Autonomous Clarification modes, following the plan-71 consolidation pattern. Both branches must converge back to Step 5 so that Steps 1–3 and 5–8 remain unchanged.

## Skills Required

- **markdown**: Editing structured skill prose while preserving exact formatting, frontmatter, and output contracts.

## Acceptance Criteria

- [ ] Step 4 is replaced with a branching stage that contains two clearly labeled subsections: **Interactive Clarification** and **Autonomous Clarification**.
- [ ] **Interactive Clarification** subsection preserves the existing prose: identify missing context, ask the user targeted questions, loop until resolved, confirm backwards compatibility requirements, never invent answers.
- [ ] **Autonomous Clarification** subsection is new prose: identify missing context, resolve each gap by inspecting the codebase, documentation, README files, assistant documents (CLAUDE.md, GEMINI.md, AGENTS.md), configuration files, and project context; for unresolvable gaps, document best-effort assumptions in the Plan Clarifications table with clear rationale; do NOT ask the user any questions; do NOT wait for user input.
- [ ] A **mode selection rule** precedes the two subsections and mirrors the rule in `templates/skills/task-refine-plan/SKILL.md`: default to Interactive; switch to Autonomous only when the trigger is unambiguous (explicit keyword such as "auto"/"autonomous"/"non-interactive"/"without asking me", upstream orchestrator declaration, or `/tasks:create-plan-auto` slash command invocation); treat ambiguity as a vote for Interactive.
- [ ] Both branches explicitly converge back to Step 5 (Allocate the next plan ID).
- [ ] The skill frontmatter description is broadened to mention autonomous plan creation without losing specificity.
- [ ] Steps 1–3 and 5–8 remain completely untouched except for any necessary cross-references to the renamed Step 4.
- [ ] No changes are made to any file under `templates/assistant/commands/`, `src/skill-scripts/`, or `scripts/build-skills.cjs`.

## Technical Requirements

- The existing SKILL.md contract must be preserved: all existing rules about root discovery, hook execution, plan ID allocation, plan emission conforming to `PLAN_TEMPLATE.html`, post-plan hook, and structured summary remain in force.
- The autonomous branch must explicitly list inspection targets (codebase, docs, README, assistant documents, config files) so the assistant knows what to examine.
- The skill description in the frontmatter should read something like: "Create a new AI Task Manager plan for this repository, in either interactive or autonomous mode. Use when the user asks to draft, plan, or scope a new task-manager plan — discovers the local .ai/task-manager root, runs the project's plan hooks, gathers clarifications (interactively or autonomously), allocates the next plan ID, and writes a semantic HTML plan conforming to PLAN_TEMPLATE.html."

## Input Dependencies

- Plan 74 document (source of requirements and plan-71 pattern reference).
- Current `templates/skills/task-create-plan/SKILL.md`.

## Output Artifacts

- Modified `templates/skills/task-create-plan/SKILL.md` with expanded Step 4 and updated frontmatter description.

## Implementation Notes

<details>
<summary>Click to expand detailed instructions for the non-thinking executor</summary>

1. Open `templates/skills/task-create-plan/SKILL.md`.
2. In the frontmatter, update the `description` field to encompass both interactive and autonomous plan creation. Keep it concise but explicit.
3. Locate Step 4 "Clarification loop" (currently lines 52–60).
4. Replace the entire Step 4 section with the following structure, preserving the existing Step numbering:

   ```markdown
   ### 4. Clarification stage

   **Default to Interactive Mode.** Only switch to Autonomous Mode when the
   trigger is unambiguous and beyond reasonable doubt. Treat ambiguity as a
   vote for Interactive: asking a question the user cannot answer is
   recoverable; making silent assumptions when the user expected to be
   consulted is not.

   Switch to Autonomous Mode only if at least one of the following holds
   without interpretation:

   - The user's request contains an explicit, unambiguous mode keyword such
     as "auto", "autonomous", "non-interactive", "without asking me",
     "don't ask", or equivalent phrasing that names the mode by intent.
   - An upstream orchestrator (for example the `task-full-workflow` skill)
     has declared autonomous operation for this invocation in the prompt
     passed to this skill.
   - The invocation is the `/tasks:create-plan-auto` slash command (the
     `-auto` suffix is itself the unambiguous selector).

   If none of the above holds, use Interactive Mode even when the user's
   presence is uncertain. Do not infer autonomous mode from indirect signals
   such as terse prompts, scripted-looking input, or absence of recent user
   messages.

   #### Interactive Mode

   If any critical context is missing, ask the user targeted questions. Keep
   looping until you have no further questions. Explicitly confirm whether
   backwards compatibility is required. Never invent answers; never paper over
   a missing answer.

   If the user declines to clarify a blocking question, stop and report the
   plan as needing clarification. Do not produce a plan.

   #### Autonomous Mode

   Identify missing context by analyzing the work order against the codebase,
   documentation, README files, assistant documents (CLAUDE.md, GEMINI.md,
   AGENTS.md), configuration files, and project context.

   Resolve each gap by inspecting the listed sources exhaustively. For any gap
   that cannot be resolved through inspection, document a best-effort assumption
   in the Plan Clarifications table, including the rationale and confidence
   level. Do NOT ask the user any questions. Do NOT wait for user input.

   If a blocking question cannot be resolved and no reasonable assumption can
   be made, stop and report the plan as needing clarification.
   ```

5. Verify that Steps 1–3 and 5–8 are unchanged.
6. Ensure the file ends with a single newline and has no trailing spaces.
7. Do not modify any other file.
</details>
