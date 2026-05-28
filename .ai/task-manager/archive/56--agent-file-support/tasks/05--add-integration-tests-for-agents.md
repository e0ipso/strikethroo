---
id: 5
group: testing
dependencies:
  - 1
  - 2
  - 3
status: completed
created: '2025-11-19'
skills:
  - jest
  - typescript
---

# Task: Add Integration Tests for Agent Processing

## Objective

Create comprehensive integration tests validating agent file copying, conflict detection, and console output functionality across all initialization scenarios.

## Skills Required

- `jest`: Write integration tests using Jest framework
- `typescript`: TypeScript test implementation

## Acceptance Criteria

1. Tests validate agent files copied for Claude assistant
2. Tests verify Gemini and OpenCode skip agent creation
3. Tests confirm conflict detection for modified agent files
4. Tests check first-time init creates metadata
5. Tests verify re-init with/without modifications
6. Tests validate force flag behavior
7. All tests pass and existing 119 tests remain passing
8. Minimum 5 test cases covering critical scenarios

## Technical Requirements

<details>
<summary>Implementation Details</summary>

### Test File Location

Create new test file: `src/__tests__/agent-processing.integration.test.ts`

### Test Structure

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import { init } from '../index';

describe('Agent File Processing Integration Tests', () => {
  const testBaseDir = path.join(__dirname, '../../tmp/test-agents');

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.remove(testBaseDir);
    await fs.ensureDir(testBaseDir);
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await fs.remove(testBaseDir);
  });

  describe('First-Time Initialization', () => {
    test('creates agent files for Claude assistant', async () => {
      // Test implementation
    });

    test('creates agent metadata file with hashes', async () => {
      // Test implementation
    });

    test('does not create agent files for Gemini', async () => {
      // Test implementation
    });

    test('does not create agent files for OpenCode', async () => {
      // Test implementation
    });
  });

  describe('Re-Initialization Without Modifications', () => {
    test('updates agent files silently when no changes detected', async () => {
      // Test implementation
    });

    test('updates metadata timestamp on re-init', async () => {
      // Test implementation
    });
  });

  describe('Re-Initialization With Modifications', () => {
    test('detects modified agent files and prompts for resolution', async () => {
      // Test implementation (requires mocking promptForConflicts)
    });
  });

  describe('Force Flag Behavior', () => {
    test('overwrites agent files without prompting when force=true', async () => {
      // Test implementation
    });
  });

  describe('Multi-Assistant Initialization', () => {
    test('creates agent files only for Claude when initializing multiple assistants', async () => {
      // Test implementation
    });
  });
});
```

### Critical Test Cases

#### Test 1: First-Time Claude Init Creates Agent Files

```typescript
test('creates agent files for Claude assistant', async () => {
  const options = {
    assistants: 'claude',
    destinationDirectory: testBaseDir,
  };

  const result = await init(options);

  expect(result.success).toBe(true);
  expect(await fs.exists(path.join(testBaseDir, '.claude/agents/plan-creator.md'))).toBe(true);
  expect(await fs.exists(path.join(testBaseDir, '.claude/agents/.init-metadata.json'))).toBe(true);
});
```

#### Test 2: Metadata Contains Correct Hashes

```typescript
test('creates agent metadata file with hashes', async () => {
  const options = {
    assistants: 'claude',
    destinationDirectory: testBaseDir,
  };

  await init(options);

  const metadataPath = path.join(testBaseDir, '.claude/agents/.init-metadata.json');
  const metadata = await fs.readJSON(metadataPath);

  expect(metadata.files).toHaveProperty('plan-creator.md');
  expect(metadata.files['plan-creator.md']).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
  expect(metadata.version).toBeDefined();
  expect(metadata.timestamp).toBeDefined();
});
```

#### Test 3: Gemini Skips Agent Files

```typescript
test('does not create agent files for Gemini', async () => {
  const options = {
    assistants: 'gemini',
    destinationDirectory: testBaseDir,
  };

  await init(options);

  expect(await fs.exists(path.join(testBaseDir, '.gemini/agents'))).toBe(false);
  expect(await fs.exists(path.join(testBaseDir, '.claude/agents'))).toBe(false);
});
```

#### Test 4: Re-Init Without Changes

```typescript
test('updates agent files silently when no changes detected', async () => {
  const options = {
    assistants: 'claude',
    destinationDirectory: testBaseDir,
  };

  // First init
  await init(options);
  const metadataPath = path.join(testBaseDir, '.claude/agents/.init-metadata.json');
  const firstMetadata = await fs.readJSON(metadataPath);

  // Wait a moment to ensure timestamp changes
  await new Promise(resolve => setTimeout(resolve, 100));

  // Second init (no changes)
  await init(options);
  const secondMetadata = await fs.readJSON(metadataPath);

  // Hashes should match (files unchanged)
  expect(secondMetadata.files['plan-creator.md']).toBe(firstMetadata.files['plan-creator.md']);
  // Timestamp should update
  expect(secondMetadata.timestamp).not.toBe(firstMetadata.timestamp);
});
```

#### Test 5: Force Flag Overwrites

```typescript
test('overwrites agent files without prompting when force=true', async () => {
  const options = {
    assistants: 'claude',
    destinationDirectory: testBaseDir,
  };

  // First init
  await init(options);

  // Modify agent file
  const agentPath = path.join(testBaseDir, '.claude/agents/plan-creator.md');
  const originalContent = await fs.readFile(agentPath, 'utf-8');
  await fs.writeFile(agentPath, originalContent + '\n\n# User Modification');

  // Re-init with force
  await init({ ...options, force: true });

  // File should be overwritten (no user modification)
  const newContent = await fs.readFile(agentPath, 'utf-8');
  expect(newContent).not.toContain('# User Modification');
});
```

### Mocking Strategy

For tests requiring user input (conflict resolution), mock the `promptForConflicts` function:

```typescript
import * as prompts from '../prompts';

jest.spyOn(prompts, 'promptForConflicts').mockResolvedValue(
  new Map([['plan-creator.md', 'overwrite']])
);
```

</details>

## Input Dependencies

- Tasks 1-3 completed: Full agent support implementation
- Jest testing framework configured
- Existing test utilities and helpers

## Output Artifacts

- New test file: `src/__tests__/agent-processing.integration.test.ts`
- Minimum 5 passing test cases
- All existing 119 tests still passing

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Test Philosophy Alignment

Follow the project's "Write a Few Tests, Mostly Integration" philosophy:
- Focus on integration tests (full init workflow)
- Avoid unit testing individual helper functions
- Test real file system operations (no mocking fs)
- Verify end-to-end behavior, not implementation details

### Test Organization

```typescript
describe('Agent File Processing Integration Tests', () => {
  // Setup/teardown
  beforeEach() { /* clean test directory */ }
  afterEach() { /* clean up */ }

  describe('First-Time Initialization', () => {
    // Tests for new installations
  });

  describe('Re-Initialization', () => {
    // Tests for updates and conflicts
  });

  describe('Force Flag Behavior', () => {
    // Tests for --force flag
  });
});
```

### Testing Patterns

**Pattern 1: File Existence Checks**
```typescript
expect(await fs.exists(filePath)).toBe(true);
```

**Pattern 2: Metadata Validation**
```typescript
const metadata = await fs.readJSON(metadataPath);
expect(metadata.files).toHaveProperty('plan-creator.md');
```

**Pattern 3: Hash Verification**
```typescript
expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 format
```

**Pattern 4: Content Comparison**
```typescript
const content = await fs.readFile(filePath, 'utf-8');
expect(content).toContain('expected text');
```

### Running Tests

```bash
# Run all tests
npm test

# Run only agent tests
npm test -- agent-processing

# Run in watch mode
npm run test:watch -- agent-processing
```

### Test Coverage Goals

While the project maintains 24% line coverage by design, ensure:
- All agent-specific code paths covered
- Critical failure scenarios tested
- Edge cases validated (empty dirs, missing files, corrupted metadata)

### Debugging Failed Tests

If tests fail:
1. Check `/tmp/test-agents/` directory state
2. Verify test cleanup runs (beforeEach/afterEach)
3. Add `console.log` statements to trace execution
4. Run single test in isolation: `npm test -- -t "test name"`

</details>
