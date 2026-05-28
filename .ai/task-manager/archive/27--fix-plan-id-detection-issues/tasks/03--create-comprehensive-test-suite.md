---
id: 3
group: "testing"
dependencies: [1, 2]
status: "completed"
created: "2025-09-26"
skills:
  - "jest"
---

# Create Comprehensive Test Suite

## Objective

Create a comprehensive test suite for the `get-next-plan-id.cjs` script focusing on integration scenarios, directory resolution logic, YAML parsing robustness, and error handling - following the project's "write a few tests, mostly integration" philosophy.

## Skills Required

- **jest**: Node.js testing framework, file system mocking, integration testing patterns

## Acceptance Criteria

- [ ] Create `src/__tests__/get-next-plan-id.test.js` with comprehensive test coverage
- [ ] Test directory resolution logic with multi-directory repository scenarios
- [ ] Test YAML frontmatter parsing with various format variations
- [ ] Test error handling for corrupted files and missing directories
- [ ] Integration tests using real file system operations in temporary directories
- [ ] Test script execution from different working directory contexts
- [ ] All tests pass consistently and provide clear failure messages

## Meaningful Test Strategy Guidelines

**IMPORTANT** Your critical mantra for test generation is: "write a few tests, mostly integration".

**Definition of "Meaningful Tests":**
Tests that verify custom business logic, critical paths, and edge cases specific to the application. Focus on testing YOUR code, not the framework or library functionality.

**When TO Write Tests:**
- Custom business logic and algorithms (directory traversal, ID extraction)
- Critical user workflows and data transformations (plan ID generation workflow)
- Edge cases and error conditions for core functionality (malformed YAML, missing directories)
- Integration points between different system components (file system + parsing logic)
- Complex validation logic or calculations (ID validation, path resolution)

**When NOT to Write Tests:**
- Third-party library functionality (Node.js fs module, path module)
- Framework features (Jest testing framework itself)
- Simple CRUD operations without custom logic
- Getter/setter methods or basic property access
- Configuration files or static data
- Obvious functionality that would break immediately if incorrect

## Technical Requirements

**Target File**: `src/__tests__/get-next-plan-id.test.js` (new file)
**Testing Approach**: Integration-focused testing using real file system operations with temporary directories
**Framework**: Jest (already configured in project)

Key test scenarios:
- **Directory Resolution**: Multi-level repository structures, missing directories, permission errors
- **YAML Parsing**: Various frontmatter formats, malformed YAML, edge cases
- **Integration Workflow**: End-to-end plan ID generation process
- **Error Handling**: Clear error messages, debug logging verification

## Input Dependencies

- Enhanced `get-next-plan-id.cjs` script from Tasks 1 and 2
- Existing Jest test configuration and patterns from project
- Understanding of project's testing philosophy from `src/__tests__/` examples

## Output Artifacts

- Comprehensive test suite ensuring script reliability
- Integration tests covering real-world usage scenarios
- Error handling tests validating clear error messaging
- Test documentation for future maintenance

## Implementation Notes

<details>
<summary>Detailed Testing Implementation Guidelines</summary>

**Test File Structure:**
```javascript
/**
 * Integration Tests for get-next-plan-id.cjs
 * Focus: Critical business logic and integration scenarios
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

describe('get-next-plan-id Integration Tests', () => {
  let tempDir;
  let scriptPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-id-test-'));
    scriptPath = path.resolve('templates/ai-task-manager/config/scripts/get-next-plan-id.cjs');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Test Categories follow
});
```

**Key Test Categories:**

1. **Directory Resolution Tests:**
```javascript
describe('Directory Resolution Logic', () => {
  test('finds correct .ai directory in current working directory', () => {
    // Create .ai/task-manager/plans structure
    // Run script from that directory
    // Verify correct directory found
  });

  test('traverses upward to find .ai directory in parent', () => {
    // Create nested directory structure with .ai in parent
    // Run script from subdirectory
    // Verify parent .ai directory found
  });

  test('chooses contextually relevant .ai when multiple exist', () => {
    // Create multiple .ai directories at different levels
    // Verify correct one chosen based on working directory
  });

  test('handles missing .ai directory gracefully', () => {
    // Run script in directory without .ai
    // Verify clear error message provided
  });
});
```

2. **YAML Frontmatter Parsing Tests:**
```javascript
describe('YAML Frontmatter Parsing', () => {
  test('parses various ID formats correctly', () => {
    // Test: id: 5, id: "5", id: '5', "id": 5, etc.
  });

  test('handles malformed YAML gracefully', () => {
    // Test corrupted frontmatter, invalid YAML syntax
  });

  test('extracts highest ID from multiple plan files', () => {
    // Create multiple plan files with different IDs
    // Verify highest ID + 1 returned
  });
});
```

3. **Integration Workflow Tests:**
```javascript
describe('End-to-End Plan ID Generation', () => {
  test('generates correct next ID in realistic repository structure', () => {
    // Create realistic plan file structure
    // Run full script workflow
    // Verify correct next ID calculated
  });

  test('handles mixed plan and archive directories', () => {
    // Test script with both active and archived plans
  });
});
```

4. **Error Handling and Debug Mode Tests:**
```javascript
describe('Error Handling and Logging', () => {
  test('provides clear errors for common failure scenarios', () => {
    // Test missing directories, permission errors
    // Verify error messages are descriptive
  });

  test('debug mode provides detailed logging', () => {
    // Test DEBUG=true environment variable
    // Verify detailed logging output
  });
});
```

**Testing Best Practices:**
- Use real file system operations in temporary directories (no mocking)
- Test actual script execution using `execSync` for true integration testing
- Create realistic directory structures that mirror real-world usage
- Focus on custom business logic (directory traversal, ID parsing)
- Avoid testing Node.js built-in functionality (fs, path modules)
- Combine related test scenarios to avoid over-testing
- Ensure tests clean up temporary files and directories

**Integration over Unit Testing:**
- Test complete workflows rather than individual functions in isolation
- Verify script behavior from external execution (how users actually use it)
- Test cross-platform compatibility where relevant
- Focus on edge cases that could cause silent failures in production
</details>