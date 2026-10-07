/**
 * One plan body shared by the viewer, validator, and readiness-bundle suites.
 *
 * The blueprint carries two phases plus the template's `### Post-phase Actions`
 * and `### Execution Summary` subsections. `TRAILING_EXECUTION_SUMMARY` is the
 * `## Execution Summary` section `st-execute-blueprint` appends after a run;
 * its bullets name an existing task (01) and a nonexistent one (04). Every
 * consumer must read the same phases with or without that trailing section.
 */

export const BLUEPRINT_SECTION = `
## Execution Blueprint

**Validation Gates:**
- Reference: \`/config/hooks/POST_PHASE.md\`

### Phase 1: Foundations
**Parallel Tasks:**
- Task 01: First
- Task 02: Second

### Phase 2: Follow-through
**Parallel Tasks:**
- Task 03: Third (depends on: 01, 02)

### Post-phase Actions

Run the validation gates after each phase.

### Execution Summary
- Total Phases: 2
- Total Tasks: 3
`;

export const TRAILING_EXECUTION_SUMMARY = `
## Execution Summary

**Status**: Completed Successfully
**Completed Date**: 2026-10-07

### Results
- Task 03: shipped the follow-through
- Task 04: deferred to a later plan

### Noteworthy Events
- Task 01 needed a second attempt.

### Necessary follow-ups
- None.
`;

/** Phase membership the blueprint section alone declares. */
export const EXPECTED_PHASE_TASK_IDS: number[][] = [[1, 2], [3]];
