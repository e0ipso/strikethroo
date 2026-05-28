---
id: 2
group: "core-fix"
dependencies: [1]
status: "completed"
created: 2025-11-10
skills:
  - testing
---
# Test and Validate Plan ID Handling Fix

## Objective

Verify that the refactored `findPlanDirectory` function correctly handles both padded and unpadded plan IDs through manual testing and validation against success criteria.

## Skills Required

- **Testing**: Execute test scenarios and validate results

## Acceptance Criteria

- [ ] Script successfully finds plan directory with unpadded ID `3`
- [ ] Script successfully finds plan directory with padded ID `03`
- [ ] Both invocations produce identical output
- [ ] No regressions in existing functionality
- [ ] Error messages remain clear and helpful

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Test scenarios**:

1. **Unpadded ID test** (the failing case from the bug report):
   ```bash
   node templates/ai-task-manager/config/scripts/check-task-dependencies.cjs 55 1
   ```
   Expected: Successfully finds plan 55 directory

2. **Padded ID test** (existing working behavior):
   ```bash
   node templates/ai-task-manager/config/scripts/check-task-dependencies.cjs 55 1
   ```
   Expected: Successfully finds plan 55 directory

3. **Non-existent plan test**:
   ```bash
   node templates/ai-task-manager/config/scripts/check-task-dependencies.cjs 999 1
   ```
   Expected: Clear error message "Plan with ID 999 not found"

4. **Edge cases**:
   - Double-digit IDs (if available in test environment)
   - Plan in archive directory (if available)

## Input Dependencies

- Completed Task 1: Refactored `findPlanDirectory` function
- Plan 55 directory exists for testing

## Output Artifacts

- Verification that all test scenarios pass
- Confirmation of backward compatibility

## Implementation Notes

<details>
<summary>Testing instructions</summary>

### Manual Test Execution

Run each test scenario and document results:

```bash
# Primary test: Unpadded ID (this plan as test subject)
echo "Test 1: Unpadded ID"
node templates/ai-task-manager/config/scripts/check-task-dependencies.cjs 55 1
echo "---"

# Verify output shows:
# - "Found plan directory: .ai/task-manager/plans/55--fix-check-task-dependencies-plan-id-handling"
# - Task dependency check results

# Edge case: Non-existent plan
echo "Test 2: Non-existent plan"
node templates/ai-task-manager/config/scripts/check-task-dependencies.cjs 999 1
echo "---"

# Verify output shows:
# - "ERROR: Plan with ID 999 not found"
# - Exit code 1
```

### Validation Checklist

After running tests, confirm:

1. **Functional correctness**:
   - ✓ Unpadded IDs work correctly
   - ✓ Padded IDs continue to work
   - ✓ Non-existent plans produce clear errors

2. **Output quality**:
   - ✓ Output format unchanged
   - ✓ Error messages remain helpful
   - ✓ Color coding preserved (if chalk available)

3. **Performance**:
   - ✓ Execution time comparable to original
   - ✓ No noticeable slowdown

4. **Edge cases**:
   - ✓ Single-digit IDs handled correctly
   - ✓ Double-digit IDs handled correctly
   - ✓ Archive directory searches work

### Success Validation

If all tests pass:
1. Update task status to `completed`
2. Document test results in task notes
3. Confirm fix addresses original bug report

If any tests fail:
1. Document failure details
2. Return to Task 1 for adjustments
3. Re-test after fixes applied

### Comparison with Original Bug Report

The original error was:
```
● Bash(node .ai/task-manager/config/scripts/check-task-dependencies.cjs 3 1)
  ⎿  Error: Exit code 1
     ERROR: Plan with ID 3 not found
```

After fix, the same command should produce:
```
● Bash(node .ai/task-manager/config/scripts/check-task-dependencies.cjs 3 1)
  ⎿  Found plan directory: .ai/task-manager/plans/03--oauth-scope-management
     Checking task: 01--install-simple-oauth-module.md

     ✓ Task has no dependencies - ready to execute!
```

</details>
