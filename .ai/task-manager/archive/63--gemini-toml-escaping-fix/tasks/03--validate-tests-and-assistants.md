---
id: 3
group: "toml-escaping"
dependencies: [1, 2]
status: "completed"
created: 2025-12-19
skills: ["jest", "typescript"]
---

# Task 03: Validate TOML Tests and All Assistant Formats

## Objective

Add TOML validation tests and verify that the TOML fix doesn't cause regressions in other assistant formats (Claude, Cursor, Codex, GitHub, OpenCode). Ensure all tests pass.

## Acceptance Criteria

- [ ] New test added to verify TOML files contain actual newlines (not escaped)
- [ ] New test validates TOML structure is syntactically correct
- [ ] All 148+ existing tests pass with no new failures
- [ ] Multi-assistant initialization test verifies all formats work
- [ ] Gemini-specific tests validate command file structure
- [ ] No regressions in Claude, Cursor, Codex, GitHub, or OpenCode formats
- [ ] Build succeeds with `npm run build && npm test`

## Technical Requirements

**Test file to modify**: `src/__tests__/cli.integration.test.ts`

**Tests to add**:
1. Validation that Gemini TOML files contain actual newlines in content
2. Verification that other assistants (Claude, Cursor, etc.) unaffected
3. Basic TOML structure validation (metadata and prompt sections present)

<details>
<summary>Implementation Notes</summary>

### Step 1: Understand current test structure

The existing test file `src/__tests__/cli.integration.test.ts` already has:
- Initialization tests for each assistant (Claude, Cursor, Gemini, etc.)
- Multi-assistant tests
- File structure and content verification tests

Review the existing Gemini tests to understand the pattern:
```bash
grep -A 10 "should successfully initialize with gemini" src/__tests__/cli.integration.test.ts
```

### Step 2: Add TOML newline validation test

Add a new test in the "Gemini Assistant Support" describe block (around line 650+):

```typescript
it('should generate valid TOML with actual newlines, not escaped \\n sequences', async () => {
  const result = executeCommand(`node "${cliPath}" init --assistants gemini`);
  expect(result.exitCode).toBe(0);

  const createPlanPath = path.join(testDir, '.gemini/commands/tasks/create-plan.toml');
  const content = await fs.readFile(createPlanPath, 'utf8');

  // The content field should have actual newlines, not \n escape sequences
  // Verify the markdown structure is preserved with real newlines
  expect(content).toContain('[prompt]\ncontent = """');

  // This should NOT appear (old buggy format):
  // content = """# Title\n\nYou are...
  // Instead we should see:
  // content = """# Title
  //
  // You are...

  // Verify actual newline exists in prompt (not escaped):
  const promptStart = content.indexOf('[prompt]');
  const contentStart = content.indexOf('content = """', promptStart);
  const contentSection = content.substring(contentStart, contentStart + 500);

  // Should have actual line breaks in the triple-quoted string
  expect(contentSection).toMatch(/content = """\n#/);
  // Should NOT have \n escape sequences in triple-quoted context
  expect(contentSection).not.toMatch(/"""\n\n.*\\n/);
});
```

### Step 3: Add TOML structure validation test

Add validation for TOML syntax:

```typescript
it('should generate syntactically valid TOML for all Gemini commands', async () => {
  const result = executeCommand(`node "${cliPath}" init --assistants gemini`);
  expect(result.exitCode).toBe(0);

  const commandsDir = path.join(testDir, '.gemini/commands/tasks');
  const files = await fs.readdir(commandsDir);
  const tomlFiles = files.filter(f => f.endsWith('.toml'));

  // Verify all expected commands generated
  expect(tomlFiles).toContain('create-plan.toml');
  expect(tomlFiles).toContain('generate-tasks.toml');
  expect(tomlFiles).toContain('execute-blueprint.toml');

  // Validate each file structure
  for (const file of tomlFiles) {
    const filePath = path.join(commandsDir, file);
    const content = await fs.readFile(filePath, 'utf8');

    // Verify basic TOML structure
    expect(content).toContain('[metadata]');
    expect(content).toContain('[prompt]');
    expect(content).toContain('argument-hint');
    expect(content).toContain('description');
    expect(content).toContain('content = """');

    // Verify it doesn't have the old buggy format
    // (escaped newlines in triple-quoted strings would appear as \n)
    expect(content).not.toMatch(/"""\n.*\\n.*\\n.*"""/);
  }
});
```

### Step 4: Add multi-assistant regression test

Verify other assistants weren't affected:

```typescript
it('should not affect other assistant formats when fixing Gemini', async () => {
  const result = executeCommand(
    `node "${cliPath}" init --assistants claude,cursor,gemini,codex`
  );
  expect(result.exitCode).toBe(0);

  // Verify Claude uses Markdown format
  const claudePath = path.join(testDir, '.claude/commands/tasks/create-plan.md');
  const claudeContent = await fs.readFile(claudePath, 'utf8');
  expect(claudeContent).toContain('$ARGUMENTS');
  expect(claudeContent).not.toContain('{{args}}'); // Should NOT use Gemini format

  // Verify Cursor uses Markdown format
  const cursorPath = path.join(testDir, '.cursor/commands/tasks/create-plan.md');
  const cursorContent = await fs.readFile(cursorPath, 'utf8');
  expect(cursorContent).toContain('$ARGUMENTS');

  // Verify Gemini uses TOML format
  const geminiPath = path.join(testDir, '.gemini/commands/tasks/create-plan.toml');
  const geminiContent = await fs.readFile(geminiPath, 'utf8');
  expect(geminiContent).toContain('[metadata]');
  expect(geminiContent).toContain('[prompt]');
  expect(geminiContent).toContain('{{args}}'); // Should use TOML format
});
```

### Step 5: Run tests and verify

```bash
npm test
```

All tests should pass. If any test fails:
- Check that Task 01 changes were applied correctly
- Verify Task 02 regeneration completed successfully
- Review test expectations against actual file content

### Test Philosophy

These tests focus on:
- **Custom business logic**: TOML conversion function behavior
- **Integration points**: File generation and format verification
- **Edge cases**: Newline handling in different string contexts

They do NOT test:
- Third-party libraries (file system utilities)
- Framework features (Jest itself)
- Simple CRUD operations

</details>

## Success Validation

Run the full test suite:
```bash
npm run build
npm test
```

Expected result:
- All 150+ tests pass
- No new test failures
- Build succeeds with no TypeScript errors
- All assistant formats work correctly

## Input Dependencies

- Tasks 01 and 02 completed successfully
- `npm run build` succeeded in Task 01
- Gemini TOML files regenerated in Task 02
- Existing test infrastructure in place

## Output Artifacts

- Updated `src/__tests__/cli.integration.test.ts` with 2-3 new TOML validation tests
- All tests passing (150+ total)
- TypeScript compilation successful
- No regressions in other assistant formats
- Test coverage for TOML escape function behavior
