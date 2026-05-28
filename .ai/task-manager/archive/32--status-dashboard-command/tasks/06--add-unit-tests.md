---
id: 6
group: "testing"
dependencies: [5]
status: "completed"
created: "2025-10-16"
skills:
  - "jest"
  - "typescript"
---
# Add Unit Tests for Status Command

## Objective
Create meaningful unit tests for statistics calculation and critical data transformation logic to ensure accuracy and reliability.

## Skills Required
- Jest testing framework
- TypeScript

## Acceptance Criteria
- [ ] Create `src/__tests__/status.test.ts` test file
- [ ] Test statistics calculation with various data scenarios
- [ ] Test edge cases (empty data, missing fields, corrupted data)
- [ ] Test plan status categorization logic
- [ ] All tests pass successfully
- [ ] Tests follow the "write a few tests, mostly integration" philosophy

## Technical Requirements

**IMPORTANT: Meaningful Test Strategy Guidelines**

Your critical mantra for test generation is: "write a few tests, mostly integration".

**Definition of "Meaningful Tests":**
Tests that verify custom business logic, critical paths, and edge cases specific to the application. Focus on testing YOUR code, not the framework or library functionality.

**When TO Write Tests:**
- Custom business logic: Statistics calculations, plan status categorization
- Critical user workflows: Dashboard data collection and formatting
- Edge cases: Empty data, missing directories, malformed files
- Complex validation logic: Task completion rate calculations

**When NOT to Write Tests:**
- Third-party library functionality (gray-matter, chalk, fs-extra)
- Framework features (Commander.js command parsing)
- Simple data transformations or property access
- Visual formatting output (subjective, better tested manually)

Focus on testing:
1. Statistics calculation logic
2. Plan status categorization
3. Edge case handling
4. Data transformation correctness

## Input Dependencies
- Completed `src/status.ts` from previous tasks
- Existing Jest test infrastructure

## Output Artifacts
- `src/__tests__/status.test.ts` with meaningful unit tests
- All tests passing in CI/CD

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Test File Structure
```typescript
import { calculateStatistics, categorizePlanStatus } from '../status';
import { PlanMetadata, TaskMetadata, DashboardStatistics } from '../types';

describe('Status Dashboard Statistics', () => {
  // Test data helpers
  const createPlan = (overrides: Partial<PlanMetadata>): PlanMetadata => ({
    id: 1,
    summary: 'Test plan',
    created: '2025-01-01',
    isArchived: false,
    directoryPath: '/test',
    tasks: [],
    ...overrides
  });

  const createTask = (status: string, id: number = 1): TaskMetadata => ({
    id,
    status: status as any
  });

  // Tests follow...
});
```

### Test 1: Empty Data Handling
```typescript
describe('calculateStatistics with empty data', () => {
  it('should return zero counts for empty plans array', () => {
    const stats = calculateStatistics([]);

    expect(stats.totalPlans).toBe(0);
    expect(stats.activePlans).toBe(0);
    expect(stats.archivedPlans).toBe(0);
    expect(stats.taskCompletionRate).toBe(0);
    expect(stats.mostRecentPlan).toBeUndefined();
    expect(stats.oldestPlan).toBeUndefined();
  });
});
```

### Test 2: Basic Statistics Calculation
```typescript
describe('calculateStatistics with mixed plans', () => {
  it('should correctly count active and archived plans', () => {
    const plans = [
      createPlan({ id: 1, isArchived: false }),
      createPlan({ id: 2, isArchived: false }),
      createPlan({ id: 3, isArchived: true })
    ];

    const stats = calculateStatistics(plans);

    expect(stats.totalPlans).toBe(3);
    expect(stats.activePlans).toBe(2);
    expect(stats.archivedPlans).toBe(1);
  });

  it('should calculate task completion rate correctly', () => {
    const plans = [
      createPlan({
        id: 1,
        isArchived: false,
        tasks: [
          createTask('completed', 1),
          createTask('completed', 2),
          createTask('pending', 3),
          createTask('in-progress', 4)
        ]
      })
    ];

    const stats = calculateStatistics(plans);
    expect(stats.taskCompletionRate).toBe(50); // 2/4 = 50%
  });

  it('should only count active plans for completion rate', () => {
    const plans = [
      createPlan({
        id: 1,
        isArchived: false,
        tasks: [createTask('completed', 1), createTask('pending', 2)]
      }),
      createPlan({
        id: 2,
        isArchived: true,
        tasks: [createTask('completed', 1), createTask('completed', 2)]
      })
    ];

    const stats = calculateStatistics(plans);
    expect(stats.taskCompletionRate).toBe(50); // Only count active plan
  });
});
```

### Test 3: Plan Status Categorization
```typescript
describe('categorizePlanStatus', () => {
  it('should categorize plan with no tasks as "noTasks"', () => {
    const plan = createPlan({ tasks: [] });
    expect(categorizePlanStatus(plan)).toBe('noTasks');
  });

  it('should categorize plan with all pending tasks as "notStarted"', () => {
    const plan = createPlan({
      tasks: [
        createTask('pending', 1),
        createTask('pending', 2)
      ]
    });
    expect(categorizePlanStatus(plan)).toBe('notStarted');
  });

  it('should categorize plan with all completed tasks as "completed"', () => {
    const plan = createPlan({
      tasks: [
        createTask('completed', 1),
        createTask('completed', 2)
      ]
    });
    expect(categorizePlanStatus(plan)).toBe('completed');
  });

  it('should categorize plan with mixed statuses as "inProgress"', () => {
    const plan = createPlan({
      tasks: [
        createTask('completed', 1),
        createTask('pending', 2),
        createTask('in-progress', 3)
      ]
    });
    expect(categorizePlanStatus(plan)).toBe('inProgress');
  });
});
```

### Test 4: Timeline Detection
```typescript
describe('timeline detection', () => {
  it('should identify most recent and oldest plans', () => {
    const plans = [
      createPlan({ id: 1, created: '2025-01-01' }),
      createPlan({ id: 2, created: '2025-03-15' }),
      createPlan({ id: 3, created: '2024-12-01' })
    ];

    const stats = calculateStatistics(plans);

    expect(stats.mostRecentPlan?.id).toBe(2);
    expect(stats.oldestPlan?.id).toBe(3);
  });
});
```

### Test 5: Edge Cases
```typescript
describe('edge cases', () => {
  it('should handle plan with zero tasks for completion rate', () => {
    const plans = [createPlan({ tasks: [] })];
    const stats = calculateStatistics(plans);
    expect(stats.taskCompletionRate).toBe(0);
  });

  it('should handle all tasks completed', () => {
    const plans = [
      createPlan({
        tasks: [
          createTask('completed', 1),
          createTask('completed', 2)
        ]
      })
    ];
    const stats = calculateStatistics(plans);
    expect(stats.taskCompletionRate).toBe(100);
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run status tests specifically
npm test status.test.ts

# Run in watch mode
npm run test:watch
```

### What NOT to Test
❌ Don't test:
- Chalk color formatting output (visual, subjective)
- fs-extra file reading (third-party library)
- gray-matter YAML parsing (third-party library)
- Commander.js command parsing (framework)
- Console.log output (side effect, not business logic)

✅ Do test:
- Statistics calculations
- Plan status categorization
- Data transformation logic
- Edge case handling
- Percentage calculations

### Test Philosophy Reminder
Following the project's "write a few tests, mostly integration" approach:
- ~10-15 focused tests covering critical logic
- Focus on business logic, not framework functionality
- Integration test with real file structure in separate test if needed
- Keep tests simple and maintainable

</details>
