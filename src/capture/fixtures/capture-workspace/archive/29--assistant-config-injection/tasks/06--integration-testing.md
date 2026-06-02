---
id: 6
group: "testing"
dependencies: [3, 4, 5]
status: "completed"
created: "2025-10-08"
skills:
  - testing
---
# Integration Testing and Validation

## Objective
Test the complete configuration detection and injection system across all three command templates to verify correct functionality, graceful degradation, and cross-platform compatibility.

## Skills Required
- **testing**: Manual testing workflows, script execution, edge case validation, cross-platform verification

## Acceptance Criteria
- [ ] Assistant detection script correctly identifies Claude in current environment
- [ ] Configuration reader script successfully reads ~/.claude/CLAUDE.md
- [ ] Configuration reader script successfully reads project-level AGENTS.md
- [ ] All three command templates display configuration when invoked
- [ ] System degrades gracefully when config files are missing
- [ ] DEBUG mode works for troubleshooting
- [ ] Scripts work on current platform (Linux/macOS/Windows)
- [ ] No breaking changes to existing command functionality

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

### Test Scenarios

1. **Detection Script Tests**:
   - Run with CLAUDECODE environment variable
   - Run in directory with .claude/ folder
   - Run in empty directory (should return 'unknown')
   - Test with DEBUG=true

2. **Reader Script Tests**:
   - Read Claude global config (~/.claude/CLAUDE.md)
   - Read Claude project config (AGENTS.md)
   - Test with missing global config (graceful skip)
   - Test with missing project config (graceful skip)
   - Test with unknown assistant identifier

3. **Command Template Tests**:
   - Invoke /tasks:create-plan and verify config appears
   - Invoke /tasks:generate-tasks and verify config appears
   - Invoke /tasks:execute-blueprint (test context) and verify config appears

4. **Integration Tests**:
   - Full pipeline: detect → read → inject into command
   - Verify MUST language appears in output
   - Confirm existing command features still work

5. **Edge Case Tests**:
   - Missing ~/.claude directory
   - Empty configuration files
   - Permission errors (if testable)
   - Unknown assistant type

## Input Dependencies
- Task 1: detect-assistant.cjs must be implemented
- Task 2: read-assistant-config.cjs must be implemented
- Tasks 3, 4, 5: All three command templates must be updated
- Test environment: Current Claude Code environment with CLAUDECODE=1

## Output Artifacts
- Test execution notes documenting all scenarios
- Bug reports or issues discovered (if any)
- Confirmation that all acceptance criteria are met

## Implementation Notes

<details>
<summary>Detailed Testing Guide</summary>

### Test 1: Assistant Detection

```bash
# Test with environment variable
CLAUDECODE=1 node templates/ai-task-manager/config/scripts/detect-assistant.cjs
# Expected output: claude

# Test with debug
DEBUG=true node templates/ai-task-manager/config/scripts/detect-assistant.cjs
# Expected: Debug messages to stderr, "claude" to stdout

# Test in empty directory
cd /tmp && node /workspace/templates/ai-task-manager/config/scripts/detect-assistant.cjs
# Expected output: unknown (or claude if .claude/ dir exists in /tmp)

# Verify directory detection
mkdir -p /tmp/test-project/.claude
cd /tmp/test-project
node /workspace/templates/ai-task-manager/config/scripts/detect-assistant.cjs
# Expected output: claude
```

### Test 2: Configuration Reader

```bash
# Test reading Claude config
node templates/ai-task-manager/config/scripts/read-assistant-config.cjs claude
# Expected: Global and/or project configuration content with section headers

# Test with debug
DEBUG=true node templates/ai-task-manager/config/scripts/read-assistant-config.cjs claude
# Expected: Debug messages showing file paths checked

# Test unknown assistant
node templates/ai-task-manager/config/scripts/read-assistant-config.cjs foobar
# Expected: No output (graceful degradation)

# Test integration
ASSISTANT=$(node templates/ai-task-manager/config/scripts/detect-assistant.cjs)
echo "Detected assistant: $ASSISTANT"
node templates/ai-task-manager/config/scripts/read-assistant-config.cjs "$ASSISTANT"
# Expected: Two-line output showing assistant name and configuration
```

### Test 3: Command Template Integration

This requires rebuilding the templates and testing with actual slash commands:

```bash
# Rebuild project with updated templates
npm run build
npm start init --assistants claude --destination-directory /tmp/test-integration

# Navigate to test project
cd /tmp/test-integration

# Test create-plan command
/tasks:create-plan "test plan"
# Verify: Configuration section appears before plan creation instructions

# Test generate-tasks command (requires a plan first)
# Create a simple plan first, then run:
/tasks:generate-tasks 1
# Verify: Configuration section appears before task generation instructions

# Test execute-blueprint command (requires blueprint)
# This is harder to test without a complete plan, but verify the template syntax
cat .claude/commands/tasks/execute-blueprint.md
# Verify: Configuration section is present after title, before main content
```

### Test 4: Graceful Degradation

```bash
# Test with missing global config
# Temporarily rename ~/.claude to ~/.claude.backup
mv ~/.claude ~/.claude.backup
node templates/ai-task-manager/config/scripts/read-assistant-config.cjs claude
# Expected: Only project-level config shown (or empty if no project config)

# Restore
mv ~/.claude.backup ~/.claude

# Test with missing project config
cd /tmp
node /workspace/templates/ai-task-manager/config/scripts/read-assistant-config.cjs claude
# Expected: Only global config shown
```

### Test 5: Verification Checklist

For each test:
- [ ] Script exits with status 0 (success) even on errors
- [ ] Output format matches specification
- [ ] No stack traces or unhandled exceptions
- [ ] DEBUG mode provides helpful troubleshooting info
- [ ] Works on current platform

### Success Criteria

All tests pass with:
- ✅ Correct assistant detection
- ✅ Configuration files read successfully
- ✅ Command templates display configuration
- ✅ Graceful handling of missing files
- ✅ No breaking changes to existing functionality
- ✅ Clear directive language ("MUST") visible in commands

### Troubleshooting

If tests fail:
1. Check file permissions on scripts (chmod +x if needed)
2. Verify Node.js version compatibility
3. Check for syntax errors in scripts
4. Enable DEBUG mode for detailed logging
5. Verify template file paths are correct

</details>
