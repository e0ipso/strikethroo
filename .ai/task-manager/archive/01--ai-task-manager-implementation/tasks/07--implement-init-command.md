---
id: "07"
group: "cli-implementation"
dependencies: ["03", "04", "05"]
status: "completed"
created_at: "2025-09-01T10:00:00Z"
---

# Task 07: Implement Init Command Logic

## Objective
Implement the main init command logic in index.ts that creates directory structures and copies template files based on the selected assistants.

## Acceptance Criteria
- [ ] Validates assistant values (claude, gemini, or both)
- [ ] Creates .ai/task-manager directory structure
- [ ] Creates assistant-specific directories (.claude, .gemini)
- [ ] Copies template files to correct locations
- [ ] Handles existing directories (merge and overwrite)
- [ ] Shows success message with created directories

## Technical Requirements
- Use async/await for all file operations
- Validate input before processing
- Use utility functions from utils.ts
- Log progress using logger.ts
- Handle errors gracefully

## Input Dependencies
- src/index.ts file created (from task 02)
- Type definitions (from task 03)
- Logger utility (from task 04)
- File utilities (from task 05)

## Output Artifacts
- Complete index.ts with init function implementation
- Exported init function for CLI usage

## Implementation Notes
```typescript
export async function init(options: InitOptions): Promise<void> {
  const assistants = parseAssistants(options.assistants);

  // Validate assistants
  for (const assistant of assistants) {
    if (!['claude', 'gemini'].includes(assistant)) {
      throw new Error(`Invalid assistant: ${assistant}`);
    }
  }

  // Create .ai/task-manager structure
  await ensureDir('.ai/task-manager/plans');

  // Copy common templates
  await copyTemplate(
    '/workspace/templates/ai-task-manager/TASK_MANAGER.md',
    '.ai/task-manager/config/TASK_MANAGER.md'
  );

  // Create assistant-specific directories
  if (assistants.includes('claude')) {
    await ensureDir('.claude/commands/tasks');
    // Copy claude templates
  }

  logger.success('Initialization completed successfully!');
}
```