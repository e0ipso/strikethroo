---
id: 2
group: "template-fixes"
dependencies: [1]
status: "completed"
created: "2025-10-19"
skills:
  - bash
---

# Verify Fix Works in ZSH Environment

## Objective

Test the corrected bash syntax in the actual ZSH environment to ensure the parsing error is resolved and task counting operations work correctly with both empty and non-empty task directories.

## Skills Required

- **bash**: Testing bash commands, understanding command substitution and error handling in ZSH

## Acceptance Criteria

- [ ] Test command executes successfully without parse errors in ZSH
- [ ] Task count for plan 43 (which has 2 tasks) returns correct count: `2`
- [ ] Task count for empty task directory returns correct count: `0`
- [ ] No regression in existing functionality (other bash commands still work)
- [ ] Full command chain executes successfully: find plan → get directory → count tasks

## Technical Requirements

**Test Environment:**
- ZSH shell (Claude Code Bash tool environment)
- Existing plan data (plan 43 in archive with 2 tasks)
- Template files with corrected syntax from Task 1

**Success Command:**
```bash
PLAN_FILE=$(find .ai/task-manager/plans .ai/task-manager/archive -name "plan-43--*.md" -type f) && PLAN_DIR=$(dirname "$PLAN_FILE") && TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l) && echo "Count: $TASK_COUNT"
```

**Expected Output:**
```
Count: 2
```

## Input Dependencies

- Task 1 completion: All template files updated with corrected bash syntax
- Plan 43 in archive directory with 2 task files
- ZSH shell environment for testing

## Output Artifacts

- Test execution results confirming the fix works
- Verification that no parse errors occur
- Confirmation that task counting logic works correctly

## Implementation Notes

<details>
<summary>Detailed Testing Steps</summary>

### Step 1: Verify Plan 43 Exists

First, confirm plan 43 exists and check its task count:

```bash
# Find plan 43
find .ai/task-manager/{plans,archive} -name "plan-43--*.md" -type f

# Check how many tasks it has
ls -la .ai/task-manager/archive/43--*/tasks/
```

### Step 2: Test Individual Command Components

Test each part of the command chain separately to isolate any issues:

```bash
# Test 1: Find plan file (with brace expansion alternative)
PLAN_FILE=$(find .ai/task-manager/plans .ai/task-manager/archive -name "plan-43--*.md" -type f)
echo "Plan file: $PLAN_FILE"

# Test 2: Get directory
PLAN_DIR=$(dirname "$PLAN_FILE")
echo "Plan directory: $PLAN_DIR"

# Test 3: Count tasks with NEW syntax (this was failing before)
TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l)
echo "Task count: $TASK_COUNT"
```

**Expected Output:**
```
Plan file: .ai/task-manager/archive/43--fix-full-workflow-approval-method/plan-43--fix-full-workflow-approval-method.md
Plan directory: .ai/task-manager/archive/43--fix-full-workflow-approval-method
Task count: 2
```

### Step 3: Test Full Command Chain

Run the complete command in one line:

```bash
PLAN_FILE=$(find .ai/task-manager/plans .ai/task-manager/archive -name "plan-43--*.md" -type f) && PLAN_DIR=$(dirname "$PLAN_FILE") && TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l) && echo "Count: $TASK_COUNT"
```

**Expected Output:**
```
Count: 2
```

**Verification:**
- No parse error `(eval):1: parse error near '('`
- Output shows `Count: 2`
- Command exits with success code 0

### Step 4: Test Edge Cases

Test with different scenarios to ensure robustness:

**Test 4a: Empty Task Directory**

Create a temporary plan with no tasks to test empty directory handling:

```bash
# Create test plan directory
mkdir -p /tmp/test-plan/tasks

# Test task counting with empty directory
PLAN_DIR="/tmp/test-plan"
TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l)
echo "Empty directory count: $TASK_COUNT"

# Cleanup
rm -rf /tmp/test-plan
```

**Expected Output:**
```
Empty directory count: 0
```

**Test 4b: Non-existent Directory**

Test error handling when directory doesn't exist:

```bash
PLAN_DIR="/tmp/nonexistent"
TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l)
echo "Nonexistent directory count: $TASK_COUNT"
```

**Expected Output:**
```
Nonexistent directory count: 0
```

(Should not produce errors due to `2>/dev/null`)

### Step 5: Test with Current Plan (Plan 44)

Test the command with the current plan (which should have 2 tasks after this workflow completes):

```bash
PLAN_FILE=$(find .ai/task-manager/plans .ai/task-manager/archive -name "plan-44--*.md" -type f) && PLAN_DIR=$(dirname "$PLAN_FILE") && TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l) && echo "Count: $TASK_COUNT"
```

**Expected Output:**
```
Count: 2
```

### Step 6: Verify No Regression

Test other bash patterns in templates to ensure no unintended side effects:

```bash
# Test that quoted variables still work in non-glob contexts
PLAN_FILE=$(find .ai/task-manager/plans .ai/task-manager/archive -name "plan-43--*.md" -type f)
PLAN_DIR=$(dirname "$PLAN_FILE")
echo "Directory: $PLAN_DIR"
```

This should still work correctly (quotes are appropriate here).

### Step 7: Document Test Results

Create a summary of all test results:

1. ✓ Individual command components work
2. ✓ Full command chain executes without parse errors
3. ✓ Correct task count for plan 43: 2
4. ✓ Empty directory returns count: 0
5. ✓ Non-existent directory handled gracefully: 0
6. ✓ No regression in other command patterns

### Troubleshooting

If tests fail:

1. **Parse error still occurs:**
   - Verify all template files were updated in Task 1
   - Check for any missed instances of `"$PLAN_DIR"/` pattern
   - Ensure correct syntax: `${PLAN_DIR}/` not `"$PLAN_DIR"/`

2. **Incorrect task count:**
   - Verify plan 43 actually has 2 task files
   - Check file permissions on task directory
   - Ensure `*.md` glob pattern is correct

3. **Command not found errors:**
   - Verify all command components are available (ls, wc, find, dirname)
   - Check PATH environment variable

</details>

---

## Verification Results

### Executive Summary

**Status:** FAILED - Task 1 fix does not resolve the ZSH parsing error

**Root Cause:** The issue is NOT related to quoting of `$PLAN_DIR`. The actual problem is that `wc -l` in a pipe inside command substitution causes parse errors in the Claude Code Bash tool's ZSH environment.

### Test Results

#### Test 1: Original Syntax (Quoted Variable)
```bash
TASK_COUNT=$(ls "$PLAN_DIR"/tasks/*.md 2>/dev/null | wc -l)
```
**Result:** ❌ Parse error: `(eval):1: parse error near '('`

#### Test 2: Task 1 Fix (Unquoted Variable)
```bash
TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l)
```
**Result:** ❌ Parse error: `(eval):1: parse error near '('` (SAME ERROR)

#### Test 3: Simplified Test (No glob pattern)
```bash
COUNT=$(echo "test" | wc -l)
```
**Result:** ❌ Parse error: `(eval):1: parse error near '('`

**Conclusion:** The quoting of `$PLAN_DIR` is irrelevant. The issue is `wc` in command substitution.

### Working Solution

**Array-based counting with null_glob:**
```bash
PLAN_FILE=$(find .ai/task-manager/plans .ai/task-manager/archive -name "plan-43--*.md" -type f)
PLAN_DIR=$(dirname "$PLAN_FILE")
setopt null_glob
TASK_FILES=(${PLAN_DIR}/tasks/*.md)
TASK_COUNT=${#TASK_FILES[@]}
echo "Count: $TASK_COUNT"
```

#### Verification Tests with Working Solution

**Test 1: Plan 43 (2 tasks)**
```bash
Result: ✅ Count: 2 (CORRECT)
```

**Test 2: Plan 44 (2 tasks)**
```bash
Result: ✅ Count: 2 (CORRECT)
```

**Test 3: Empty directory**
```bash
Result: ✅ Count: 0 (CORRECT)
```

### Recommendations

1. **Revert Task 1 changes** - The quoting change provides no benefit
2. **Apply proper fix** - Replace all `ls ... | wc -l` with array-based counting
3. **Update template files** with the following pattern:
   ```bash
   # Old (broken in ZSH):
   TASK_COUNT=$(ls ${PLAN_DIR}/tasks/*.md 2>/dev/null | wc -l)

   # New (works in ZSH):
   setopt null_glob
   TASK_FILES=(${PLAN_DIR}/tasks/*.md)
   TASK_COUNT=${#TASK_FILES[@]}
   ```

### Files Requiring Updates

1. `templates/assistant/commands/tasks/execute-blueprint.md`
2. `templates/assistant/commands/tasks/generate-tasks.md`
3. All generated command files (`.claude/`, `.gemini/`, `.opencode/`)

### Impact Assessment

- **Severity:** High - Core task management functionality is broken in ZSH
- **Scope:** All task counting operations across all templates
- **Urgency:** Critical - Affects current plan execution (Plan 44)

</details>
