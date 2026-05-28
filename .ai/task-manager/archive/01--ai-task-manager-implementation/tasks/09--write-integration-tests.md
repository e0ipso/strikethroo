---
id: "09"
group: "testing"
dependencies: ["06", "07", "08"]
status: "completed"
created_at: "2025-09-01T10:00:00Z"
---

# Task 09: Write Integration Tests

## Objective
Create integration tests that verify the complete CLI workflow from command-line input to directory creation.

## Acceptance Criteria
- [ ] Test CLI with valid --assistants flag
- [ ] Test CLI with missing --assistants flag shows error
- [ ] Test CLI with invalid assistant values
- [ ] Test actual directory structure creation
- [ ] Test file copying from templates
- [ ] Clean up test artifacts after each test

## Technical Requirements
- Use Jest with CLI testing utilities
- Test actual command execution
- Use temporary directories for testing
- Verify created directory structures
- Test error messages and exit codes

## Input Dependencies
- CLI implementation complete (task 06)
- Init command implementation (task 07)
- Unit tests passing (task 08)

## Output Artifacts
- Integration test file: src/__tests__/cli.integration.test.ts
- Test coverage for end-to-end workflows

## Implementation Notes
```typescript
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

describe('CLI Integration Tests', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-task-test-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should create directories for claude', () => {
    execSync('node dist/cli.js init --assistants claude');
    expect(fs.existsSync('.ai/task-manager')).toBe(true);
    expect(fs.existsSync('.claude/commands/tasks')).toBe(true);
  });
});
```