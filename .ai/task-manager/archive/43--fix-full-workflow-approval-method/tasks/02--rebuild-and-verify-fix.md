---
id: 2
group: "template-fixes"
dependencies: [1]
status: "completed"
created: 2025-10-19
skills:
  - bash
---
# Rebuild and Verify Full-Workflow Fix

## Objective

Rebuild the project to generate updated assistant command files from the modified template, then verify the full-workflow command executes correctly with automatic approval_method setting and plan ID substitution.

## Skills Required

- **bash**: Execute build commands and integration testing workflow

## Acceptance Criteria

- [ ] `npm run build` completes successfully without errors
- [ ] Test execution: `/tasks:full-workflow "simple test request"` runs to completion
- [ ] Created plan file contains `approval_method: auto` in YAML frontmatter
- [ ] Shell variable `$PLAN_ID` correctly references actual numeric plan ID (not placeholder text)
- [ ] Workflow proceeds through all phases without manual prompts
- [ ] Existing test suite `npm test` continues to pass

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Build process**:
- Run `npm run build` to compile TypeScript and process templates
- Template at `templates/assistant/commands/tasks/full-workflow.md` will be:
  - Copied to `.claude/commands/tasks/full-workflow.md` (Markdown format)
  - Converted and copied to `.gemini/commands/tasks/full-workflow.toml` (TOML format)
  - Copied to `.opencode/command/tasks/full-workflow.md` (Markdown format)

**Integration test**:
- Execute full-workflow with minimal test prompt
- Verify plan creation and approval_method setting
- Confirm workflow doesn't pause for user approval
- Check plan gets archived upon completion

**Regression test**:
- Run existing test suite to ensure no breakage
- All 67+ tests should pass

## Input Dependencies

- Task 1: Modified `templates/assistant/commands/tasks/full-workflow.md` with fixes applied

## Output Artifacts

- Successful build confirmation
- Verification report showing:
  - Plan file location with `approval_method: auto`
  - Workflow completion status
  - Test suite results

<details>
<summary>Implementation Notes</summary>

### Detailed Implementation Steps

#### 1. Run Build Process

```bash
npm run build
```

**Expected output**: TypeScript compilation success, no errors

**What this does**:
- Compiles TypeScript files in `src/` to JavaScript in `dist/`
- Processes template files through the template system
- Generates assistant-specific command files

**Verify**: Check that `.claude/commands/tasks/full-workflow.md` was updated with recent timestamp

#### 2. Execute Integration Test

Create a minimal test case to verify the fix:

```bash
# Note down the current highest plan ID
CURRENT_MAX=$(node .ai/task-manager/config/scripts/get-next-plan-id.cjs)
echo "Next plan will be: $CURRENT_MAX"

# Execute full-workflow with simple test request
# This should run through create-plan, generate-tasks, execute-blueprint automatically
/tasks:full-workflow "Create a simple hello world function"
```

**Expected behavior**:
1. Plan creation completes
2. Step 3 sets `approval_method: auto` without errors
3. Task generation executes without stopping for approval
4. Blueprint execution starts immediately
5. Workflow completes and archives the plan

**If workflow stops for approval**: The fix didn't work correctly

#### 3. Verify Plan Metadata

After workflow completes (or if it pauses, interrupt and check manually):

```bash
# Find the created plan (will be in archive if completed)
PLAN_ID=$CURRENT_MAX
PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-${PLAN_ID}--*.md" -type f)

echo "Plan file: $PLAN_FILE"

# Extract and verify approval_method field
grep "^approval_method:" "$PLAN_FILE"
```

**Expected output**: `approval_method: auto`

**If missing or set to manual**: Step 3 of full-workflow failed to set the field

#### 4. Verify Variable Substitution

Check the workflow output logs (scroll back) to confirm:
- Step 1 shows actual plan ID number (e.g., "43")
- Step 3 find command uses actual ID, not literal `[plan-id]`
- Step 4 and 5 SlashCommand invocations pass actual ID
- Step 6 summary shows real plan ID and directory path

**Red flags**:
- Any occurrence of literal text `[plan-id]` in output
- "Plan not found" errors in Step 3
- SlashCommand errors due to invalid plan ID

#### 5. Run Regression Test Suite

```bash
npm test
```

**Expected output**: All tests pass, no new failures introduced

**Test statistics**: Should show ~67 tests passing in ~3 seconds

**If tests fail**: Review failures to determine if related to template changes

### Troubleshooting Common Issues

**Issue**: Build fails with template processing errors
- **Cause**: Syntax error in modified template
- **Fix**: Review Task 1 changes for unclosed bash blocks, invalid YAML, or escape issues

**Issue**: Full-workflow errors with "PLAN_ID: command not found" or similar
- **Cause**: Variable not in scope or assignment failed
- **Fix**: Check Step 1 uses command substitution `$()` correctly

**Issue**: approval_method not set in plan file
- **Cause**: Node.js inline script failed silently or file path issue
- **Fix**: Run the Step 3 commands manually with debug output, check for `fs` errors

**Issue**: Workflow still stops for approval despite approval_method: auto
- **Cause**: Subordinate commands (generate-tasks, execute-blueprint) not reading the field
- **Fix**: This indicates a different bug - not in scope for this task

**Issue**: Plan not found errors in Step 3
- **Cause**: `PLAN_ID` variable has placeholder text instead of number
- **Fix**: Task 1 missed some placeholder replacements

### Platform-Specific Testing

**Linux** (current environment):
- Primary test platform
- Node.js inline script should work identically
- No sed compatibility issues remain

**macOS** (if available):
- Test on macOS to confirm cross-platform compatibility
- Node.js behavior should be identical
- Previous sed issues should not occur

### Success Indicators

✅ **All clear if**:
- Build completes cleanly
- Full-workflow test runs end-to-end automatically
- Plan file shows `approval_method: auto`
- No literal `[plan-id]` text in workflow output
- All existing tests pass

❌ **Issues remain if**:
- Workflow stops for manual approval
- Plan file missing `approval_method` or set to manual
- Variable substitution failures visible in output
- Tests fail

</details>
