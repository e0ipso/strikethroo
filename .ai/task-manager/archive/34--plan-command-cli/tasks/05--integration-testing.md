---
id: 5
group: "quality-assurance"
dependencies: [1, 3, 4]
status: "completed"
created: "2025-10-16"
skills:
  - jest
  - typescript
---
# Integration Testing

## Objective
Create integration tests for the plan command's show and archive subcommands, covering critical workflows and edge cases while following the project's testing philosophy of "write a few tests, mostly integration."

## Skills Required
- Jest testing framework
- TypeScript for test implementation

## Acceptance Criteria
- [ ] Integration test for show command with real filesystem operations
- [ ] Integration test for archive command workflow
- [ ] Edge case tests: plan not found, already archived, invalid ID
- [ ] Test validates visual output contains expected sections
- [ ] Test validates archive operations (task updates, note appending, directory move)
- [ ] All existing tests continue to pass
- [ ] Test file follows existing patterns from status.test.ts
- [ ] Tests use real file operations (not mocks) per project philosophy

## Technical Requirements
- Test file: `src/__tests__/plan.test.ts`
- Use Jest with fs-extra for filesystem setup/teardown
- Create temporary test directories for integration tests
- Follow testing patterns from `src/__tests__/status.test.ts`
- Test critical paths, not framework functionality
- Focus on business logic and integration points

## Input Dependencies
- Task 1: CLI command registration
- Task 3: Show subcommand implementation
- Task 4: Archive subcommand implementation

## Output Artifacts
- `src/__tests__/plan.test.ts` with integration tests
- All tests passing in CI

## Implementation Notes

<details>
<summary>Click to expand detailed implementation guidance</summary>

### Meaningful Test Strategy Guidelines

**IMPORTANT**: Your critical mantra for test generation is: "write a few tests, mostly integration".

**Definition of "Meaningful Tests":**
Tests that verify custom business logic, critical paths, and edge cases specific to the application. Focus on testing YOUR code, not the framework or library functionality.

**When TO Write Tests:**
- Custom business logic and algorithms
- Critical user workflows and data transformations
- Edge cases and error conditions for core functionality
- Integration points between different system components
- Complex validation logic or calculations

**When NOT to Write Tests:**
- Third-party library functionality (already tested upstream)
- Framework features (React hooks, Express middleware, etc.)
- Simple CRUD operations without custom logic
- Getter/setter methods or basic property access
- Configuration files or static data
- Obvious functionality that would break immediately if incorrect

### Test File Structure

```typescript
/**
 * Integration tests for plan command functionality
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { showPlan, archivePlan } from '../plan';
import { loadPlanData } from '../plan-utils';

describe('Plan Command Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-plans');
  const plansDir = path.join(testDir, '.ai/task-manager/plans');
  const archiveDir = path.join(testDir, '.ai/task-manager/archive');

  beforeEach(async () => {
    // Create test directory structure
    await fs.ensureDir(plansDir);
    await fs.ensureDir(archiveDir);

    // Change working directory for tests
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directories
    await fs.remove(testDir);

    // Restore working directory
    process.chdir(path.join(__dirname, '..', '..'));
  });

  describe('Show Command', () => {
    it('should display plan metadata and executive summary for active plan', async () => {
      // Create test plan
      await createTestPlan(1, 'Test Plan', false);

      const result = await showPlan(1);

      expect(result.success).toBe(true);
      // Additional assertions for output verification
    });

    it('should display plan for archived plan', async () => {
      await createTestPlan(2, 'Archived Plan', true);

      const result = await showPlan(2);

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent plan', async () => {
      const result = await showPlan(999);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle plan with no tasks', async () => {
      await createTestPlan(3, 'Empty Plan', false, []);

      const result = await showPlan(3);

      expect(result.success).toBe(true);
    });

    it('should display task progress correctly', async () => {
      await createTestPlan(4, 'Plan with Tasks', false, [
        { id: 1, status: 'completed' },
        { id: 2, status: 'pending' },
        { id: 3, status: 'completed' },
      ]);

      const planData = await loadPlanData(4);

      expect(planData?.tasks.length).toBe(3);
      expect(planData?.tasks.filter(t => t.status === 'completed').length).toBe(2);
    });
  });

  describe('Archive Command', () => {
    it('should archive plan with all required operations', async () => {
      await createTestPlan(5, 'Plan to Archive', false, [
        { id: 1, status: 'completed' },
        { id: 2, status: 'pending' },
      ]);

      // Mock user confirmation (needs implementation consideration)
      const result = await archivePlan(5);

      expect(result.success).toBe(true);

      // Verify plan moved to archive
      const archivedExists = await fs.pathExists(
        path.join(archiveDir, '05--plan-to-archive')
      );
      expect(archivedExists).toBe(true);

      // Verify tasks updated to completed
      const planData = await loadPlanData(5);
      expect(planData?.isArchived).toBe(true);
      expect(planData?.tasks.every(t => t.status === 'completed')).toBe(true);

      // Verify archive note appended
      const planFile = path.join(archiveDir, '05--plan-to-archive', 'plan-05--plan-to-archive.md');
      const content = await fs.readFile(planFile, 'utf-8');
      expect(content).toContain('Manually archived on');
    });

    it('should return error for already archived plan', async () => {
      await createTestPlan(6, 'Already Archived', true);

      const result = await archivePlan(6);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already archived');
    });

    it('should return error for non-existent plan', async () => {
      const result = await archivePlan(999);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });
});
```

### Test Helper Functions

```typescript
/**
 * Create a test plan with tasks
 */
async function createTestPlan(
  id: number,
  title: string,
  isArchived: boolean,
  tasks: Array<{ id: number; status: string }> = []
) {
  const planDirName = `${id.toString().padStart(2, '0')}--${title.toLowerCase().replace(/\s+/g, '-')}`;
  const planDir = path.join(isArchived ? archiveDir : plansDir, planDirName);

  await fs.ensureDir(planDir);

  // Create plan file
  const planContent = `---
id: ${id}
summary: "${title}"
created: "2025-10-16"
---

# Plan: ${title}

## Executive Summary

This is a test plan for integration testing.

## Context

Test content.
`;

  await fs.writeFile(
    path.join(planDir, `plan-${planDirName}.md`),
    planContent,
    'utf-8'
  );

  // Create tasks
  if (tasks.length > 0) {
    const tasksDir = path.join(planDir, 'tasks');
    await fs.ensureDir(tasksDir);

    for (const task of tasks) {
      const taskContent = `---
id: ${task.id}
group: "test"
dependencies: []
status: "${task.status}"
created: "2025-10-16"
skills: ["test"]
---
# Test Task ${task.id}

Test content.
`;

      await fs.writeFile(
        path.join(tasksDir, `${task.id.toString().padStart(2, '0')}--test-task.md`),
        taskContent,
        'utf-8'
      );
    }
  }
}
```

### Mock Considerations

For the archive command's user confirmation prompt:
- Consider using dependency injection to make `promptConfirmation` mockable
- Or create a test mode flag that auto-confirms
- Or use Jest's stdin mocking capabilities

Example approach:

```typescript
// In src/plan.ts
export async function archivePlan(
  planId: number,
  autoConfirm: boolean = false
): Promise<{ success: boolean; message?: string }> {
  // ... existing code ...

  if (incompleteTasks.length > 0) {
    if (autoConfirm) {
      // Skip confirmation in test mode
    } else {
      const confirmed = await promptConfirmation('Archive anyway? (y/n): ');
      // ... existing code ...
    }
  }
}
```

### Test Coverage Goals

Focus on:
- ✅ Critical path: show active plan works
- ✅ Critical path: archive plan with all operations
- ✅ Edge case: plan not found
- ✅ Edge case: already archived
- ✅ Business logic: task statistics calculation
- ✅ Integration: file system operations

Don't test:
- ❌ Chalk color formatting (framework functionality)
- ❌ Gray-matter YAML parsing (library functionality)
- ❌ fs-extra move operations (library functionality)
- ❌ Simple getter methods

</details>
