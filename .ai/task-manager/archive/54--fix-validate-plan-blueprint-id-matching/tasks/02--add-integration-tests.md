---
id: 2
group: "testing"
dependencies: [1]
status: "completed"
created: 2025-11-09
skills:
  - testing
---
# Add Integration Tests for Flexible Plan ID Matching

## Objective

Create integration tests that validate the flexible plan ID matching functionality works correctly for both zero-padded and non-padded inputs, ensuring the fix resolves the reported issue.

## Skills Required

- **Testing**: Jest test framework, integration testing patterns, file system mocking/fixtures

## Acceptance Criteria

- [ ] Test validates non-padded ID "2" finds plan "02--name"
- [ ] Test validates padded ID "02" finds plan "02--name"
- [ ] Test validates non-padded ID "54" finds plan "54--name" (no padding)
- [ ] Test validates invalid ID "abc" produces appropriate error
- [ ] Test validates all field outputs (planFile, planDir, taskCount, blueprintExists)
- [ ] All existing tests continue to pass

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Test file location**: `src/__tests__/validate-plan-blueprint.test.ts` (create if doesn't exist)

**Test framework**: Jest (already configured in project)

**Test approach**: Integration tests with real file system fixtures

**Test coverage**:
```javascript
describe('validate-plan-blueprint flexible ID matching', () => {
  test('accepts non-padded ID for zero-padded directory');
  test('accepts zero-padded ID for zero-padded directory');
  test('accepts non-padded ID for non-padded directory');
  test('rejects invalid non-numeric IDs gracefully');
  test('outputs correct planFile path for all ID formats');
  test('outputs correct planDir path for all ID formats');
  test('outputs correct taskCount for all ID formats');
  test('outputs correct blueprintExists for all ID formats');
});
```

## Input Dependencies

- Updated validate-plan-blueprint.cjs with flexible ID matching (from Task 1)
- Existing test infrastructure and patterns from `src/__tests__/`

## Output Artifacts

- New test file: `src/__tests__/validate-plan-blueprint.test.ts`
- Test fixtures simulating plan directory structures
- Test coverage validating the fix

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Review Existing Test Patterns

Examine existing integration tests to understand the pattern:
```bash
# Look at existing integration test structure
cat src/__tests__/cli.integration.test.ts | head -100
cat src/__tests__/get-next-plan-id.test.ts | head -100
```

Key patterns to replicate:
- Temporary directory creation
- Fixture setup and cleanup
- Child process execution for script testing
- Output validation

### Step 2: Create Test File Structure

Create `src/__tests__/validate-plan-blueprint.test.ts`:

```typescript
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpdir } from 'os';

describe('validate-plan-blueprint.cjs', () => {
  let testDir: string;
  let scriptPath: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = path.join(tmpdir(), `test-validate-${Date.now()}`);
    fs.mkdirpSync(testDir);

    // Path to the script being tested
    scriptPath = path.join(__dirname, '../../templates/ai-task-manager/config/scripts/validate-plan-blueprint.cjs');
  });

  afterEach(() => {
    // Cleanup
    fs.removeSync(testDir);
  });

  // Tests go here
});
```

### Step 3: Create Helper Functions

```typescript
function createPlanFixture(planId: string, planName: string, hasTasks = false, hasBlueprint = false) {
  const planDir = path.join(testDir, '.ai/task-manager/plans', `${planId}--${planName}`);
  fs.mkdirpSync(planDir);

  const planFile = path.join(planDir, `plan-${planId}--${planName}.md`);
  let content = `---\nid: ${parseInt(planId, 10)}\n---\n\n# Plan ${planName}\n`;

  if (hasBlueprint) {
    content += '\n## Execution Blueprint\n\nPhases defined here...\n';
  }

  fs.writeFileSync(planFile, content);

  if (hasTasks) {
    const tasksDir = path.join(planDir, 'tasks');
    fs.mkdirpSync(tasksDir);
    fs.writeFileSync(path.join(tasksDir, '01--task.md'), '# Task 1');
  }

  return { planDir, planFile };
}

function runScript(planId: string, field?: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const cmd = field
      ? `node "${scriptPath}" ${planId} ${field}`
      : `node "${scriptPath}" ${planId}`;

    const stdout = execSync(cmd, { cwd: testDir, encoding: 'utf8' });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
      exitCode: error.status || 1
    };
  }
}
```

### Step 4: Write Core Test Cases

**Test 1: Non-padded ID with padded directory**
```typescript
test('accepts non-padded ID "2" for zero-padded directory "02--name"', () => {
  createPlanFixture('02', 'test-plan', true, true);
  const result = runScript('2', 'planFile');

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('02--test-plan');
});
```

**Test 2: Padded ID with padded directory**
```typescript
test('accepts padded ID "02" for zero-padded directory "02--name"', () => {
  createPlanFixture('02', 'test-plan', true, true);
  const result = runScript('02', 'planFile');

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('02--test-plan');
});
```

**Test 3: Non-padded ID with non-padded directory**
```typescript
test('accepts non-padded ID "54" for non-padded directory "54--name"', () => {
  createPlanFixture('54', 'test-plan', true, true);
  const result = runScript('54', 'planFile');

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('54--test-plan');
});
```

**Test 4: Invalid ID handling**
```typescript
test('rejects invalid non-numeric ID "abc" with error', () => {
  createPlanFixture('02', 'test-plan', true, true);
  const result = runScript('abc', 'planFile');

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('Invalid plan ID');
});
```

**Test 5: All field outputs**
```typescript
test('outputs correct values for all field types', () => {
  createPlanFixture('05', 'multi-field-test', true, true);

  const planFile = runScript('5', 'planFile');
  expect(planFile.stdout).toContain('plan-05--multi-field-test.md');

  const planDir = runScript('5', 'planDir');
  expect(planDir.stdout).toContain('05--multi-field-test');

  const taskCount = runScript('5', 'taskCount');
  expect(taskCount.stdout.trim()).toBe('1');

  const blueprint = runScript('5', 'blueprintExists');
  expect(blueprint.stdout.trim()).toBe('yes');
});
```

### Step 5: Run Tests

```bash
# Run new tests
npm test -- validate-plan-blueprint.test.ts

# Run all tests to ensure no regressions
npm test
```

### Step 6: Verify Test Coverage

Ensure tests cover:
- ✅ Both padded and unpadded inputs
- ✅ Both padded and unpadded directories
- ✅ All output field types
- ✅ Error handling for invalid inputs
- ✅ Integration with real file system

### Meaningful Test Strategy Guidelines

**IMPORTANT**: Following the project's "write a few tests, mostly integration" philosophy:

**Why these tests are valuable**:
- Test actual bug fix (non-padded ID with padded directory)
- Integration tests with real file system operations
- Validate critical workflow script functionality
- Test custom business logic (numeric ID comparison)

**What we're NOT testing**:
- Individual regex patterns in isolation (that's implementation detail)
- Directory traversal logic from findTaskManagerRoot (already tested elsewhere)
- Error formatting strings (trivial)
- Node.js fs module functionality (third-party)

This focused test suite validates the core fix without over-testing.
</details>
