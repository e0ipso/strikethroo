---
id: 34
summary: "Implement plan CLI command with show and archive subcommands for plan inspection and manual archival"
created: 2025-10-16
---

# Plan: Plan Command CLI

## Original Work Order

> I need another cli command, similar to "status". It is called `plan` and it is to get information and operate on a given plan. The sub-commands are `show` and `archive`. If no sub-command is provided, assume `plan show` -> `npx @e0ipso/ai-task-manager plan 12` == `npx @e0ipso/ai-task-manager plan show 12`. The `archive` subcommand will archive the plan and mark all tasks as completed. It should also add a "Manually archived" note at the end of the plan document. The show command should display the metadata and the executive summary (parsed from the plan document). follow the aesthetics of the status command.

## Plan Clarifications

| Question | Answer |
|----------|--------|
| Should archive command move plan directory, set all tasks to completed, and add "Manually archived" note? | Yes to all three |
| Should archive command warn if incomplete tasks exist? | Yes, warn the user |
| Should show command display frontmatter + Executive Summary + task statistics? | Yes |
| How to handle plan ID not found? | Show error |
| Should show work for archived plans? | Yes, works normally |
| How to handle archiving already archived plan? | Show error |
| Should formatting match status command aesthetics? | Yes, same color scheme and section formatting |

## Executive Summary

This plan implements a new `plan` CLI command that enables users to inspect and manage individual plans. The command provides two subcommands: `show` for displaying plan details and `archive` for manually archiving plans with completed task updates.

The `show` subcommand will display plan metadata (from YAML frontmatter), the executive summary section, and task completion statistics using the same visual aesthetics as the existing `status` command (cyan headers, colored bullets, progress bars, and dividers). It will work for both active and archived plans.

The `archive` subcommand will provide manual plan archival functionality that mirrors the automated archival in `execute-blueprint`. It moves the plan directory to the archive folder, updates all task statuses to "completed", appends a "Manually archived" note to the plan document, and warns users if incomplete tasks exist before archiving.

## Context

### Current State

The CLI currently has two commands: `init` for project initialization and `status` for displaying a dashboard of all plans. Users can view aggregate statistics but cannot inspect individual plan details or manually archive plans. Plan archival only happens automatically through the `execute-blueprint` workflow.

The `status` command established a visual design pattern with:
- Cyan headers and dividers
- Colored bullet points (green, yellow, blue)
- ASCII progress bars for task completion
- Consistent formatting with 80-character terminal width

### Target State

Users will be able to:
1. Quickly inspect a specific plan's metadata, executive summary, and task progress using `plan show <id>` or shorthand `plan <id>`
2. Manually archive completed or abandoned plans using `plan archive <id>` with proper validation and warnings
3. Access plan information whether the plan is active or archived

The command will integrate seamlessly with existing CLI patterns, error handling, and visual formatting established by the `status` command.

### Background

The request for a `plan` command follows the successful implementation of the `status` command (based on the test files and implementation in `src/status.ts`). The status command established patterns for:
- File system traversal of plans and archive directories
- YAML frontmatter parsing using `gray-matter`
- Task metadata extraction
- Visual formatting with `chalk` for colored output
- Error handling for corrupted files

The manual archival feature addresses a gap where users have no way to archive plans outside of the automated `execute-blueprint` workflow. This is useful for plans that are completed manually, abandoned, or no longer relevant.

## Technical Implementation Approach

### Component 1: CLI Command Registration

**Objective**: Register the `plan` command with Commander.js and route to appropriate handlers

Extend `src/cli.ts` to add a new command following the existing pattern used for `status`:
- Command name: `plan`
- Optional subcommand parameter with default value `show`
- Required plan ID parameter
- Route to handler functions based on subcommand
- Error handling and exit code management

```typescript
program
  .command('plan [subcommand] <plan-id>')
  .description('Display or manage a specific plan')
  .action(async (subcommand, planId) => { /* handler */ })
```

### Component 2: Plan Lookup and Loading

**Objective**: Create utility functions to locate and load plan data from filesystem

Implement plan lookup logic that:
- Searches both `.ai/task-manager/plans/` and `.ai/task-manager/archive/` directories
- Uses the existing pattern from `status.ts` for directory scanning
- Parses plan files to extract frontmatter metadata and markdown body
- Loads associated task files for statistics calculation
- Returns structured plan data or error if not found

Reuse existing functions from `status.ts`:
- `parsePlanFile()` for metadata extraction
- `parseTaskFiles()` for task statistics
- Extend with body content parsing for Executive Summary extraction

### Component 3: Show Subcommand Implementation

**Objective**: Display plan metadata, executive summary, and task statistics with visual formatting

Create a new module (similar to `status.ts` structure) with:

**Plan Data Formatting**:
- Extract and display YAML frontmatter fields (id, summary, created)
- Parse markdown body to extract Executive Summary section
- Calculate task statistics (completed/total, percentage)
- Apply visual formatting matching status command aesthetics

**Visual Elements**:
- Section headers with cyan color and dividers (80 chars)
- Metadata display with colored bullets
- Task progress bar (reuse from status.ts)
- Executive summary with proper text wrapping

**Error Handling**:
- Plan ID not found → Error message with helpful context
- Corrupted YAML frontmatter → Warning and graceful degradation
- Missing Executive Summary section → Display available content

### Component 4: Archive Subcommand Implementation

**Objective**: Manually archive plans with validation, task updates, and filesystem operations

Implement archival workflow:

**Pre-archival Validation**:
- Verify plan exists in `plans/` directory (not already archived)
- Check for incomplete tasks
- Display warning if incomplete tasks found, prompt for confirmation

**Archival Operations**:
1. Load all task files from plan's tasks directory
2. Update each task's frontmatter status to "completed"
3. Append "Manually archived" note to plan document body
4. Move entire plan directory from `plans/` to `archive/`
5. Display success message with plan location

**Error Handling**:
- Plan already archived → Error with clear message
- Plan not found → Error message
- File system errors → Detailed error with context
- Permission issues → Helpful error message

### Component 5: Integration and Testing

**Objective**: Ensure command integrates properly with existing CLI infrastructure

Integration points:
- Logger initialization (existing pattern in cli.ts)
- Error routing and exit codes
- Consistent command interface
- Build and compilation workflow

Testing approach (following project philosophy of "Write a Few Tests, Mostly Integration"):
- Integration test for show command with real filesystem
- Integration test for archive command workflow
- Edge case testing (missing plans, corrupted files, already archived)
- Visual formatting validation (basic smoke tests)

## Risk Considerations and Mitigation Strategies

### Technical Risks

- **Markdown Parsing Complexity**: Extracting the Executive Summary section from markdown may be fragile if plan documents don't follow template structure
    - **Mitigation**: Use regex-based section extraction with fallback to display available content; add validation in plan templates

- **File System Race Conditions**: Concurrent operations on plan files during archive could cause corruption
    - **Mitigation**: Use atomic file operations with fs-extra; document that concurrent archival is not supported

- **YAML Frontmatter Parsing**: Existing status command shows warnings for corrupted frontmatter
    - **Mitigation**: Reuse existing error handling patterns from status.ts; provide clear user feedback

### Implementation Risks

- **Code Duplication**: Show and archive commands share plan lookup logic with status command
    - **Mitigation**: Extract common functions into shared utilities module; follow DRY principle while keeping modules focused

- **Breaking Existing Functionality**: Changes to shared types or utilities could affect status command
    - **Mitigation**: Leverage existing tests for status command; run full test suite after implementation

- **User Confirmation Flow**: Archive command needs user confirmation for incomplete tasks
    - **Mitigation**: Use existing logger patterns; implement simple y/n prompt with clear messaging

### Quality Risks

- **Inconsistent Visual Formatting**: Output may not match status command aesthetics exactly
    - **Mitigation**: Reuse exact formatting functions from status.ts; visual validation during implementation

- **Incomplete Error Coverage**: Edge cases in plan lookup or archival may not be handled
    - **Mitigation**: Follow error handling patterns from status.ts; comprehensive integration testing

## Success Criteria

### Primary Success Criteria

1. `npx @e0ipso/ai-task-manager plan show 12` displays plan metadata, executive summary, and task statistics
2. `npx @e0ipso/ai-task-manager plan 12` works as shorthand for show command
3. `npx @e0ipso/ai-task-manager plan archive 12` successfully archives plan with all required operations
4. Archive command warns user about incomplete tasks before proceeding
5. Commands work for both active and archived plans (show only)
6. Appropriate error messages for missing plans, already archived, etc.

### Quality Assurance Metrics

1. Visual output matches status command formatting (cyan headers, colored bullets, progress bars, dividers)
2. All existing tests continue to pass
3. Integration tests cover show and archive workflows
4. Build succeeds without TypeScript errors
5. Commands handle corrupted YAML frontmatter gracefully

## Resource Requirements

### Development Skills

- TypeScript for type-safe implementation
- Commander.js for CLI argument parsing
- Node.js filesystem operations (fs-extra)
- Markdown parsing and manipulation
- YAML frontmatter parsing (gray-matter library)
- Terminal UI formatting (chalk library)

### Technical Infrastructure

- Existing project dependencies (commander, fs-extra, chalk, gray-matter)
- TypeScript compiler and build tooling
- Jest testing framework for integration tests
- Project directory structure (.ai/task-manager/plans and archive)

## Notes

**Default Subcommand Behavior**: Commander.js will need configuration to treat `plan <id>` as equivalent to `plan show <id>`. This can be achieved by making the subcommand parameter optional with a default value.

**Reusability**: Maximum code reuse from `status.ts` for plan data collection, parsing, and formatting will minimize implementation complexity and maintain consistency.

**Archive Note Format**: The "Manually archived" note should be appended to the plan document body in a consistent format, such as:

```markdown
---

**Note**: Manually archived on YYYY-MM-DD
```

This maintains markdown formatting and provides timestamp context.

## Task Dependencies

```mermaid
graph TD
    001[Task 01: CLI Command Registration]
    002[Task 02: Plan Lookup Utilities] --> 003[Task 03: Show Subcommand]
    002 --> 004[Task 04: Archive Subcommand]
    001 --> 005[Task 05: Integration Testing]
    003 --> 005
    004 --> 005
```

## Execution Blueprint

**Validation Gates:**
- Reference: `/config/hooks/POST_PHASE.md`

### Phase 1: Foundation Setup
**Parallel Tasks:**
- Task 01: CLI Command Registration - Register the `plan` command in Commander.js with routing logic
- Task 02: Plan Lookup Utilities - Create utility functions to locate and load plan data from filesystem

### Phase 2: Core Functionality
**Parallel Tasks:**
- Task 03: Show Subcommand (depends on: 02) - Implement show subcommand with visual formatting
- Task 04: Archive Subcommand (depends on: 02) - Implement archive subcommand with validation and file operations

### Phase 3: Quality Assurance
**Parallel Tasks:**
- Task 05: Integration Testing (depends on: 01, 03, 04) - Create integration tests for plan command workflows

### Post-phase Actions
After each phase completion:
1. Run `npm run build` to verify TypeScript compilation
2. Run `npm test` to ensure existing tests pass
3. Review code for adherence to project patterns

### Execution Summary
- Total Phases: 3
- Total Tasks: 5
- Maximum Parallelism: 2 tasks (in Phase 1 and Phase 2)
- Critical Path Length: 3 phases
- Estimated Complexity: All tasks ≤5.0 composite score

## Execution Summary

**Executed on:** 2025-10-16

### Implementation Completed Successfully

All 5 tasks across 3 phases were completed successfully. The implementation adds a new `plan` CLI command with `show` and `archive` subcommands for plan inspection and manual archival.

### Key Deliverables

**New Modules Created:**
- `src/plan-utils.ts` - Plan lookup, loading, and executive summary extraction utilities
- `src/plan.ts` - Show and archive command implementations with visual formatting
- `src/__tests__/plan.test.ts` - Integration tests (8 tests) covering plan lookup and loading

**Modified Files:**
- `src/cli.ts` - Added plan command registration with subcommand routing
- `src/status.ts` - Exported `parseTaskFiles` for reuse

### Test Results

- **Total Tests:** 99 (up from 87, +12 new tests)
- **Test Status:** All passing
- **Test Coverage:** Integration tests focus on business logic (plan lookup, loading, location detection)

### Technical Highlights

1. **Reusable Architecture**: Created plan-utils module to centralize plan data operations
2. **Pattern Consistency**: Followed existing patterns from status.ts for formatting and error handling
3. **Executive Summary Extraction**: Implemented regex-based markdown section parsing with fallback
4. **Shorthand Support**: `plan <id>` automatically routes to `plan show <id>`
5. **Archive Safety**: Warns users about incomplete tasks before archiving
6. **Archive Operations**: Updates all task statuses to "completed", appends archive note, moves directory

### Command Usage

```bash
# Show plan details (shorthand)
npx @e0ipso/ai-task-manager plan 34

# Show plan details (explicit)
npx @e0ipso/ai-task-manager plan show 34

# Archive plan manually
npx @e0ipso/ai-task-manager plan archive 34
```

### Notes

- Tests simplified to focus on business logic rather than UI formatting due to chalk ESM module complexity
- Console.log mocking used in tests to avoid chalk initialization issues
- All existing tests continue to pass, confirming no regressions
- Build and lint successful with no errors
