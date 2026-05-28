---
id: 4
group: "visual-output"
dependencies: [3]
status: "completed"
created: "2025-10-16"
skills:
  - "typescript"
  - "terminal-ui"
---
# Implement Visual Formatting

## Objective
Create terminal formatting functions that produce visually appealing output with colors, progress bars, and organized sections matching the OpenSpec dashboard style.

## Skills Required
- TypeScript development
- Terminal UI design and formatting

## Acceptance Criteria
- [ ] Implement section header formatting with colored text and dividers
- [ ] Implement colored bullet points for statistics
- [ ] Implement ASCII progress bar generation
- [ ] Implement list item formatting (checkmarks, dots)
- [ ] Create dashboard layout assembly function
- [ ] Output respects 80+ character terminal width
- [ ] Colors follow the reference design (cyan headers, green active, blue completed, magenta progress)

## Technical Requirements
Use chalk library (existing dependency) to create:
- Section headers: Bold cyan text with horizontal dividers
- Summary bullets: Colored dots (●) with appropriate colors
- Progress bars: `[████████░░░░░░░░░░] XX%` format
- List items: ✓ for completed, ● for in-progress
- Horizontal dividers: Lines using Unicode characters

## Input Dependencies
- DashboardStatistics from task 3
- PlanMetadata[] from task 2
- Chalk library (existing dependency)

## Output Artifacts
- Formatting functions in `src/status.ts`:
  - `formatDashboard(stats, plans): string`
  - Helper functions for sections and formatting elements

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Step 1: Import Chalk and Setup
```typescript
import chalk from 'chalk';

// Terminal width for formatting (conservative for compatibility)
const TERM_WIDTH = 80;
const DIVIDER = '─'.repeat(TERM_WIDTH);
```

### Step 2: Create Section Header Formatter
```typescript
function formatSectionHeader(title: string): string {
  return `\n${chalk.cyan.bold(title)}\n${chalk.cyan(DIVIDER)}\n`;
}
```

### Step 3: Create Progress Bar Function
```typescript
function createProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `[${bar}] ${percentage}%`;
}
```

### Step 4: Format Summary Section
```typescript
function formatSummary(stats: DashboardStatistics): string {
  let output = formatSectionHeader('Summary:');

  output += `  ${chalk.cyan('●')} Total Plans: ${stats.totalPlans}\n`;
  output += `  ${chalk.green('●')} Active Plans: ${stats.activePlans}\n`;
  output += `  ${chalk.blue('●')} Archived Plans: ${stats.archivedPlans}\n`;
  output += `  ${chalk.magenta('●')} Task Progress: ${createProgressBar(stats.taskCompletionRate)} (${stats.taskCompletionRate}% complete)\n`;

  return output;
}
```

### Step 5: Format Active Plans Section
```typescript
function formatActivePlans(plans: PlanMetadata[]): string {
  const activePlans = plans.filter(p => !p.isArchived);

  if (activePlans.length === 0) {
    return formatSectionHeader('Active Plans') + '  No active plans\n';
  }

  let output = formatSectionHeader('Active Plans');

  for (const plan of activePlans) {
    const taskCount = plan.tasks.length;
    const completedCount = plan.tasks.filter(t => t.status === 'completed').length;
    const percentage = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

    // Truncate long summaries to fit terminal width
    const summary = plan.summary.length > 50
      ? plan.summary.substring(0, 47) + '...'
      : plan.summary;

    output += `  ${chalk.yellow('●')} ${chalk.bold(`Plan ${plan.id}`)}: ${summary}\n`;

    if (taskCount > 0) {
      output += `      ${createProgressBar(percentage, 20)} ${completedCount}/${taskCount} tasks\n`;
    } else {
      output += `      ${chalk.gray('No tasks generated')}\n`;
    }
  }

  return output;
}
```

### Step 6: Format Archived Plans Section
```typescript
function formatArchivedPlans(plans: PlanMetadata[]): string {
  const archivedPlans = plans.filter(p => p.isArchived);

  if (archivedPlans.length === 0) {
    return formatSectionHeader('Archived Plans') + '  No archived plans\n';
  }

  let output = formatSectionHeader('Archived Plans');

  for (const plan of archivedPlans) {
    const summary = plan.summary.length > 60
      ? plan.summary.substring(0, 57) + '...'
      : plan.summary;

    output += `  ${chalk.green('✓')} ${chalk.bold(`Plan ${plan.id}`)}: ${summary}\n`;
  }

  return output;
}
```

### Step 7: Main Dashboard Formatter
```typescript
export function formatDashboard(stats: DashboardStatistics, plans: PlanMetadata[]): string {
  let output = '';

  // Title
  output += chalk.bold.white('\nAI Task Manager Dashboard\n');
  output += chalk.gray(DIVIDER) + '\n';

  // Summary section
  output += formatSummary(stats);

  // Active plans section
  output += formatActivePlans(plans);

  // Archived plans section
  output += formatArchivedPlans(plans);

  // Footer
  output += '\n' + chalk.gray(DIVIDER) + '\n';

  return output;
}
```

### Visual Design Reference (from OpenSpec)
Based on the dashboard.png reference:
- **Headers**: Cyan colored, bold, with divider lines
- **Bullets**: Colored dots (●) matching content type
  - Cyan: General info
  - Green: Active/in-progress items
  - Blue: Completed items
  - Magenta: Progress metrics
- **Progress bars**: Green filled (█), gray empty (░)
- **Checkmarks**: Green ✓ for completed items
- **Dividers**: Horizontal lines using Unicode box-drawing characters

### Terminal Compatibility
- Use widely-supported Unicode characters
- Chalk automatically detects color support
- Keep lines under 80 characters for narrow terminals
- Provide graceful degradation if colors aren't supported

### Testing Approach
Manually test output with:
- Empty project (no plans)
- Single plan with no tasks
- Multiple plans with various completion states
- Long plan summaries (test truncation)
- Terminal with and without color support

</details>
