---
id: 5
group: "cli-integration"
dependencies: [2, 3, 4]
status: "completed"
created: "2025-10-16"
skills:
  - "typescript"
  - "cli"
---
# Integrate Status Command into CLI

## Objective
Wire together all components and add the `status` command to the CLI, following existing patterns from the `init` command.

## Skills Required
- TypeScript development
- CLI framework (Commander.js)

## Acceptance Criteria
- [ ] Add `status` command to `src/cli.ts`
- [ ] Create main `status()` function in `src/status.ts` that orchestrates all components
- [ ] Command executes without arguments
- [ ] Command outputs formatted dashboard to console
- [ ] Error handling prevents crashes and shows helpful messages
- [ ] Command returns appropriate exit codes (0 for success, 1 for errors)
- [ ] Command can be run via `npx @e0ipso/ai-task-manager status`

## Technical Requirements
Follow the existing CLI pattern from the `init` command:
- Use Commander.js `.command()` and `.action()` syntax
- Initialize logger for colored output
- Handle errors with try-catch and appropriate exit codes
- Return success/failure results

Main function signature:
```typescript
export async function status(): Promise<{ success: boolean; message?: string }>
```

## Input Dependencies
- `collectPlanData()` from task 2
- `calculateStatistics()` from task 3
- `formatDashboard()` from task 4
- Existing CLI infrastructure in `src/cli.ts`

## Output Artifacts
- Updated `src/cli.ts` with status command
- Main `status()` function in `src/status.ts`
- Fully functional status command

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Step 1: Add Command to CLI (src/cli.ts)
```typescript
import { status } from './status';

// Add after the init command
program
  .command('status')
  .description('Display dashboard with plans and task statistics')
  .action(async () => {
    try {
      await logger.initLogger();

      const result = await status();

      if (result.success) {
        process.exit(0);
      } else {
        if (result.message) {
          await logger.error(result.message);
        }
        process.exit(1);
      }
    } catch (error) {
      await logger.error(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });
```

### Step 2: Implement Main Status Function (src/status.ts)
```typescript
export async function status(): Promise<{ success: boolean; message?: string }> {
  try {
    // Step 1: Collect data
    const plans = await collectPlanData();

    // Step 2: Calculate statistics
    const stats = calculateStatistics(plans);

    // Step 3: Format output
    const dashboard = formatDashboard(stats, plans);

    // Step 4: Display
    console.log(dashboard);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to generate dashboard: ${message}`
    };
  }
}
```

### Step 3: Add Type Exports
Ensure all TypeScript interfaces are exported from `src/types.ts` or `src/status.ts` for proper type checking.

### Step 4: Error Handling Strategy
Handle these error scenarios:
- Missing `.ai/task-manager/` directory → Show friendly message
- No plans found → Show empty dashboard (not an error)
- File read errors → Log warning, skip file, continue
- YAML parse errors → Log warning, skip file, continue
- Unexpected errors → Return failure with error message

### Step 5: Build and Test
```bash
# Build the project
npm run build

# Test the command
npm start status

# Or after publishing
npx @e0ipso/ai-task-manager status
```

### Integration Pattern
Follow the exact pattern from the `init` command:
1. Command definition in `src/cli.ts`
2. Logger initialization
3. Main function call
4. Result handling with exit codes
5. Error handling with try-catch

### Edge Cases to Handle
- Empty project (no .ai directory) → Show message about initializing first
- No plans created yet → Show empty dashboard
- Corrupted files → Skip and log warning
- Permission errors → Return error with helpful message

### Manual Testing Checklist
- [ ] Run in project with no .ai directory
- [ ] Run in project with empty plans directory
- [ ] Run in project with one active plan
- [ ] Run in project with multiple plans and tasks
- [ ] Run in project with archived plans
- [ ] Verify output matches visual specification
- [ ] Check terminal color rendering
- [ ] Verify exit codes (0 for success)

</details>
