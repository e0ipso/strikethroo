---
id: 5
group: "testing"
dependencies: [2, 3, 4]
status: "completed"
created: "2025-09-01"
completed: "2025-09-01"
---

# Task 05: Add Integration Test for Destination Directory Flag

## Objective
Create an integration test that verifies the --destination-directory flag creates the project structure in the specified location.

## Acceptance Criteria
- [x] Test verifies flag creates directories in custom location
- [x] Test verifies default behavior (current directory) still works
- [x] Test handles both relative and absolute paths
- [x] Test cleans up after itself

## Technical Requirements
- Add test case to `src/__tests__/cli.integration.test.ts`
- Use temporary directories for isolation
- Test both with and without the flag
- Verify directory structures are created correctly

## Input Dependencies
- CLI flag implementation from task 02
- Updated init logic from task 03
- Path resolution from task 04

## Output Artifacts
- Integration test coverage for new functionality

## Implementation Notes
```typescript
it('should create directories in specified destination', async () => {
  const customDir = path.join(testDir, 'custom-location');
  await fs.ensureDir(customDir);

  execSync(`node dist/cli.js init --assistants claude --destination-directory ${customDir}`);

  expect(fs.existsSync(path.join(customDir, '.ai/task-manager'))).toBe(true);
  expect(fs.existsSync(path.join(customDir, '.claude/commands/tasks'))).toBe(true);
});
```