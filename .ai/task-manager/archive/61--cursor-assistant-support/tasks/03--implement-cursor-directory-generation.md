---
id: 3
group: "init-logic"
dependencies: [2]
status: "completed"
created: "2025-12-02"
skills:
  - typescript
  - node-fs
---
# Implement Cursor Directory Structure Generation

## Objective
Add Cursor-specific logic to the init command to generate `.cursor/commands/tasks/` directory structure with all 7 command template files.

## Skills Required
- TypeScript for implementation logic
- Node.js file system operations

## Acceptance Criteria
- [ ] `createAssistantStructure()` handles 'cursor' assistant type
- [ ] Generated structure: `.cursor/commands/tasks/` with 7 .md files
- [ ] `getInitInfo()` includes `hasCursorConfig` detection
- [ ] Console output messages include Cursor-specific information
- [ ] TypeScript compilation succeeds
- [ ] Manual verification: running init with cursor generates expected files

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

Update `src/index.ts` to:
1. Add Cursor handling in `createAssistantStructure()` function
2. Add `hasCursorConfig` to `getInitInfo()` return object
3. Update console output formatting to mention Cursor

**Directory Structure**: `.cursor/commands/tasks/` (nested, like Claude and Gemini)
**File Format**: Markdown (.md) files, same as Claude
**Template Files**: create-plan.md, refine-plan.md, generate-tasks.md, execute-task.md, execute-blueprint.md, fix-broken-tests.md, full-workflow.md

## Input Dependencies
Requires Task 2 (utility functions) to be completed so `getTemplateFormat()` correctly returns 'md' for Cursor.

## Output Artifacts
Updated `src/index.ts` with complete Cursor initialization logic.

## Implementation Notes

<details>
<summary>Click to expand detailed implementation instructions</summary>

### Part 1: Update createAssistantStructure() function

The `createAssistantStructure()` function is at line 392 in `src/index.ts`. Cursor uses a nested directory structure like Claude and Gemini, so it will use the default code path (lines 470-514).

**No changes needed** to `createAssistantStructure()` for basic functionality because:
- Cursor uses 'commands' (plural) like Claude and Gemini
- Cursor uses Markdown format, so no conversion needed
- The existing logic at lines 470-482 handles copying the commands directory correctly

The existing code will automatically work for Cursor because:
```typescript
// Line 472: Cursor uses 'commands' (not 'command')
const commandsPath = assistant === 'opencode' ? 'command' : 'commands';
// This will correctly use 'commands' for Cursor

// Lines 475-481: Copy commands directory
const sourceCommandsDir = resolvePath(sourceDir, 'commands');
const targetCommandsDir = resolvePath(assistantDir, commandsPath);
if (await exists(sourceCommandsDir)) {
  await fs.copy(sourceCommandsDir, targetCommandsDir);
}
// This will copy to .cursor/commands/tasks/ correctly
```

### Part 2: Update getInitInfo() function

1. Locate the `getInitInfo()` function (line 528)
2. Add Cursor configuration detection after the GitHub detection (after line 543):
   ```typescript
   const hasCursorConfig = await exists(resolvePath(targetDir, '.cursor/commands/tasks'));
   ```

3. Add Cursor to the assistants array logic (after line 550):
   ```typescript
   if (hasCursorConfig) assistants.push('cursor');
   ```

4. Update the return type and return statement:
   - Add `hasCursorConfig: boolean;` to the return type (after line 534)
   - Add `hasCursorConfig,` to the return object (after line 558)

### Part 3: Update console output messages

There are multiple places where console messages mention assistants:

1. **After getInitInfo() call** (around lines 178-188): Update the summary message to include Cursor when detected
2. **Success message** (around lines 227-230): The existing message "Successfully initialized AI Task Manager..." already works generically

Look for patterns like:
```typescript
if (info.hasClaudeConfig) console.log(...);
if (info.hasGeminiConfig) console.log(...);
// Add similar for Cursor
if (info.hasCursorConfig) console.log(...);
```

### Part 4: Update displayWorkflowHelp() function (OPTIONAL)

The `displayWorkflowHelp()` function (line 566) shows generic workflow guidance. Since it doesn't mention specific assistants by name, **no changes are required** unless you want to add Cursor-specific notes.

### Verification Steps

1. Build the project: `npm run build`
2. Test initialization: `node dist/cli.js init --assistants cursor --destination-directory /tmp/test-cursor`
3. Verify directory structure exists: `ls -la /tmp/test-cursor/.cursor/commands/tasks/`
4. Verify all 7 files are present:
   - create-plan.md
   - refine-plan.md
   - generate-tasks.md
   - execute-task.md
   - execute-blueprint.md
   - fix-broken-tests.md
   - full-workflow.md
5. Verify files contain correct content (Markdown format with $ARGUMENTS placeholders)

### Important Notes

- Cursor uses the **nested directory structure** (`.cursor/commands/tasks/`), not flat like Codex
- Cursor uses **Markdown format** like Claude, so no special template processing is needed
- The existing template processing pipeline will handle Cursor automatically
- Focus on the detection logic in `getInitInfo()` and console messages; the core directory creation logic already works
</details>
