---
id: 1
group: agent-template-processing
dependencies: []
status: completed
created: '2025-11-19'
skills:
  - typescript
  - file-system
---

# Task: Copy Agent Files to Claude Directory

## Objective

Modify `createAssistantStructure()` function in `src/index.ts` to copy agent template files from `templates/assistant/agents/` to `.claude/agents/` directory during initialization, implementing Claude-only agent file support.

## Skills Required

- `typescript`: Modify existing TypeScript initialization logic
- `file-system`: File copying operations using fs-extra library

## Acceptance Criteria

1. When `assistant === 'claude'`, agent files are copied from source to destination
2. Source path: `templates/assistant/agents/`
3. Destination path: `.claude/agents/`
4. Agent files remain in Markdown format (no conversion)
5. Gemini and OpenCode assistants skip agent file copying
6. Existing command processing logic remains unchanged
7. Function uses existing `exists()` and `fs.copy()` utilities

## Technical Requirements

<details>
<summary>Implementation Details</summary>

### Location
File: `src/index.ts`
Function: `createAssistantStructure()`

### Implementation Steps

1. **Locate insertion point**: After command processing logic (around line 357, after the format conversion block)

2. **Add Claude agent processing block**:
```typescript
// Copy agent files for Claude (agents are Claude-specific)
if (assistant === 'claude') {
  const sourceAgentsDir = resolvePath(sourceDir, 'agents');
  const targetAgentsDir = resolvePath(assistantDir, 'agents');

  if (await exists(sourceAgentsDir)) {
    await fs.copy(sourceAgentsDir, targetAgentsDir);
  }
}
```

3. **Verify conditionals**: Ensure agent copying only executes for Claude
4. **Test path resolution**: Confirm `resolvePath()` correctly handles both source and target paths
5. **Check existing utilities**: Use `exists()` and `fs.copy()` from existing imports

### Code Pattern to Follow

Mirror the command copying pattern (lines 328-334) but:
- No format conversion needed (agents are always Markdown)
- No file iteration needed (copy entire directory)
- Claude-specific conditional (not shared across assistants)

### Integration Points

- Source directory: Defined by `getTemplatePath('assistant')`
- Destination directory: Already created as `.${assistant}`
- Utilities: `resolvePath()`, `exists()`, `fs.copy()` (already imported)

</details>

## Input Dependencies

- Source template directory: `templates/assistant/agents/` must exist
- Function: `createAssistantStructure()` must be called during init
- Assistant type parameter correctly identifies 'claude'

## Output Artifacts

- `.claude/agents/` directory created
- `plan-creator.md` copied to `.claude/agents/plan-creator.md`
- No changes to `.gemini/` or `.opencode/` directories

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Current Code Context

The `createAssistantStructure()` function (lines 314-358) already:
1. Validates source template directory exists
2. Determines command directory naming (commands vs command)
3. Copies and processes command files
4. Converts formats for Gemini

### Integration Strategy

**Add agent processing AFTER command processing but BEFORE function ends**:

```typescript
async function createAssistantStructure(assistant: Assistant, baseDir: string): Promise<void> {
  // ... existing command processing code ...

  // NEW: Copy agent files for Claude
  if (assistant === 'claude') {
    const sourceAgentsDir = resolvePath(sourceDir, 'agents');
    const targetAgentsDir = resolvePath(assistantDir, 'agents');

    if (await exists(sourceAgentsDir)) {
      await fs.copy(sourceAgentsDir, targetAgentsDir);
    }
  }
}
```

### Why This Approach

- **No format conversion**: Agents are Markdown-only (simpler than commands)
- **Directory-level copy**: Copy entire agents folder (not file-by-file)
- **Claude-specific**: Only Claude has native agent support
- **Non-breaking**: Inserted after commands, doesn't modify existing logic

### Testing Considerations

After implementation, verify:
- `npm run build` compiles successfully
- `npx . init --assistants claude --destination-directory /tmp/test-claude` creates `.claude/agents/`
- `npx . init --assistants gemini --destination-directory /tmp/test-gemini` does NOT create agents directory
- Existing command copying still works for all assistants

</details>
