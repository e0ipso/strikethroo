---
id: 3
group: "verification"
dependencies: [1, 2]
status: "completed"
created: 2025-11-06
skills:
  - testing
---
# Verify OpenCode Integration Fixes

## Objective

Run the test suite and manually verify that OpenCode can successfully initialize and load all command templates without directory structure or YAML parsing errors.

## Skills Required

- Testing: Running test suites and validating integration test results

## Acceptance Criteria

- [ ] All integration tests pass (especially OpenCode-specific tests)
- [ ] Manual test: `npm start init --assistants opencode` creates `.opencode/command/tasks/`
- [ ] Manual test: OpenCode can load commands without YAML parsing errors
- [ ] No regression in Claude or Gemini functionality

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Test Suite**:
- Run full Jest test suite: `npm test`
- Verify integration tests in `src/__tests__/cli.integration.test.ts` pass
- Specifically check tests for OpenCode (lines 176-182, 215+)

**Manual Verification Steps**:
1. Build the project: `npm run build`
2. Create test directory: `mkdir -p /tmp/test-opencode-fix && cd /tmp/test-opencode-fix`
3. Initialize OpenCode: `node /workspace/dist/cli.js init --assistants opencode`
4. Verify directory structure: `ls -la .opencode/command/tasks/`
5. Check YAML parsing: Attempt to load commands in OpenCode (if available)

**Expected Results**:
- Directory `.opencode/command/tasks/` exists (not `.opencode/commands/`)
- Six template files present: `create-plan.md`, `execute-blueprint.md`, `execute-task.md`, `fix-broken-tests.md`, `full-workflow.md`, `generate-tasks.md`
- All frontmatter can be parsed without errors

## Input Dependencies

- Task 01: Fixed directory structure in `src/index.ts`
- Task 02: Quoted YAML frontmatter values in template files

## Output Artifacts

- Verification report confirming both fixes work correctly
- Test suite passing with all tests green

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Approach

This task validates that the two previous fixes work together correctly.

### Step-by-Step Implementation

1. **Run the test suite**:
   ```bash
   npm run build
   npm test
   ```
   All tests should pass. Pay special attention to:
   - `cli.integration.test.ts` OpenCode tests
   - Directory structure validation tests

2. **Manual verification - Directory structure**:
   ```bash
   # Clean test environment
   rm -rf /tmp/test-opencode-fix
   mkdir -p /tmp/test-opencode-fix
   cd /tmp/test-opencode-fix

   # Initialize OpenCode
   node /workspace/dist/cli.js init --assistants opencode

   # Verify directory structure
   ls -la .opencode/command/tasks/
   # Should show: create-plan.md, execute-blueprint.md, execute-task.md,
   #              fix-broken-tests.md, full-workflow.md, generate-tasks.md

   # Verify NO commands/ directory exists
   ls -la .opencode/commands/ 2>&1
   # Should show: "No such file or directory"
   ```

3. **Manual verification - YAML parsing**:
   ```bash
   # Use Node.js to parse YAML frontmatter
   node -e "
   const yaml = require('js-yaml');
   const fs = require('fs');
   const path = require('path');

   const files = [
     '.opencode/command/tasks/create-plan.md',
     '.opencode/command/tasks/execute-task.md',
     '.opencode/command/tasks/execute-blueprint.md',
     '.opencode/command/tasks/fix-broken-tests.md',
     '.opencode/command/tasks/full-workflow.md',
     '.opencode/command/tasks/generate-tasks.md'
   ];

   let allPassed = true;
   files.forEach(file => {
     try {
       const content = fs.readFileSync(file, 'utf8');
       const match = content.match(/^---\n([\s\S]*?)\n---/);
       if (match) {
         const parsed = yaml.load(match[1]);
         console.log('✓', file, '- Parsed successfully');
         console.log('  argument-hint:', parsed['argument-hint']);
       }
     } catch (e) {
       console.error('✗', file, '- Parse error:', e.message);
       allPassed = false;
     }
   });

   if (allPassed) {
     console.log('\n✓ All files parsed successfully');
   } else {
     console.log('\n✗ Some files failed to parse');
     process.exit(1);
   }
   "
   ```

4. **Verify Claude and Gemini still work**:
   ```bash
   # Test multi-assistant initialization
   rm -rf /tmp/test-multi-assistant
   mkdir -p /tmp/test-multi-assistant
   cd /tmp/test-multi-assistant

   node /workspace/dist/cli.js init --assistants claude,gemini,opencode

   # Verify all three directory structures
   ls -la .claude/commands/tasks/
   ls -la .gemini/commands/tasks/
   ls -la .opencode/command/tasks/
   ```

### Success Criteria Validation

After completing all verification steps:
- [ ] `npm test` passes with all tests green
- [ ] `.opencode/command/tasks/` directory exists with 6 files
- [ ] `.opencode/commands/` directory does NOT exist
- [ ] All YAML frontmatter parses without errors
- [ ] Claude uses `.claude/commands/`
- [ ] Gemini uses `.gemini/commands/`
- [ ] OpenCode uses `.opencode/command/`

### Troubleshooting

If tests fail:
- Check the specific test failure message
- Verify that both task 01 and task 02 were completed correctly
- Re-run the build: `npm run clean && npm run build`

If YAML still fails to parse:
- Verify quotes were added correctly (double quotes, not single)
- Check for any typos in the frontmatter modifications
- Ensure no extra spaces were introduced

</details>
