---
id: 3
group: "core-functionality"
dependencies: [2]
status: "completed"
created: "2025-10-16"
skills:
  - typescript
  - terminal-ui
---
# Show Subcommand Implementation

## Objective
Implement the `show` subcommand to display plan metadata, executive summary, and task statistics with visual formatting that matches the status command aesthetics.

## Skills Required
- TypeScript for implementation
- Terminal UI formatting using chalk library

## Acceptance Criteria
- [ ] `showPlan(planId)` function displays plan details with proper formatting
- [ ] Shows YAML frontmatter fields: ID, summary, created date
- [ ] Displays Executive Summary section with proper text wrapping
- [ ] Shows task statistics with progress bar (X/Y tasks, percentage)
- [ ] Visual formatting matches status command (cyan headers, colored bullets, dividers)
- [ ] Works for both active and archived plans
- [ ] Error message for plan not found
- [ ] Handles missing Executive Summary gracefully
- [ ] Returns `{ success: boolean, message?: string }` result

## Technical Requirements
- Use chalk for colored output (cyan, green, yellow, blue, gray)
- Terminal width: 80 characters for dividers
- Reuse progress bar function from status.ts
- Reuse formatting helper functions from status.ts
- Use loadPlanData() from task 2 for data retrieval
- Follow existing error handling patterns

## Input Dependencies
- Task 2: `loadPlanData()`, `PlanData` type
- Existing status.ts: `createProgressBar()`, `formatSectionHeader()` functions

## Output Artifacts
- `showPlan()` function in `src/plan.ts`
- Visual output formatted to match status command aesthetics

## Implementation Notes

<details>
<summary>Click to expand detailed implementation guidance</summary>

### Module Structure

Create `src/plan.ts` with the show command implementation:

```typescript
import chalk from 'chalk';
import { loadPlanData } from './plan-utils';

const TERM_WIDTH = 80;
const DIVIDER = '─'.repeat(TERM_WIDTH);

/**
 * Format a section header (reuse from status.ts or duplicate)
 */
function formatSectionHeader(title: string): string {
  return `\n${chalk.cyan.bold(title)}\n${chalk.cyan(DIVIDER)}\n`;
}

/**
 * Create an ASCII progress bar (reuse from status.ts or duplicate)
 */
function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `[${bar}] ${percentage}%`;
}
```

### showPlan Implementation

```typescript
export async function showPlan(planId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const planData = await loadPlanData(planId);

    if (!planData) {
      return {
        success: false,
        message: `Plan ${planId} not found. Check .ai/task-manager/plans/ and .ai/task-manager/archive/`,
      };
    }

    // Build output
    let output = '';

    // Header
    output += chalk.bold.white(`\nPlan ${planData.id}\n`);
    output += chalk.gray(DIVIDER) + '\n';

    // Metadata section
    output += formatSectionHeader('Metadata');
    output += `  ${chalk.cyan('●')} ID: ${planData.id}\n`;
    output += `  ${chalk.cyan('●')} Created: ${planData.created}\n`;
    output += `  ${chalk.cyan('●')} Status: ${planData.isArchived ? chalk.blue('Archived') : chalk.green('Active')}\n`;
    output += `  ${chalk.cyan('●')} Summary: ${planData.summary}\n`;

    // Task statistics section
    const taskCount = planData.tasks.length;
    const completedCount = planData.tasks.filter(t => t.status === 'completed').length;
    const percentage = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    output += formatSectionHeader('Task Progress');
    if (taskCount > 0) {
      output += `  ${createProgressBar(percentage, 20)} ${completedCount}/${taskCount} tasks completed\n`;
    } else {
      output += `  ${chalk.gray('No tasks generated yet')}\n`;
    }

    // Executive Summary section
    output += formatSectionHeader('Executive Summary');

    // Word wrap the executive summary to 76 chars (80 - 4 for indent)
    const wrappedSummary = wrapText(planData.executiveSummary, 76);
    output += wrappedSummary.split('\n').map(line => `  ${line}`).join('\n') + '\n';

    // Footer
    output += '\n' + chalk.gray(DIVIDER) + '\n';

    console.log(output);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to display plan: ${message}`,
    };
  }
}
```

### Text Wrapping Helper

```typescript
/**
 * Wrap text to specified width, preserving paragraphs
 */
function wrapText(text: string, maxWidth: number): string {
  const paragraphs = text.split('\n\n');

  return paragraphs.map(paragraph => {
    const words = paragraph.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.join('\n');
  }).join('\n\n');
}
```

### Export Pattern

```typescript
// Export both show and archive for use in cli.ts
export { showPlan, archivePlan };
```

### Visual Output Example

```
Plan 12
────────────────────────────────────────────────────────────────────────────────

Metadata
────────────────────────────────────────────────────────────────────────────────
  ● ID: 12
  ● Created: 2025-10-01
  ● Status: Active
  ● Summary: Implement user authentication system

Task Progress
────────────────────────────────────────────────────────────────────────────────
  [████████████░░░░░░░░] 60% 3/5 tasks completed

Executive Summary
────────────────────────────────────────────────────────────────────────────────
  This plan implements a comprehensive user authentication system with
  login, logout, and session management capabilities. The implementation
  follows industry best practices for security and uses JWT tokens for
  stateless authentication.

────────────────────────────────────────────────────────────────────────────────
```

</details>
