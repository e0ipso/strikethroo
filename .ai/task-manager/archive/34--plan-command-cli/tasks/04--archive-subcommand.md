---
id: 4
group: "core-functionality"
dependencies: [2]
status: "completed"
created: "2025-10-16"
skills:
  - typescript
  - node-fs
---
# Archive Subcommand Implementation

## Objective
Implement the `archive` subcommand to manually archive plans by moving them to the archive directory, updating all task statuses to "completed", and appending a "Manually archived" note to the plan document.

## Skills Required
- TypeScript for implementation
- Node.js filesystem operations for file manipulation and directory moves

## Acceptance Criteria
- [ ] `archivePlan(planId)` function archives plans with all required operations
- [ ] Validates plan exists in plans/ directory (not already archived)
- [ ] Warns user if incomplete tasks exist and prompts for confirmation
- [ ] Updates all task frontmatter status fields to "completed"
- [ ] Appends "Manually archived on YYYY-MM-DD" note to plan document
- [ ] Moves plan directory from plans/ to archive/
- [ ] Error handling for already-archived plans and missing plans
- [ ] Returns `{ success: boolean, message?: string }` result
- [ ] Displays success message with new archive location

## Technical Requirements
- Use `fs-extra` for file operations (readFile, writeFile, move)
- Use `gray-matter` for frontmatter manipulation
- Use readline or similar for user confirmation prompt
- Date formatting: `YYYY-MM-DD` format using ISO string
- Archive note format: `\n---\n\n**Note**: Manually archived on YYYY-MM-DD\n`
- Atomic operations: update files before moving directory

## Input Dependencies
- Task 2: `findPlanById()`, `loadPlanData()` functions

## Output Artifacts
- `archivePlan()` function in `src/plan.ts`
- Modified plan and task files with updated status and notes

## Implementation Notes

<details>
<summary>Click to expand detailed implementation guidance</summary>

### archivePlan Implementation

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import * as readline from 'readline';
import { findPlanById, loadPlanData } from './plan-utils';

export async function archivePlan(planId: number): Promise<{ success: boolean; message?: string }> {
  try {
    // 1. Find and validate plan location
    const location = await findPlanById(planId);

    if (!location) {
      return {
        success: false,
        message: `Plan ${planId} not found. Check .ai/task-manager/plans/ directory.`,
      };
    }

    if (location.isArchived) {
      return {
        success: false,
        message: `Plan ${planId} is already archived.`,
      };
    }

    // 2. Load plan data to check for incomplete tasks
    const planData = await loadPlanData(planId);
    if (!planData) {
      return { success: false, message: `Failed to load plan ${planId} data.` };
    }

    const incompleteTasks = planData.tasks.filter(t => t.status !== 'completed');

    // 3. Warn user if incomplete tasks exist
    if (incompleteTasks.length > 0) {
      console.log(chalk.yellow(`\n⚠  Warning: Plan ${planId} has ${incompleteTasks.length} incomplete task(s).\n`));

      const confirmed = await promptConfirmation('Archive anyway? (y/n): ');
      if (!confirmed) {
        return { success: false, message: 'Archive cancelled by user.' };
      }
    }

    // 4. Update all task files to completed status
    const tasksDir = path.join(location.directoryPath, 'tasks');
    if (await fs.pathExists(tasksDir)) {
      const taskFiles = await fs.readdir(tasksDir);

      for (const file of taskFiles) {
        if (!file.endsWith('.md')) continue;

        const taskPath = path.join(tasksDir, file);
        const content = await fs.readFile(taskPath, 'utf-8');
        const parsed = matter(content);

        // Update status to completed
        parsed.data.status = 'completed';

        // Write back with updated frontmatter
        const updated = matter.stringify(parsed.content, parsed.data);
        await fs.writeFile(taskPath, updated, 'utf-8');
      }
    }

    // 5. Append "Manually archived" note to plan document
    const planContent = await fs.readFile(location.filePath, 'utf-8');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const archiveNote = `\n---\n\n**Note**: Manually archived on ${today}\n`;
    const updatedContent = planContent + archiveNote;
    await fs.writeFile(location.filePath, updatedContent, 'utf-8');

    // 6. Move plan directory to archive
    const baseDir = process.cwd();
    const archiveDir = path.join(baseDir, '.ai/task-manager/archive');
    await fs.ensureDir(archiveDir);

    const planDirName = path.basename(location.directoryPath);
    const archivePath = path.join(archiveDir, planDirName);

    await fs.move(location.directoryPath, archivePath);

    // 7. Display success message
    console.log(chalk.green(`\n✓ Plan ${planId} successfully archived to .ai/task-manager/archive/${planDirName}\n`));

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to archive plan: ${message}`,
    };
  }
}
```

### User Confirmation Prompt

```typescript
/**
 * Prompt user for yes/no confirmation
 */
async function promptConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
```

### Error Handling Strategy

1. **Plan Not Found**: Check if plan exists before attempting archival
2. **Already Archived**: Validate plan is in plans/ directory, not archive/
3. **File System Errors**: Catch and report with context (permissions, disk space)
4. **User Cancellation**: Return gracefully with message
5. **Partial Failure**: If tasks update but move fails, log detailed error

### Archive Note Format

The note should be appended exactly as shown:

```markdown
---

**Note**: Manually archived on 2025-10-16
```

This creates a horizontal rule separator, then adds the note in bold with the date.

### Operation Order (Critical)

1. Validate plan location (prevent archiving already-archived plans)
2. Check incomplete tasks and prompt user
3. Update task files (modify in place)
4. Update plan file with note (modify in place)
5. Move directory (atomic operation)

This order ensures files are updated before moving, preventing data loss if move fails.

</details>
