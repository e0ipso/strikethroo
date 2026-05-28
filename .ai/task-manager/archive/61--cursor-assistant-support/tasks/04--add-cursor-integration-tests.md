---
id: 4
group: "testing"
dependencies: [3]
status: "completed"
created: "2025-12-02"
skills:
  - jest
  - typescript
---
# Add Cursor Integration Tests

## Objective
Create comprehensive integration tests to verify Cursor assistant initialization, directory structure generation, file content validation, and multi-assistant scenarios.

## Skills Required
- Jest testing framework
- TypeScript for test implementation

## Acceptance Criteria
- [ ] Test suite validates Cursor initialization creates correct directory structure
- [ ] Test verifies all 7 command files are created with correct names
- [ ] Test validates file content is Markdown format with correct placeholders
- [ ] Test verifies multi-assistant initialization including Cursor
- [ ] Test validates getInitInfo() correctly detects Cursor configuration
- [ ] All tests pass (existing + new Cursor tests)
- [ ] Test execution time remains under 10 seconds

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

Add tests to `src/__tests__/cli.integration.test.ts` that verify:
1. Single Cursor assistant initialization
2. Cursor included in multi-assistant scenarios
3. Directory structure: `.cursor/commands/tasks/`
4. File existence and naming: all 7 .md files
5. File content validation: Markdown format, $ARGUMENTS placeholders
6. getInitInfo() detection logic

**IMPORTANT - Meaningful Test Strategy Guidelines**

Your critical mantra for test generation is: "write a few tests, mostly integration".

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

**Test Task Creation Rules:**
- Combine related test scenarios into single tasks (e.g., "Test user authentication flow" not separate tasks for login, logout, validation)
- Focus on integration and critical path testing over unit test coverage
- Avoid creating separate tasks for testing each CRUD operation individually
- Question whether simple functions need dedicated test tasks

## Input Dependencies
Requires Task 3 (init logic implementation) to be completed so there's functionality to test.

## Output Artifacts
Updated `src/__tests__/cli.integration.test.ts` with comprehensive Cursor test coverage.

## Implementation Notes

<details>
<summary>Click to expand detailed implementation instructions</summary>

### Test Organization Strategy

Add Cursor tests following the existing pattern in `cli.integration.test.ts`. The file already has test suites for different assistants. Add Cursor tests to relevant existing describe blocks and create new ones where needed.

### Test 1: Single Cursor Initialization

Add to the "Single Assistant Initialization" describe block (around line 191):

```typescript
it('should successfully initialize with cursor and verify structure', async () => {
  const result = executeCommand(`node "${cliPath}" init --assistants cursor`);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Successfully initialized');

  // Verify directory structure
  expect(await fs.pathExists(path.join(baseDir, '.cursor/commands/tasks'))).toBe(true);

  // Verify all 7 command files exist
  const templateFiles = [
    'create-plan.md',
    'refine-plan.md',
    'generate-tasks.md',
    'execute-task.md',
    'execute-blueprint.md',
    'fix-broken-tests.md',
    'full-workflow.md'
  ];

  for (const file of templateFiles) {
    const filePath = path.join(baseDir, '.cursor/commands/tasks', file);
    expect(await fs.pathExists(filePath)).toBe(true);
  }

  // Verify file content (sample check on one file)
  const planContent = await fs.readFile(
    path.join(baseDir, '.cursor/commands/tasks/create-plan.md'),
    'utf-8'
  );
  expect(planContent).toContain('$ARGUMENTS'); // Markdown format uses $ARGUMENTS
  expect(planContent).not.toContain('{{args}}'); // Should NOT have TOML format
});
```

### Test 2: Multi-Assistant with Cursor

Add to the "Multiple Assistants" describe block (around line 241):

```typescript
it('should initialize with cursor and other assistants', async () => {
  const result = executeCommand(
    `node "${cliPath}" init --assistants claude,cursor,gemini`
  );

  expect(result.code).toBe(0);

  // Verify all assistant directories exist
  expect(await fs.pathExists(path.join(baseDir, '.claude/commands/tasks'))).toBe(true);
  expect(await fs.pathExists(path.join(baseDir, '.cursor/commands/tasks'))).toBe(true);
  expect(await fs.pathExists(path.join(baseDir, '.gemini/commands/tasks'))).toBe(true);

  // Verify Cursor uses Markdown format
  const cursorFile = await fs.readFile(
    path.join(baseDir, '.cursor/commands/tasks/create-plan.md'),
    'utf-8'
  );
  expect(cursorFile).toContain('$ARGUMENTS');

  // Verify Gemini uses TOML format (for comparison)
  const geminiFile = await fs.readFile(
    path.join(baseDir, '.gemini/commands/tasks/create-plan.toml'),
    'utf-8'
  );
  expect(geminiFile).toContain('{{args}}');
});
```

### Test 3: getInitInfo() Detection

Add to the test suite (create new describe block if needed):

```typescript
it('should detect existing cursor configuration via getInitInfo', async () => {
  // Initialize with cursor
  executeCommand(`node "${cliPath}" init --assistants cursor`);

  // Import and test getInitInfo
  const { getInitInfo } = await import('../index');
  const info = await getInitInfo(baseDir);

  expect(info.hasCursorConfig).toBe(true);
  expect(info.assistants).toContain('cursor');
});
```

### Test 4: All Assistants Together

Update the existing "all assistants" test (if it exists) to include cursor, or add a new comprehensive test:

```typescript
it('should initialize all supported assistants including cursor', async () => {
  const result = executeCommand(
    `node "${cliPath}" init --assistants claude,codex,cursor,gemini,github,opencode`
  );

  expect(result.code).toBe(0);

  // Verify all assistant directories
  const assistantPaths = [
    '.claude/commands/tasks',
    '.codex/prompts',
    '.cursor/commands/tasks',
    '.gemini/commands/tasks',
    '.github/prompts',
    '.opencode/command/tasks'
  ];

  for (const assistantPath of assistantPaths) {
    expect(await fs.pathExists(path.join(baseDir, assistantPath))).toBe(true);
  }
});
```

### Verification Steps

1. Run the test suite: `npm test`
2. Verify all tests pass, including the new Cursor tests
3. Check test execution time remains under 10 seconds
4. Verify code coverage includes the new Cursor logic

### Important Notes

- **Follow existing test patterns**: Look at how Claude, Gemini, and Codex tests are structured
- **Use the existing test helpers**: `executeCommand()`, `fs.pathExists()`, etc.
- **Test real integration**: These are integration tests, not unit tests, so test actual file system operations
- **Verify format differences**: Ensure Cursor uses Markdown (.md) not TOML
- **Don't over-test**: Focus on critical paths - we're testing OUR code (directory creation, file copying), not Jest or fs-extra
- **Keep tests fast**: Use the same temporary directory approach as existing tests

### Test Checklist

- [ ] Cursor single assistant initialization works
- [ ] Directory structure is correct (`.cursor/commands/tasks/`)
- [ ] All 7 command files are created
- [ ] Files are in Markdown format (not TOML)
- [ ] Multi-assistant scenarios include Cursor
- [ ] getInitInfo() correctly detects Cursor
- [ ] All existing tests still pass
- [ ] Test execution completes in under 10 seconds
</details>
