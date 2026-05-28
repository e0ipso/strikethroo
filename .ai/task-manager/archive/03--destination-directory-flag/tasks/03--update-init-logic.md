---
id: 3
group: "core-logic"
dependencies: [1]
status: "completed"
created: "2025-09-01"
completed: "2025-09-01"
---

# Task 03: Update Init Command Path Resolution

## Objective
Modify the init command logic in index.ts to use the destination directory as the base path for all created directories and files.

## Acceptance Criteria
- [ ] Path resolution uses destination directory when provided
- [ ] Default behavior (current directory) preserved when flag omitted
- [ ] All directory creation paths updated to use base directory
- [ ] Logging messages reflect actual destination paths

## Technical Requirements
- Edit `src/index.ts`
- Update all path constructions to use destination directory
- Use path.join() for proper cross-platform paths
- Handle both relative and absolute destination paths

## Input Dependencies
- Updated InitOptions type from task 01

## Output Artifacts
- Init function that respects destination directory setting

## Implementation Notes
```typescript
export async function init(options: InitOptions): Promise<void> {
  const baseDir = options.destinationDirectory || '.';
  const assistants = parseAssistants(options.assistants);

  // Update all paths to use baseDir
  await ensureDir(path.join(baseDir, '.ai/task-manager/plans'));

  // Copy templates to destination
  await copyTemplate(
    '/workspace/templates/ai-task-manager/TASK_MANAGER.md',
    path.join(baseDir, '.ai/task-manager/config/TASK_MANAGER.md')
  );

  // Similar updates for assistant directories
}
```