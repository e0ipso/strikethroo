---
id: 1
group: "directory-structure-fix"
dependencies: []
status: "completed"
created: 2025-11-06
skills:
  - typescript
---
# Fix OpenCode Directory Structure in copyAssistantTemplates

## Objective

Modify the `copyAssistantTemplates()` function in `src/index.ts` to copy OpenCode templates directly to `.opencode/command/` (singular) instead of copying to `.opencode/commands/` and then attempting to rename.

## Skills Required

- TypeScript: Modify the template copying logic and conditional path handling
- Node.js file system operations: Understanding of fs-extra copy operations

## Acceptance Criteria

- [ ] OpenCode templates are copied directly to `.opencode/command/` directory
- [ ] The post-copy rename logic (lines 327-334 in src/index.ts) is removed
- [ ] Claude and Gemini continue using `.claude/commands/` and `.gemini/commands/` respectively
- [ ] All existing integration tests pass

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Current Problematic Code** (`src/index.ts:320-334`):
```typescript
// Copy entire template directory structure
await fs.copy(sourceDir, assistantDir);

// OpenCode uses 'command' (singular) instead of 'commands' (plural)
if (assistant === 'opencode') {
  const commandsDir = resolvePath(assistantDir, 'commands');
  const commandDir = resolvePath(assistantDir, 'command');

  if (await exists(commandsDir)) {
    await fs.move(commandsDir, commandDir);
  }
}
```

**Required Changes**:
1. Calculate the correct `commandsPath` BEFORE copying
2. Copy templates directly to the correct destination path
3. Remove the rename logic

**Key Insight**: The issue is that `fs.copy(sourceDir, assistantDir)` copies the entire `templates/assistant/` structure, including the `commands/` directory. We need to copy intelligently based on the target assistant.

## Input Dependencies

None - this is the first task and has no dependencies.

## Output Artifacts

- Modified `src/index.ts` with corrected directory copying logic for OpenCode
- OpenCode installations will have `.opencode/command/tasks/` structure

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Approach

The fix requires restructuring how the template directory is copied to handle the singular/plural distinction at copy-time rather than post-copy.

### Step-by-Step Implementation

1. **Read the current implementation** at `src/index.ts:320-334` to understand the full context

2. **Identify the copy logic** - The current code does:
   ```typescript
   await fs.copy(sourceDir, assistantDir);
   ```
   Where `sourceDir = templates/assistant/` and `assistantDir = .opencode/`

3. **Determine the correct approach**:
   - Option A: Copy the entire structure, then move `commands/` → `command/` (CURRENT - BUGGY)
   - Option B: Copy selectively, mapping source `commands/` to target `command/` based on assistant type (CORRECT)

4. **Implement Option B**:
   ```typescript
   // Determine correct commands directory name
   const commandsPath = assistant === 'opencode' ? 'command' : 'commands';

   // Copy template structure with correct naming
   const sourceCommandsDir = resolvePath(sourceDir, 'commands');
   const targetCommandsDir = resolvePath(assistantDir, commandsPath);

   // Copy the commands directory to the correct location
   await fs.copy(sourceCommandsDir, targetCommandsDir);
   ```

5. **Remove obsolete code**: Delete lines 327-334 (the rename logic)

6. **Verify paths in other functions**: Check that the `commandsPath` variable is consistently used throughout the function (already present at line 341)

### Testing Verification

After implementation:
```bash
# Build and test
npm run build
npm test

# Manual verification for OpenCode
rm -rf /tmp/test-opencode
mkdir -p /tmp/test-opencode
cd /tmp/test-opencode
node /workspace/dist/cli.js init --assistants opencode
ls -la .opencode/command/tasks/  # Should exist and contain .md files
```

### Edge Cases

- Ensure other files in `templates/assistant/` (if any besides `commands/`) are still copied
- Verify that the logic at line 341 (`const commandsPath = assistant === 'opencode' ? 'command' : 'commands';`) still works correctly with the new copy approach

</details>
