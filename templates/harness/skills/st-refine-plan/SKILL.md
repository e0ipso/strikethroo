---
name: st-refine-plan
description: Refine an existing Strikethroo plan in this repository. Use when the user asks to review, improve, interrogate, or update a specific plan ID — discovers the local .ai/strikethroo root, resolves the plan, runs the project's plan hooks, pressure-tests the document for gaps and contradictions, gathers clarifications interactively or autonomously, and updates the plan in-place while preserving its identity and structure. Do not use for creating new plans or for generic brainstorming outside Strikethroo.
---

# st-refine-plan

Drive the end-to-end refinement of an existing Strikethroo plan. The skill
is assistant-agnostic and self-contained: every script it invokes lives under
this skill's `scripts/` directory and is referenced by relative path.

## Inputs

The user supplies the numeric plan ID conversationally, along with any optional
refinement notes or constraints. Treat the plan ID as the only authoritative
source of intent. Do not invent answers to clarifying questions — prompt the
user instead.

## Operating Procedure

### 1. Locate the strikethroo root

Run `scripts/find-strikethroo-root.cjs` from the user's working directory.
The script walks up looking for `.ai/strikethroo/.init-metadata.json` and
prints the absolute path of the resolved root on success.

If the script exits non-zero, the working directory is not inside an
initialized strikethroo workspace. Stop and ask the user to run the project
initializer (e.g. `npx strikethroo init`) before continuing. Do
not attempt to refine a plan outside of a valid root.

For every subsequent step, treat the path printed by this script as `<root>`.

### 2. Resolve the plan

Run `scripts/validate-plan-blueprint.cjs <plan-id> planFile` to obtain the
absolute path of the plan file. The same script also accepts these field
names (single-field output mode) and exposes them on demand:

- `planDir` — absolute path of the plan directory
- `taskCount` — number of existing task files in that plan's `tasks/`
- `blueprintExists` — `yes` or `no`
- `taskManagerRoot` — absolute path of `<root>`
- `planId` — the resolved numeric plan ID

If the script exits non-zero, stop and ask the user to confirm the plan ID.
Do not guess a different ID.

### 3. Load project context

Read these files, in order:

- `<root>/config/STRIKETHROO.md` — directory conventions and project context.
- `<root>/config/hooks/PRE_PLAN.md` — execute the instructions it contains
  before proceeding.
- `<root>/config/templates/PLAN_TEMPLATE.md` — the structural baseline the
  refined plan must continue to conform to.

### 4. Baseline Review

Read the entire plan end-to-end. Without modifying the file:

1. Capture key metadata (plan title, summary, creation date, related initiatives).
2. Surface the strongest sections, contradictions, and potential risks.
3. Identify gaps using these lenses:
   - **Context gaps**: missing background, assumptions, competing priorities.
   - **Technical gaps**: underspecified architecture, unclear interfaces, missing diagrams.
   - **Risk gaps**: untracked risks, missing mitigations, hand-wavy success metrics.
   - **Scope issues**: gold-plating, ambiguous boundaries, requirements that
     contradict YAGNI.

Document each gap with `{section, issue, severity, proposed fix}` so you can
reference it when refining the plan.

### 5. Clarification Loop

**Default to Interactive Clarification.** Only switch to **Autonomous
Clarification** when the trigger is unambiguous and beyond reasonable doubt.
Treat ambiguity as a vote for Interactive: asking a question the user
cannot answer is recoverable; making silent assumptions when the user
expected to be consulted is not.

Switch to Autonomous Clarification only if at least one of the following
holds without interpretation:

- The user's request contains an explicit, unambiguous mode keyword such
  as "auto", "autonomous", "non-interactive", "without asking me", "don't
  ask", or equivalent phrasing that names the mode by intent.
- An upstream orchestrator (for example the `st-full-workflow` skill)
  has declared autonomous operation for this invocation in the prompt
  passed to this skill.
- The skill is invoked in auto mode (for example by the `st-full-workflow`
  orchestrator or by a caller that explicitly requests autonomous operation).

If none of the above holds, use Interactive Clarification even when the
user's presence is uncertain. Do not infer autonomous mode from indirect
signals such as terse prompts, scripted-looking input, or absence of
recent user messages.

After the clarification loop completes, append all new findings to the
"Plan Clarifications" section in the plan document using the existing format
(table with question/answer pairs). Mark the source of each entry
appropriately.

#### Interactive Clarification

Think harder before interrupting the user — only trigger this loop when you
can cite concrete uncertainties.

1. Review the gaps documented in the Baseline Review.
2. If no gaps remain, stop here and proceed to Stage 6.
3. Build a clarification packet grouped by theme.
4. Prefill each question with the most plausible answer so the user can
   confirm or deny quickly.
5. Always include an "Other / open-ended" option to capture nuances you did
   not anticipate.
6. **STOP AND ASK**: Present the clarification packet to the user. You must
   halt execution here and await user input. Do not simulate the user's
   response. Do not proceed to Stage 6 until you have received explicit answers.
7. After receiving answers, record them in the Plan Clarifications table.
   If the user cannot answer a question, record it as unresolved with
   mitigation notes so downstream assistants know the risk.
8. Re-evaluate whether new gaps emerged from the answers. If so, repeat
   this loop.

#### Autonomous Clarification

Think harder before flagging gaps — only document concrete uncertainties
you can cite.

1. Review the gaps documented in the Baseline Review.
2. For each gap, attempt to resolve it by:
   - Inspecting the codebase, configuration files, and documentation.
   - Analyzing existing patterns and conventions in the project.
   - Reviewing assistant documents and README files.
   - Making reasonable assumptions based on common practices and project
     context.
3. Record all resolutions in the Plan Clarifications table. Mark each
   entry's source as either "auto-resolved" (confirmed via codebase) or
   "assumption" (best-effort guess with rationale).
4. For truly unresolvable questions, record them as unresolved with
   mitigation notes so downstream assistants know the risk.
5. If no gaps remain (or all have been resolved or documented), proceed to
   Stage 6.

### 6. Refinement Implementation

Once you have sufficient context (or have documented all missing context),
refine the plan directly in-place. The plan file path is the one returned by
step 2.

1. **Maintain Identity**: Keep the existing `id` and directory. Do not create
   a new plan ID. Do not move the plan to a new location.
2. **Structure Compliance**: Ensure the plan still follows
   `<root>/config/templates/PLAN_TEMPLATE.md`. Add missing sections if
   necessary.
3. **Content Updates**:
   - Refresh the executive summary to reflect clarifications and new insights.
   - Update architectural sections, diagrams, and risk mitigations to resolve
     the identified gaps.
   - Trim any scope creep that is not explicitly required.
   - Clearly reference clarifications in the relevant plan sections (e.g.,
     italicized notes that point back to the Q&A table).
4. **Net-New Sections**: If the plan needs a new subsection (e.g., Decision
   Log, Data Contracts), add it under `Notes` with a clearly labeled section
   so it remains discoverable.
5. **Change Log**: Append a bullet list in the `Notes` section that briefly
   states what changed in this refinement session (e.g.,
   `- 2025-03-16: Clarified auth flow tokens and updated architecture diagram`).
6. **Validation Hooks**: Execute `<root>/config/hooks/POST_PLAN.md` to ensure
   the refined plan still meets quality bars.

### 7. Run the post-plan hook

Execute `<root>/config/hooks/POST_PLAN.md` after the plan file is updated.

### 8. Emit the structured summary

Conclude with exactly this block as the final output:

```
---

Plan Refinement Summary:
- Plan ID: [numeric-id]
- Plan File: [absolute-path-to-plan-file]
```

The summary is consumed by downstream automation; keep the format exact.

## Failure Modes

- **No strikethroo root found.** Stop and instruct the user to initialize the
  project. Do not read or write any plan files.
- **Plan ID does not resolve.** Stop and surface the script's stderr to the
  user. Do not guess a different ID and do not read or write any files.
- **User refuses to answer a clarifying question that blocks refinement.**
  Record the unresolved question in the Plan Clarifications table with
  mitigation notes, proceed with available context, and flag the remaining
  risk in the Refinement Report.
- **A helper script fails unexpectedly.** Surface stderr to the user and
  stop — do not fall back to manual path discovery.
- **Plan file is missing after resolution.** This indicates a consistency
  issue in the strikethroo workspace. Stop and report the error without
  attempting to recreate the plan.
