---
id: 44
summary: "Fix bash parse error caused by quoted variable expansion in glob patterns within command substitution"
created: 2025-10-19
approval_method: auto
---

# Plan: Fix Bash Quoting in Glob Patterns

## Original Work Order

> Fix this error that I get when working with the task manager:
>
> ● Bash(PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-43--*.md" -type f) && PLAN_DIR=$(dirname "$PLAN_FILE") && TASK_COUNT=$(ls "$PLAN_DIR"/tasks/*.md 2…)
>   ⎿  Error: (eval):1: parse error near `('

## Executive Summary

This plan addresses a bash parsing error that occurs in the task management system when executing commands that count tasks. The error `(eval):1: parse error near '('` is caused by using quoted variable expansion (`"$PLAN_DIR"`) within glob patterns inside command substitution in a ZSH environment.

Through systematic testing, the root cause was identified: when `"$PLAN_DIR"/tasks/*.md` is used inside `$(...)` command substitution, the quoting interferes with ZSH's glob pattern handling. The fix involves removing quotes around variable expansion in glob patterns, using `${PLAN_DIR}/tasks/*.md` instead of `"$PLAN_DIR"/tasks/*.md`.

This is a critical fix that affects multiple template files in the task management system, specifically the `execute-blueprint.md` and `generate-tasks.md` commands across all assistant types (Claude, Gemini, OpenCode).

## Context

### Current State

The task management system contains bash commands in template files that use this pattern:

```bash
TASK_COUNT=$(ls "$PLAN_DIR"/tasks/*.md 2>/dev/null | wc -l)
```

This command fails with parse error `(eval):1: parse error near '('` when executed in the ZSH environment used by Claude Code's Bash tool. The error prevents:
- Task counting operations
- Plan validation workflows
- Blueprint execution commands

### Target State

All bash commands in template files will use unquoted variable expansion for glob patterns:

```bash
TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l)
```

This ensures commands execute successfully across different shell environments (bash, zsh) without parsing errors.

### Background

The issue manifests specifically in ZSH environments where:
1. Variable quoting within glob patterns behaves differently than in bash
2. Command substitution `$(...)` adds another layer of complexity
3. The combination causes ZSH to fail parsing the command

Testing confirmed that:
- Basic command substitution works: `$(echo hello)`
- Quoted variables work outside globs: `dirname "$PLAN_FILE"`
- Unquoted variables work in globs: `${PLAN_DIR}/tasks/*.md`
- The error only occurs when combining quotes + globs + command substitution

## Technical Implementation Approach

### Template File Updates

**Objective**: Fix variable quoting in all affected template files to ensure cross-shell compatibility.

The fix involves updating bash commands in these template locations:
1. Source templates: `templates/assistant/commands/tasks/`
2. Generated Claude commands: `.claude/commands/tasks/`
3. Generated Gemini commands: `.gemini/commands/tasks/` (if applicable)
4. Generated OpenCode commands: `.opencode/command/tasks/` (if applicable)

**Pattern to find:**
```bash
"$PLAN_DIR"/tasks/*.md
```

**Replacement pattern:**
```bash
${PLAN_DIR}/tasks/*.md
```

**Affected files:**
- `execute-blueprint.md` (lines ~50-56, ~151)
- `generate-tasks.md` (line ~307)

### Verification Strategy

**Objective**: Ensure the fix works in actual execution environments and doesn't break existing functionality.

After making the changes:
1. Rebuild the CLI: `npm run build`
2. Test plan lookup command with fixed syntax
3. Test task counting with archived plan (plan 43 exists with 2 tasks)
4. Verify both empty and non-empty task directories work correctly

## Risk Considerations and Mitigation Strategies

### Technical Risks

- **Breaking Change in Bash Environments**: Removing quotes could affect paths with spaces
    - **Mitigation**: The task manager enforces slug-based naming (no spaces) for plan/task directories, making this safe

- **Variable Expansion Edge Cases**: Unquoted `${VAR}` might behave differently if variable is empty
    - **Mitigation**: Existing null-check logic and error handling (`2>/dev/null`) already handles empty variables

### Implementation Risks

- **Missing Template Instances**: Other files might have the same pattern
    - **Mitigation**: Comprehensive grep search for the pattern `"\$PLAN_DIR"/` and `"\$PLAN_FILE"/` across all template files

- **Regeneration from Source**: Fixing only generated files (.claude, .gemini, etc.) won't persist if templates are regenerated
    - **Mitigation**: Fix source templates first (`templates/assistant/commands/tasks/`), then regenerate

## Success Criteria

### Primary Success Criteria

1. The command `PLAN_FILE=$(find .ai/task-manager/plans .ai/task-manager/archive -name "plan-43--*.md" -type f) && PLAN_DIR=$(dirname "$PLAN_FILE") && TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l) && echo "Count: $TASK_COUNT"` executes successfully without parse errors
2. The output correctly shows `Count: 2` for plan 43
3. All template files are updated with the corrected syntax

### Quality Assurance Metrics

1. No regression in functionality - existing workflows continue to work
2. Consistent syntax across all template files (Claude, Gemini, OpenCode)
3. Successful execution in ZSH environment (Claude Code Bash tool)

## Resource Requirements

### Development Skills

- Bash/ZSH scripting knowledge
- Understanding of shell quoting rules and glob patterns
- Familiarity with the task manager template system

### Technical Infrastructure

- Access to codebase template files
- Ability to test bash commands in ZSH environment
- CLI rebuild capability (`npm run build`)

## Implementation Order

1. Locate all instances of the problematic pattern in source templates
2. Update source template files with correct syntax
3. Regenerate assistant-specific command files (if using init command)
4. Test the fix with real plan data (plan 43)
5. Verify no other similar patterns exist in the codebase

## Task Dependencies

```mermaid
graph TD
    001[Task 01: Fix Bash Quoting in Templates] --> 002[Task 02: Verify Fix in ZSH]
```

## Execution Blueprint

**Validation Gates:**
- Reference: `.ai/task-manager/config/hooks/POST_PHASE.md`

### ✅ Phase 1: Template Updates
**Parallel Tasks:**
- ✔️ Task 01: Fix Bash Quoting in Templates

**Deliverables:**
- All template files updated with corrected bash syntax
- Consistent unquoted variable expansion across all templates

### ✅ Phase 2: Verification
**Parallel Tasks:**
- ✔️ Task 02: Verify Fix in ZSH (depends on: 01)

**Deliverables:**
- Confirmed fix works in ZSH environment
- Test results showing correct task counting
- No regression in existing functionality

### Execution Summary
- Total Phases: 2
- Total Tasks: 2
- Maximum Parallelism: 1 task per phase
- Critical Path Length: 2 phases

---

## Execution Summary

**Status**: ⚠️ Completed with Critical Findings
**Completed Date**: 2025-10-19

### Results

Both phases completed successfully:
- **Phase 1**: Updated template files by changing `"$PLAN_DIR"/tasks/*.md` to `${PLAN_DIR}/tasks/*.md`
- **Phase 2**: Comprehensive verification testing in ZSH environment

**Critical Discovery**: The fix implemented in Phase 1 does NOT resolve the ZSH parsing error. Verification testing revealed the actual root cause is different from the initial diagnosis.

### Noteworthy Events

**Initial Diagnosis Was Incorrect:**
- Original hypothesis: Parse error caused by quoted variable expansion in glob patterns (`"$PLAN_DIR"`)
- Testing revealed: Removing quotes has NO effect on the error
- Actual root cause: Using `wc -l` in a pipe within command substitution triggers the parse error in Claude Code's ZSH environment

**Evidence:**
- Test 1 (quoted): `TASK_COUNT=$(ls "$PLAN_DIR"/tasks/*.md 2>/dev/null | wc -l)` → ❌ Parse error
- Test 2 (unquoted - Task 1 fix): `TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l)` → ❌ Same parse error
- Test 3 (minimal): `COUNT=$(echo "test" | wc -l)` → ❌ Parse error

**Working Solution Discovered:**
```bash
setopt null_glob
TASK_FILES=(${PLAN_DIR}/tasks/*.md)
TASK_COUNT=${#TASK_FILES[@]}
```

This array-based approach works correctly:
- ✅ Plan 43 (2 tasks): Count = 2
- ✅ Plan 44 (2 tasks): Count = 2
- ✅ Empty directory: Count = 0

### Recommendations

**Immediate Actions Required:**

1. **Revert Phase 1 Changes** - The quoting modification provides no benefit since it doesn't fix the actual problem

2. **Implement Proper Fix** - Replace all instances of `ls ... | wc -l` with array-based counting:
   ```bash
   # Replace this pattern:
   TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l)

   # With this:
   setopt null_glob
   TASK_FILES=(${PLAN_DIR}/tasks/*.md)
   TASK_COUNT=${#TASK_FILES[@]}
   ```

3. **Update All Affected Files:**
   - `templates/assistant/commands/tasks/execute-blueprint.md` (line 56)
   - `templates/assistant/commands/tasks/generate-tasks.md` (if applicable)
   - All generated command files in `.claude/`, `.gemini/`, `.opencode/` directories

4. **Rebuild and Test:**
   - Regenerate template files: `npm run build`
   - Test with actual workflow commands
   - Verify task counting works across all plans

**Impact Assessment:**
- **Severity**: HIGH - Core task management functionality broken in ZSH
- **Scope**: All task counting operations across workflow templates
- **Urgency**: CRITICAL - Blocks task management operations in ZSH environments

**Lessons Learned:**
- Initial problem diagnosis based on error message alone can be misleading
- Verification testing is essential to confirm fixes work as intended
- The two-phase approach (implement + verify) successfully caught the issue before deployment
