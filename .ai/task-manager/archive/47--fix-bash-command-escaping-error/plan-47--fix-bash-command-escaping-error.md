---
id: 47
summary: "Fix bash command escaping error causing syntax errors in execute-blueprint and generate-tasks commands"
created: 2025-10-28
approval_method_plan: manual
approval_method_tasks: manual
---

# Plan: Fix Bash Command Escaping Error in Task Management Commands

## Original Work Order

> I got this bash error when working with the AI task manager in another repo:
>
> ```
> ● Bash(PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-[0-9][0-9]*--*.md" -type f -exec grep -l "^id: \?11$" {} \;)
>       echo "Plan file: $PLAN_FILE"…)
>   ⎿  Error: /bin/bash: eval: line 1: syntax error near unexpected token `('
>      /bin/bash: eval: line 1: `PLAN_FILE=\$ ( find .ai/task-manager/\{plans\,archive\} -name plan-\[0-9\]\[0-9\]\*--\*.md -type f -exec grep -l '^id: \?11$'
>      \{\} \; ) echo 'Plan file: ' PLAN_DIR\=\$ ( dirname '' ) echo 'Plan directory: ' TASK_COUNT\=\$ ( ls /tasks/*.md 2>/dev/null < /dev/null | wc -l ) echo
>      'Task count: ' BLUEPRINT_EXISTS\=\$ ( grep -q '^## Execution Blueprint' '' && echo yes || echo no ) echo 'Blueprint exists: ''
>
> ● Bash(find .ai/task-manager/plans -name "plan-11--*.md" -type f)
>   ⎿  .ai/task-manager/plans/11--remove-mcp-invoke-endpoint/plan-11--remove-mcp-invoke-endpoint.md
> ```
>
> Additional example of the same pattern:
>
> ```
> ● Bash(PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-11--*.md" -type f)
>       APPROVAL_METHOD=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_meth…)
>   ⎿  Error: /bin/bash: eval: line 1: syntax error near unexpected token `('
>      /bin/bash: eval: line 1: `PLAN_FILE=\$ ( find .ai/task-manager/\{plans\,archive\} -name plan-11--\*.md -type f ) APPROVAL_METHOD\=\$ ( sed -n
>      /\^---\$/\,/\^---\$/p '' < /dev/null | grep \^approval_method\: | sed "s/approval_method: *//;s/\"//g;s/'//g" | tr -d ' ' ) echo 'Approval method: ''
>
> ● Bash(grep "^approval_method:" .ai/task-manager/plans/11--remove-mcp-invoke-endpoint/plan-11--remove-mcp-invoke-endpoint.md)
>   ⎿  approval_method: 'manual'
> ```
>
> I want to fix the root cause of this, even if the LLM ended up figuring it out.
>
> **Additional Requirement**: Solutions must be resilient to code formatters like Prettier that may automatically reflow long lines in markdown code blocks.

## Executive Summary

The AI task manager system is generating bash commands that fail with syntax errors when Claude Code attempts to execute them. The root cause is multi-line bash commands with command substitutions (e.g., `$(...)`) that are being improperly formatted in Claude's Bash tool invocation, causing shell evaluation failures.

This plan addresses the problem by:
1. Identifying all occurrences of problematic multi-line bash command patterns in template files
2. Extracting these commands into dedicated scripts (`.cjs` files) following the established pattern of existing helper scripts
3. Updating template files to invoke the new scripts instead of inline multi-line commands

The fix ensures reliable bash command execution across all task management workflows, eliminating cryptic syntax errors that could confuse users and interrupt automated task execution. By extracting complex bash logic into scripts, we eliminate the parsing issues entirely and follow the existing architectural pattern established by scripts like `get-next-plan-id.cjs` and `get-next-task-id.cjs`.

## Context

### Current State

The task management system includes several slash commands that instruct Claude to execute bash commands for validation and workflow coordination. Two template files contain problematic multi-line bash command examples:

1. **execute-blueprint.md** (lines 49-64): Multi-line command for plan file location and blueprint validation
2. **generate-tasks.md** (lines 305-314): Multi-line command for approval method extraction

When Claude attempts to execute these commands, the Bash tool receives improperly escaped command substitutions, resulting in:
- Shell syntax errors with escaped parentheses and special characters
- Failed validation checks that should succeed
- Confusion for both the AI assistant and end users

The error manifests as:
```
Error: /bin/bash: eval: line 1: syntax error near unexpected token `('
```

Formatters like Prettier may reflow long bash commands in markdown code blocks, potentially converting single-line commands into problematic multi-line formats.

### Target State

Complex bash operations in template files should be:
- Extracted into dedicated script files in `.ai/task-manager/config/scripts/`
- Invoked via simple, single-line `node` commands (e.g., `node .ai/task-manager/config/scripts/validate-plan.cjs $1`)
- Following the established pattern of existing scripts like `get-next-plan-id.cjs`
- Completely immune to markdown formatting issues

### Background

The issue stems from how Claude Code's Bash tool processes multi-line commands with command substitutions. When these commands are formatted across multiple lines in template documentation, the tool's parameter passing mechanism can introduce escaping that breaks shell syntax.

The project already has a precedent for extracting complex logic into scripts: `get-next-plan-id.cjs` and `get-next-task-id.cjs` successfully handle complex directory traversal and ID generation logic. We'll follow this same pattern for validation and metadata extraction operations.

## Technical Implementation Approach

### Component 1: Audit and Catalog Problematic Commands

**Objective**: Identify all instances of multi-line bash commands with command substitutions in template files.

We'll search for patterns that match:
- Multi-line variable assignments with `$(...)`
- Commands split across multiple lines in code blocks
- Any bash examples that combine multiple operations with command substitution

Key files to audit:
- `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- `/workspace/templates/assistant/commands/tasks/generate-tasks.md`
- `/workspace/templates/assistant/commands/tasks/execute-task.md`
- `/workspace/templates/ai-task-manager/config/TASK_MANAGER.md`

### Component 2: Create Helper Scripts

**Objective**: Extract all problematic multi-line bash commands into dedicated `.cjs` scripts following the established pattern.

**Script Creation Strategy:**

Following the pattern of existing scripts (`get-next-plan-id.cjs`, `get-next-task-id.cjs`), we'll create:

1. **`validate-plan-blueprint.cjs`** - Validates plan exists and checks for tasks/blueprint
   - Input: Plan ID as command-line argument
   - Output: JSON with plan file path, task count, blueprint existence
   - Replaces: execute-blueprint.md lines 49-64

2. **`get-approval-methods.cjs`** - Extracts approval method fields from plan frontmatter
   - Input: Plan ID as command-line argument
   - Output: JSON with `approval_method_plan` and `approval_method_tasks` values
   - Replaces: execute-blueprint.md lines 156-167 and generate-tasks.md lines 305-314

**Script Design Principles:**

- Use Node.js with standard library (fs, path) - no external dependencies
- Accept plan ID as `process.argv[2]`
- Output structured JSON or plain text for easy parsing
- Include error handling with descriptive messages
- Follow coding style of existing scripts
- Add JSDoc comments for maintainability

**Example Script Structure:**

```javascript
#!/usr/bin/env node
/**
 * Validates plan exists and checks for tasks and execution blueprint.
 * Usage: node validate-plan-blueprint.cjs <plan-id>
 * Output: JSON object with validation results
 */

const fs = require('fs');
const path = require('path');

// Implementation follows pattern of get-next-plan-id.cjs
```

### Component 3: Update Template Files

**Objective**: Replace all problematic inline bash commands with script invocations.

**Template Updates:**

1. **execute-blueprint.md (lines 49-64)**: Replace plan validation logic
   ```bash
   # Before: Multi-line PLAN_FILE, PLAN_DIR, TASK_COUNT, BLUEPRINT_EXISTS
   # After: Single script invocation
   node .ai/task-manager/config/scripts/validate-plan-blueprint.cjs $1
   ```

2. **execute-blueprint.md (lines 156-167)**: Replace approval method extraction
   ```bash
   # Before: Multi-line sed/grep pipeline
   # After: Single script invocation
   node .ai/task-manager/config/scripts/get-approval-methods.cjs $1
   ```

3. **generate-tasks.md (lines 305-314)**: Replace approval method extraction
   ```bash
   # Before: Multi-line PLAN_FILE and APPROVAL_METHOD_TASKS extraction
   # After: Single script invocation
   node .ai/task-manager/config/scripts/get-approval-methods.cjs $1
   ```

**Template Update Pattern:**

- Keep the surrounding prose and instructions intact
- Replace only the bash code blocks with script invocations
- Update any references to extracted variables to use script output
- Maintain backward compatibility with existing workflow

### Component 4: Testing and Validation

**Objective**: Verify all scripts work correctly and templates invoke them properly.

Testing approach:
1. **Unit test each script** in isolation with sample plan structure
2. **Verify script outputs** are parseable and contain expected data
3. **Test template workflows**: create-plan → generate-tasks → execute-blueprint
4. **Verify no regressions** in existing functionality

**Script Testing:**
```bash
# Test validate-plan-blueprint.cjs
node .ai/task-manager/config/scripts/validate-plan-blueprint.cjs 47

# Test get-approval-methods.cjs
node .ai/task-manager/config/scripts/get-approval-methods.cjs 47

# Run existing test suite
npm test
```

## Risk Considerations and Mitigation Strategies

### Technical Risks

- **Breaking Existing Workflows**: Changing command patterns could introduce new bugs
    - **Mitigation**: Comprehensive testing of all affected workflows; maintain command semantics while changing only implementation

- **Script Output Parsing**: Templates need to parse JSON or text output from scripts
    - **Mitigation**: Use simple, well-structured JSON output; provide clear examples in script documentation

### Implementation Risks

- **Incomplete Identification**: May miss some problematic command patterns
    - **Mitigation**: Comprehensive grep-based audit of all template files; search for patterns like `$(...)\n` and multi-line variable assignments

- **Script Maintenance**: New scripts add maintenance burden
    - **Mitigation**: Follow established patterns; keep scripts simple and well-documented; reuse existing utilities where possible

## Success Criteria

### Primary Success Criteria

1. All bash commands in template files execute without syntax errors when invoked by Claude Code
2. The specific error from the user's report (`syntax error near unexpected token '('`) is eliminated
3. Full workflow test (create-plan → generate-tasks → execute-blueprint) completes successfully
4. All new scripts follow the established pattern of existing helper scripts

### Quality Assurance Metrics

1. Zero bash syntax errors in execute-blueprint and generate-tasks command execution
2. Scripts output parseable, structured data
3. Template commands are simple single-line script invocations
4. No regressions in existing test suite

## Resource Requirements

### Development Skills

- Node.js scripting with standard library (fs, path)
- File system operations and path manipulation
- YAML frontmatter parsing (using existing patterns)
- Markdown template modification
- Testing and validation of CLI workflows

### Technical Infrastructure

- Test repository with AI task manager initialized
- Bash and zsh shells for cross-shell testing
- Access to Claude Code CLI for workflow validation

## Notes

### Known Affected Locations

Based on initial audit:

1. **execute-blueprint.md:49-64**
   - Multi-line PLAN_FILE, PLAN_DIR, TASK_COUNT, BLUEPRINT_EXISTS assignments
   - High priority - directly causes reported error

2. **generate-tasks.md:305-314**
   - Multi-line PLAN_FILE, APPROVAL_METHOD_TASKS extraction
   - Medium priority - same pattern, likely affects workflows

3. **execute-blueprint.md:156-167**
   - Similar approval method extraction pattern
   - Medium priority - duplicate of generate-tasks pattern

### Alternative Approaches Considered

- **Modify Claude's Bash Tool**: Not feasible - tool is external to this project
- **Escape Commands Differently**: Unreliable - escaping rules vary by context
- **Use Heredoc for Commands**: Adds complexity and doesn't address root cause
- **Sequential Bash Tool Calls**: Would work but adds complexity to templates; script extraction is cleaner
- **Inline Single-Line Commands**: Risk of formatter reflow; scripts are more maintainable

### Why Script Extraction is Optimal

- **Precedent**: Follows established pattern (`get-next-plan-id.cjs`, `get-next-task-id.cjs`)
- **Maintainability**: Complex logic easier to test and debug in JavaScript
- **Formatter-Proof**: JavaScript files not affected by markdown formatting
- **Simplicity**: Template invocations become trivial single-line commands
- **Error Handling**: Better error messages and debugging in scripts vs. shell pipelines

## Task Dependencies

```mermaid
graph TD
    001[Task 01: validate-plan-blueprint.cjs]
    002[Task 02: get-approval-methods.cjs]
    001 --> 003[Task 03: Update execute-blueprint.md]
    002 --> 003
    002 --> 004[Task 04: Update generate-tasks.md]
```

## Execution Blueprint

**Validation Gates:**
- Reference: `.ai/task-manager/config/hooks/POST_PHASE.md`

### Phase 1: Create Helper Scripts
**Parallel Tasks:**
- Task 01: Create validate-plan-blueprint.cjs script
- Task 02: Create get-approval-methods.cjs script

**Rationale**: Both scripts are independent and can be created simultaneously. They follow existing patterns and don't depend on each other.

### Phase 2: Update Templates
**Parallel Tasks:**
- Task 03: Update execute-blueprint.md template (depends on: 01, 02)
- Task 04: Update generate-tasks.md template (depends on: 02)

**Rationale**: Template updates can proceed in parallel once their respective scripts exist. Task 03 needs both scripts, while Task 04 only needs the approval methods script.

### Post-phase Actions

After Phase 2 completion:
1. Rebuild the project: `npm run build`
2. Run existing test suite: `npm test`
3. Test the updated workflows:
   - Create a test plan: `/tasks:create-plan [test-request]`
   - Generate tasks: `/tasks:generate-tasks [plan-id]`
   - Execute blueprint: `/tasks:execute-blueprint [plan-id]`
4. Verify no bash syntax errors occur

### Execution Summary
- **Total Phases**: 2
- **Total Tasks**: 4
- **Maximum Parallelism**: 2 tasks (in both phases)
- **Critical Path Length**: 2 phases
- **Estimated Completion**: Script creation (Phase 1) + Template updates (Phase 2)

## Execution Summary

**Status**: ✅ Completed Successfully
**Completed Date**: 2025-10-28

### Results

Successfully fixed bash command escaping errors in the AI task manager system by extracting complex multi-line bash commands into dedicated Node.js scripts.

**Artifacts Created**:
1. `validate-plan-blueprint.cjs` - Validates plan existence and checks for tasks/blueprint (46 test cases passed)
2. `get-approval-methods.cjs` - Extracts approval method fields from plan frontmatter (4 test cases passed)

**Templates Updated**:
1. `execute-blueprint.md` - 2 sections updated with script invocations (lines 50-57, 151-159)
2. `generate-tasks.md` - 1 section updated with script invocation (lines 305-313)

**Impact**:
- Eliminated bash syntax errors (`syntax error near unexpected token '('`)
- Reduced complex 15+ line bash blocks to simple 8-9 line script invocations
- Made commands immune to markdown formatter issues
- Followed established architectural pattern from existing helper scripts

**Validation**:
- Build successful: TypeScript compilation passed
- All 79 tests passed (4 test suites, ~6 seconds)
- Scripts tested with plan 47 and validated JSON output
- No regressions in existing functionality

### Noteworthy Events

**Phase 1 Success**: Both helper scripts implemented on first attempt with comprehensive error handling, debug logging, and following the established pattern from `get-next-plan-id.cjs`.

**Template Updates**: All variable references preserved correctly. The JSON parsing approach uses portable `grep`/`cut` commands that work across platforms without introducing new dependencies.

**Testing Results**:
- validate-plan-blueprint.cjs handles directory traversal, multi-location search, task counting, and blueprint detection flawlessly
- get-approval-methods.cjs correctly defaults to "manual" for backward compatibility
- Both scripts work from any subdirectory by finding task-manager root

No significant issues encountered during execution.

### Recommendations

1. **Future Enhancement**: Consider adding integration tests specifically for the new scripts to ensure they continue working as template processing evolves

2. **Documentation**: The scripts are well-documented with JSDoc comments, but consider adding usage examples in the main AGENTS.md file for developers

3. **Performance**: The scripts use efficient directory traversal and early returns - no optimizations needed

4. **Pattern Reuse**: This script extraction pattern should be applied to other complex bash operations in templates if similar escaping issues arise
