---
id: 5
group: "testing"
dependencies: [4]
status: "completed"
created: 2025-10-31
skills:
  - jest
---
# Add Integration Tests for GitHub Copilot Support

## Objective
Create integration tests that verify GitHub Copilot initialization creates the correct directory structure, generates all prompt files with proper formatting, and includes required content.

## Skills Required
- **jest**: Test implementation for integration testing

## Acceptance Criteria
- [ ] Test verifies `.github/prompts/` directory creation
- [ ] Test confirms all four prompt files are generated
- [ ] Test validates YAML frontmatter structure (description field present)
- [ ] Test checks `$ARGUMENTS` placeholder presence
- [ ] Test ensures template body content is included
- [ ] Test verifies no regression in existing assistants (Claude, Gemini, OpenCode)
- [ ] All tests pass when run with `npm test`

## Technical Requirements
- Add tests to `src/__tests__/cli.integration.test.ts`
- Follow existing test patterns in the file
- Test file structure, content validation, and frontmatter parsing
- Ensure tests are meaningful (test business logic, not framework)
- Keep test count minimal (combine related validations)

## Input Dependencies
- Task 4: GitHub directory creation logic must be implemented

## Output Artifacts
- New test cases in `src/__tests__/cli.integration.test.ts`

## Implementation Notes

**IMPORTANT: Meaningful Test Strategy Guidelines**

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
- Combine related test scenarios into single tasks
- Focus on integration and critical path testing over unit test coverage
- Avoid creating separate tests for each file individually
- Question whether simple functions need dedicated test tasks

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Locate Integration Test File
File: `src/__tests__/cli.integration.test.ts`

Examine existing test structure to understand patterns used for Claude, Gemini, and OpenCode.

### Step 2: Add GitHub Copilot Test Suite

Add a new test case following existing patterns:

```typescript
it('should create GitHub Copilot prompt files with correct structure', async () => {
  // Arrange: Queue GitHub selection
  queueSelections('github', DONE);

  // Act: Execute init command
  await initCommand.execute(testDir);

  // Assert: Verify directory creation
  const promptsDir = path.join(testDir, '.github/prompts');
  expect(await directoryExists(promptsDir)).toBe(true);

  // Assert: Verify all four prompt files exist
  const promptFiles = [
    'tasks-create-plan.prompt.md',
    'tasks-generate-tasks.prompt.md',
    'tasks-execute-blueprint.prompt.md',
    'tasks-fix-broken-tests.prompt.md'
  ];

  for (const filename of promptFiles) {
    const filePath = path.join(promptsDir, filename);
    expect(await fileExists(filePath)).toBe(true);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Validate frontmatter structure
    expect(content).toContain('---');
    expect(content).toMatch(/description: .+/);

    // Validate $ARGUMENTS placeholder
    expect(content).toContain('$ARGUMENTS');

    // Ensure template body is included (check for common instruction text)
    expect(content.length).toBeGreaterThan(200); // Reasonable content length
  }
});
```

### Step 3: Add Regression Test

Ensure GitHub addition doesn't break existing assistants:

```typescript
it('should support multiple assistants including GitHub', async () => {
  queueSelections('claude', 'github', DONE);

  await initCommand.execute(testDir);

  // Verify Claude commands exist
  const claudeProposal = path.join(testDir, '.claude/commands/tasks/create-plan.md');
  expect(await fileExists(claudeProposal)).toBe(true);

  // Verify GitHub prompts exist
  const githubProposal = path.join(testDir, '.github/prompts/tasks-create-plan.prompt.md');
  expect(await fileExists(githubProposal)).toBe(true);
});
```

### Step 4: File Naming Convention Test

Verify correct naming pattern:

```typescript
it('should follow GitHub Copilot naming convention (tasks-*.prompt.md)', async () => {
  queueSelections('github', DONE);
  await initCommand.execute(testDir);

  const promptsDir = path.join(testDir, '.github/prompts');
  const files = await fs.readdir(promptsDir);

  // All files should follow the pattern
  for (const file of files) {
    expect(file).toMatch(/^tasks-.*\.prompt\.md$/);
  }

  // Should have exactly 4 files
  expect(files.length).toBe(4);
});
```

### Step 5: Content Validation Test

Verify conversion produces correct content structure:

```typescript
it('should convert templates correctly for GitHub format', async () => {
  queueSelections('github', DONE);
  await initCommand.execute(testDir);

  const createPlanPath = path.join(
    testDir,
    '.github/prompts/tasks-create-plan.prompt.md'
  );
  const content = await fs.readFile(createPlanPath, 'utf-8');

  // Frontmatter should be simple (description only)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  expect(frontmatterMatch).toBeTruthy();

  const frontmatter = frontmatterMatch[1];
  // Should contain description
  expect(frontmatter).toContain('description:');
  // Should NOT contain argument-hint (that's Claude-specific)
  expect(frontmatter).not.toContain('argument-hint:');

  // Body should start with $ARGUMENTS after frontmatter
  const bodyMatch = content.match(/---\n\n([\s\S]+)/);
  expect(bodyMatch).toBeTruthy();
  expect(bodyMatch[1]).toMatch(/^\$ARGUMENTS/);
});
```

### Step 6: Run Tests

Execute tests to ensure they pass:

```bash
npm test
```

Verify:
- All new tests pass
- Existing tests still pass (no regressions)
- Test output is clear and informative

### Test Philosophy Alignment

These tests follow the "write a few tests, mostly integration" philosophy:
- **Integration-focused**: Test the full initialization flow, not individual functions
- **Business logic**: Verify custom conversion logic and file structure
- **Combined scenarios**: Single test validates multiple related aspects
- **No framework testing**: Don't test fs-extra or Jest itself
- **Meaningful validation**: Check actual business requirements (correct files, content structure)

</details>
