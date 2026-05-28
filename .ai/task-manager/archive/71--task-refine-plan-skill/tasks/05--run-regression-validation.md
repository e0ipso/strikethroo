---
id: 5
group: "validation"
dependencies: [1, 2, 3, 4]
status: "completed"
created: "2026-05-18"
skills: ["testing", "ci-cd"]
---
# Run regression validation and self-checks

## Objective
Execute the full self-validation checklist from Plan 71 to confirm the new skill is correctly built, tested, documented, and that existing functionality remains intact.

## Skills Required
- `testing`: Running test suites and interpreting results.
- `ci-cd`: Executing build pipelines, lint checks, and npm pack dry-runs.

## Acceptance Criteria
- [ ] `npm run build` from a clean tree produces `templates/skills/task-refine-plan/scripts/find-task-manager-root.cjs` and `templates/skills/task-refine-plan/scripts/validate-plan-blueprint.cjs`.
- [ ] `git status` shows the two generated `.cjs` files as ignored (covered by the `templates/skills/*/scripts/` gitignore rule).
- [ ] `templates/skills/task-refine-plan/SKILL.md` frontmatter has `name: task-refine-plan` and a plan-refinement-specific description.
- [ ] Every script reference in `SKILL.md` is relative to the skill root.
- [ ] The skill prose contains distinct coverage for both interactive and autonomous clarification modes.
- [ ] A temporary fixture is initialized via `npx . init --assistants claude --destination-directory /tmp/skill-refine-plan-fixture`, a sample plan is created under `.ai/task-manager/plans/`, and the bundled scripts are run from inside the fixture to confirm they resolve the fixture's root and plan file correctly.
- [ ] A sample refinement run (autonomous mode for testability) is driven against the fixture plan, confirming:
  - The plan file is updated in-place.
  - The original plan ID and directory are preserved.
  - A change log entry is present in the `Notes` section.
  - The final output contains a `Plan Refinement Summary` block.
- [ ] Regression: `npx . init --assistants claude,gemini,opencode,codex --destination-directory /tmp/regression-71` generates refine-plan command files identically to before.
- [ ] Regression: `npm test` passes with no failures.
- [ ] Regression: `npm run lint` passes with no errors.
- [ ] `npm pack --dry-run` lists `.cjs` files for all four skills (`templates/skills/*/scripts/*.cjs`).

## Technical Requirements
- Run commands from the repository root.
- Use temporary directories under `/tmp/` and clean them up afterward.
- For the sample refinement run, follow the instructions in `templates/skills/task-refine-plan/SKILL.md` using autonomous clarification mode.

## Input Dependencies
- Task 1: build script updated and bundles generated.
- Task 2: skill artifact created.
- Task 3: tests added and passing.
- Task 4: AGENTS.md updated.

## Output Artifacts
- Validation report (can be appended to the plan's Notes section or logged in task output).
- Confirmation that all success criteria from Plan 71 are met.

## Implementation Notes
<details>
1. Run `npm run build` and list `templates/skills/task-refine-plan/scripts/` to confirm the two `.cjs` files exist.
2. Run `git status --ignored` and grep for `task-refine-plan/scripts` to confirm they are ignored.
3. Inspect `SKILL.md` frontmatter and prose manually or with `grep`.
4. Create the fixture:
   ```bash
   rm -rf /tmp/skill-refine-plan-fixture
   npx . init --assistants claude --destination-directory /tmp/skill-refine-plan-fixture
   mkdir -p /tmp/skill-refine-plan-fixture/.ai/task-manager/plans/99--sample-plan
   cat << 'EOF' > /tmp/skill-refine-plan-fixture/.ai/task-manager/plans/99--sample-plan/plan-99--sample-plan.md
   ---
   id: 99
   summary: "Sample plan for smoke test"
   created: "2026-05-18"
   ---
   # Sample Plan
   
   ## Executive Summary
   This is a placeholder plan for skill smoke testing.
   
   ## Context and Background
   Minimal context.
   
   ## Technical Implementation Approach
   TBD.
   
   ## Risk Considerations
   None.
   
   ## Success Criteria
   - Plan is refined successfully.
   
   ## Resource Requirements
   None.
   EOF
   cp -r templates/skills/task-refine-plan /tmp/skill-refine-plan-fixture/
   ```
5. Run the bundled scripts from the fixture and assert correct paths.
6. Drive the sample refinement by following the SKILL.md instructions in autonomous mode.
7. Run the init regression and compare refine-plan command files.
8. Run `npm test` and `npm run lint`.
9. Run `npm pack --dry-run | grep templates/skills`.
10. Document any failures as issues to fix before marking this task complete.
</details>
