---
id: 4
group: "validation"
dependencies: [1, 2, 3]
status: "completed"
created: 2025-10-17
skills:
  - testing
---
# Test Both Standalone and Full-Workflow Execution Modes

## Objective
Validate that the template changes work correctly in both standalone command execution and full-workflow mode, ensuring no regressions and proper continuous execution.

## Skills Required
- **testing**: Manual testing and validation of command behavior

## Acceptance Criteria
- [ ] Standalone create-plan still prompts for review
- [ ] Full-workflow executes without pausing between commands
- [ ] Error handling works correctly in both modes
- [ ] Clarification questions still pause execution when needed
- [ ] All test scenarios documented and pass

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Test environment with updated templates
- Ability to run both `/tasks:create-plan` and `/tasks:full-workflow`
- Simple test prompts for validation
- Documentation of test results

## Input Dependencies
- Task 01: Updated full-workflow template
- Task 02: Updated create-plan template
- Task 03: Audit and fixes for other commands

## Output Artifacts
- Test execution report
- Documentation of any issues found
- Confirmation that both modes work as expected

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

**Test Scenario 1: Standalone create-plan Execution**

1. **Setup**: Ensure FULL_WORKFLOW_MODE is NOT set
   ```bash
   unset FULL_WORKFLOW_MODE
   ```

2. **Execute**: Run standalone create-plan
   ```
   /tasks:create-plan Implement a simple hello world function
   ```

3. **Expected Behavior**:
   - Plan should be created successfully
   - Output should include instruction to review plan document
   - Should see file path to plan document
   - Example: "Plan created. Please review: `.ai/task-manager/plans/XX--hello-world/plan-XX--hello-world.md`"

4. **Validation**: Confirm review instruction appears

**Test Scenario 2: Full-Workflow Execution (Success Path)**

1. **Execute**: Run full-workflow command
   ```
   /tasks:full-workflow Implement a simple calculator function
   ```

2. **Expected Behavior**:
   - Step 1: Plan creation completes with "Plan X created successfully"
   - NO pause for review
   - Step 2: Tasks auto-generated
   - NO pause for review
   - Step 3: Blueprint execution begins
   - Workflow continues to completion
   - Final summary displayed

3. **Validation**:
   - Confirm NO user prompts between steps
   - Execution flows continuously
   - No "Continue" prompts appear

**Test Scenario 3: Full-Workflow with Clarification Questions**

1. **Execute**: Run full-workflow with ambiguous prompt
   ```
   /tasks:full-workflow Add authentication
   ```

2. **Expected Behavior**:
   - create-plan asks clarification questions
   - Execution PAUSES for user input (this is correct)
   - After clarifications answered, workflow continues
   - NO additional pauses after plan creation

3. **Validation**:
   - Clarification pause is intentional and correct
   - Post-clarification execution is continuous

**Test Scenario 4: Error Handling**

1. **Execute**: Test with intentionally invalid input or create error condition

2. **Expected Behavior**:
   - Error reported clearly
   - Execution halts with useful error message
   - No inappropriate pauses
   - Same behavior in both modes

3. **Validation**:
   - Errors handled gracefully
   - Messages are clear
   - Both modes behave appropriately

**Test Scenario 5: Environment Variable Propagation**

1. **Verify**: Check that FULL_WORKFLOW_MODE is visible to create-plan
   - Add temporary debug output in create-plan template
   - Confirm variable is accessible

2. **Expected Behavior**:
   - Variable set by full-workflow is readable by create-plan
   - If not visible, this indicates the environment variable approach won't work

3. **Validation**:
   - Confirm variable propagation works
   - If it doesn't, document the issue and recommend switching to Approach B (instruction-based detection)

**Documentation Template**

```markdown
# Test Execution Report

## Test Environment
- Date: [YYYY-MM-DD]
- Templates version: [after updates]

## Test Results

### Scenario 1: Standalone create-plan
- Status: [PASS/FAIL]
- Notes: [observations]

### Scenario 2: Full-workflow (success path)
- Status: [PASS/FAIL]
- Pauses observed: [yes/no, where]
- Notes: [observations]

### Scenario 3: Full-workflow (with clarifications)
- Status: [PASS/FAIL]
- Clarification pause: [correct/incorrect]
- Post-clarification pauses: [yes/no]
- Notes: [observations]

### Scenario 4: Error handling
- Status: [PASS/FAIL]
- Notes: [observations]

### Scenario 5: Environment variable
- Status: [PASS/FAIL]
- Variable visible: [yes/no]
- Notes: [observations]

## Issues Found
[List any problems discovered]

## Recommendations
[Any suggested improvements or follow-up actions]

## Overall Assessment
[PASS/FAIL with summary]
```

**Critical Success Indicators**:
1. Full-workflow runs without ANY pauses except for clarifications
2. Standalone create-plan still provides helpful review instructions
3. No regressions in error handling or existing functionality
4. Environment variable approach works reliably

**If Tests Fail**:
- Document the specific failure
- Investigate root cause
- Apply fixes to templates
- Re-test until all scenarios pass

</details>
