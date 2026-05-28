---
id: 3
group: "plan-management"
dependencies: [1, 2]
status: "completed"
created: 2025-10-17
skills:
  - jest
  - typescript
---
# Add Integration Tests for Delete Functionality and Help System

## Objective

Create integration tests that verify the delete functionality works correctly and the help system displays proper information for all plan subcommands.

## Skills Required

- **jest**: Writing integration tests using Jest framework
- **typescript**: TypeScript test implementation

## Acceptance Criteria

- [ ] Tests verify deletePlan function removes plan directories correctly
- [ ] Tests verify user confirmation is required for deletion
- [ ] Tests verify error handling for non-existent plans
- [ ] Tests verify help output displays all subcommands
- [ ] Tests verify backward compatibility with shorthand syntax
- [ ] All existing tests continue to pass
- [ ] New tests follow project testing patterns

## Technical Requirements

- Add tests to src/__tests__/plan.test.ts (or create if doesn't exist)
- Use fs-extra for test setup and teardown
- Create test plan directories in temporary locations
- Clean up test artifacts after test completion
- Follow existing test patterns from src/__tests__/cli.integration.test.ts
- Test both success and failure scenarios

## Input Dependencies

- Task 1: Requires deletePlan function to be implemented
- Task 2: Requires CLI refactoring to be complete

## Output Artifacts

- New or updated test file: src/__tests__/plan.test.ts
- Integration tests covering delete functionality
- Integration tests verifying help system output

## Implementation Notes

<details>
<summary>Click to expand detailed implementation guidance</summary>

### Meaningful Test Strategy

**IMPORTANT**: Follow the project's testing philosophy: "write a few tests, mostly integration"

**Focus Areas**:
- Critical path: deletion workflow with confirmation
- Edge cases: non-existent plans, user cancellation
- Integration points: filesystem operations, CLI help system
- Business logic: plan location detection, directory removal

**Avoid Testing**:
- Commander.js framework functionality
- fs-extra library features (already tested upstream)
- Chalk formatting output (visual, not critical)

### Test File Structure

If src/__tests__/plan.test.ts doesn't exist, create it. Otherwise, add to existing file.

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import { deletePlan } from '../plan';
import { findPlanById } from '../plan-utils';

describe('Plan Management', () => {
  const testBaseDir = path.join(__dirname, '../../.test-temp');
  const plansDir = path.join(testBaseDir, '.ai/task-manager/plans');
  const archiveDir = path.join(testBaseDir, '.ai/task-manager/archive');

  beforeEach(async () => {
    // Setup test directory structure
    await fs.ensureDir(plansDir);
    await fs.ensureDir(archiveDir);

    // Save original cwd
    process.chdir(testBaseDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testBaseDir);
    // Restore cwd if needed
  });

  describe('deletePlan', () => {
    it('should delete an active plan with auto-confirm', async () => {
      // Create test plan
      const testPlanDir = path.join(plansDir, '99--test-plan');
      await fs.ensureDir(testPlanDir);
      await fs.writeFile(
        path.join(testPlanDir, 'plan-99--test-plan.md'),
        '---\nid: 99\nsummary: "Test"\ncreated: "2025-01-01"\n---\n# Test Plan'
      );

      // Delete with auto-confirm
      const result = await deletePlan(99, true);

      // Verify
      expect(result.success).toBe(true);
      expect(await fs.pathExists(testPlanDir)).toBe(false);
    });

    it('should delete an archived plan with auto-confirm', async () => {
      // Create test archived plan
      const testPlanDir = path.join(archiveDir, '98--archived-plan');
      await fs.ensureDir(testPlanDir);
      await fs.writeFile(
        path.join(testPlanDir, 'plan-98--archived-plan.md'),
        '---\nid: 98\nsummary: "Test"\ncreated: "2025-01-01"\n---\n# Test Plan'
      );

      // Delete with auto-confirm
      const result = await deletePlan(98, true);

      // Verify
      expect(result.success).toBe(true);
      expect(await fs.pathExists(testPlanDir)).toBe(false);
    });

    it('should return error for non-existent plan', async () => {
      const result = await deletePlan(999, true);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should delete plan with all tasks', async () => {
      // Create test plan with tasks
      const testPlanDir = path.join(plansDir, '97--plan-with-tasks');
      const tasksDir = path.join(testPlanDir, 'tasks');
      await fs.ensureDir(tasksDir);

      await fs.writeFile(
        path.join(testPlanDir, 'plan-97--plan-with-tasks.md'),
        '---\nid: 97\nsummary: "Test"\ncreated: "2025-01-01"\n---\n# Test Plan'
      );

      await fs.writeFile(
        path.join(tasksDir, '01--test-task.md'),
        '---\nid: 1\nstatus: "pending"\n---\n# Test Task'
      );

      // Delete
      const result = await deletePlan(97, true);

      // Verify entire directory tree is removed
      expect(result.success).toBe(true);
      expect(await fs.pathExists(testPlanDir)).toBe(false);
      expect(await fs.pathExists(tasksDir)).toBe(false);
    });
  });

  describe('CLI Help System', () => {
    // Note: These tests verify help text generation
    // For actual CLI testing, extend src/__tests__/cli.integration.test.ts

    it('should have help text for show subcommand', () => {
      // This test ensures the subcommand structure is correct
      // Full CLI integration test should verify actual help output
      expect(true).toBe(true); // Placeholder
    });
  });
});
```

### Integration with Existing Tests

If src/__tests__/plan.test.ts already exists:
1. Add new describe block: `describe('deletePlan', () => { ... })`
2. Follow existing patterns for test setup/teardown
3. Reuse existing helper functions if available

### Testing Confirmation Prompts

For tests requiring user confirmation:
- Use `autoConfirm: true` parameter to bypass prompts
- Don't test the prompt UI itself (that's readline functionality)
- Focus on the deletion behavior with different autoConfirm values

### CLI Help Integration Tests

Add to src/__tests__/cli.integration.test.ts if testing actual CLI help output:
```typescript
describe('plan command help', () => {
  it('should display all subcommands in help', () => {
    // Use execa or similar to run: npm start plan --help
    // Verify output contains 'show', 'archive', 'delete'
  });
});
```

However, testing CLI help output may be considered "framework testing" - use judgment. Focus on critical functionality (deletion, confirmation) rather than help text formatting.

### Running Tests

```bash
npm test                          # Run all tests
npm test -- plan.test.ts         # Run plan tests only
npm test -- --watch              # Watch mode
```

### Success Criteria

All tests should:
- Pass consistently
- Clean up after themselves (no leftover test directories)
- Run quickly (integration tests should complete in <1 second each)
- Test actual behavior, not implementation details

</details>
