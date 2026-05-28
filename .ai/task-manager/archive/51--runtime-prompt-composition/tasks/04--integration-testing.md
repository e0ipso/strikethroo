---
id: 4
group: "quality-assurance"
dependencies: [2, 3]
status: "completed"
created: 2025-11-04
skills:
  - jest
---
# Integration Testing for Composed Workflows

## Objective
Create integration tests that verify the refactored orchestration commands execute completely without user intervention, covering both full-workflow and execute-blueprint scenarios.

## Skills Required
- **jest**: Writing and executing integration tests for CLI workflows

## Acceptance Criteria
- [ ] Test full-workflow executes all three steps without interruption
- [ ] Test execute-blueprint with missing tasks auto-generates them
- [ ] Test execute-blueprint with existing tasks skips generation
- [ ] Verify backward compatibility of standalone commands
- [ ] Confirm structured output formats are maintained
- [ ] All tests pass within the 3-second test suite execution target

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- **File Location**: `src/__tests__/orchestration.integration.test.ts` (new file)
- **Test Framework**: Jest
- **Test Approach**: Real filesystem operations (not mocked)
- **Scope**: Integration tests only - focus on workflow completion
- **Coverage**: Full-workflow and execute-blueprint with both task scenarios

## Input Dependencies
- Task 2: Refactored `full-workflow.md`
- Task 3: Refactored `execute-blueprint.md`
- Task 1: `compose-prompt.cjs` script
- Existing test patterns from `src/__tests__/cli.integration.test.ts`

## Output Artifacts
- `src/__tests__/orchestration.integration.test.ts`
- Passing integration tests demonstrating uninterrupted workflow execution

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Meaningful Test Strategy

Following the project's "write a few tests, mostly integration" philosophy:

**DO Test**:
- Full workflow completes without pauses (critical path)
- Task auto-generation in execute-blueprint (business logic)
- Backward compatibility of standalone commands (integration point)
- Structured output format preservation (contract verification)

**DON'T Test**:
- Individual markdown parsing (framework functionality)
- Variable substitution edge cases (unless critical failures observed)
- Progress indicator formatting (obvious functionality)

### Test Structure

```typescript
describe('Orchestration Workflows', () => {
  describe('full-workflow command', () => {
    it('should execute create-plan, generate-tasks, and execute-blueprint without interruption', async () => {
      // Execute full-workflow with test input
      // Verify plan created, tasks generated, blueprint executed
      // Confirm no user input prompts occurred
      // Check plan is archived
    });
  });

  describe('execute-blueprint command', () => {
    it('should auto-generate tasks when missing', async () => {
      // Create plan without tasks
      // Execute execute-blueprint
      // Verify tasks generated and execution completed
    });

    it('should skip generation when tasks exist', async () => {
      // Create plan and generate tasks
      // Execute execute-blueprint
      // Verify generation skipped and execution completed
    });
  });

  describe('backward compatibility', () => {
    it('should maintain standalone command functionality', async () => {
      // Execute /tasks:create-plan standalone
      // Verify it works as before refactoring
    });
  });
});
```

### Test Implementation Tips

1. **Use Temporary Directories**: Create isolated test environments
2. **Real Workflows**: Don't mock - test actual command execution
3. **Assertion Focus**: Verify workflow completion, not internal steps
4. **Fast Execution**: Keep tests under 3 seconds total
5. **Cleanup**: Remove test artifacts after each test

### Success Verification

Tests should verify:
- No SlashCommand tool invocations occur during execution
- Plan document exists in expected location
- Tasks directory contains generated tasks
- Blueprint execution completes all phases
- Archived plan in expected location after full-workflow

</details>
