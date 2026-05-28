---
id: 2
group: "plan-management"
dependencies: [1]
status: "completed"
created: 2025-10-17
skills:
  - typescript
  - cli
---
# Refactor Plan Command to Nested Commander.js Subcommands

## Objective

Refactor the plan command in src/cli.ts from a single action handler to properly nested Commander.js subcommands (show, archive, delete) with individual help text for each, while maintaining backward compatibility with the shorthand `plan <id>` syntax.

## Skills Required

- **typescript**: TypeScript implementation following existing patterns
- **cli**: Commander.js subcommand structure and help system configuration

## Acceptance Criteria

- [ ] Plan command uses nested `.command()` structure for all three subcommands
- [ ] Each subcommand (show, archive, delete) has dedicated `.description()` help text
- [ ] Each subcommand accepts `<plan-id>` as a required argument
- [ ] `npm start plan --help` displays all subcommands with descriptions
- [ ] `npm start plan show --help` displays show-specific help
- [ ] `npm start plan archive --help` displays archive-specific help
- [ ] `npm start plan delete --help` displays delete-specific help
- [ ] Shorthand `npm start plan <id>` continues to work (routes to show)
- [ ] All subcommands validate plan ID is numeric
- [ ] Error messages are clear and consistent across subcommands

## Technical Requirements

- Use Commander.js `.command()` method to create nested subcommands
- Import `deletePlan` function from src/plan.ts
- Maintain consistent error handling patterns with existing commands
- Use logger.error() and logger.info() for output
- Follow Commander.js best practices for subcommand structure
- Ensure each subcommand calls await logger.initLogger() if not initialized by parent

## Input Dependencies

- Task 1: Requires `deletePlan` function to exist in src/plan.ts

## Output Artifacts

- Refactored plan command structure in src/cli.ts
- Three separate subcommand definitions with help text
- Backward compatibility handler for shorthand syntax

## Implementation Notes

<details>
<summary>Click to expand detailed implementation guidance</summary>

### Current Implementation (src/cli.ts:79-137)
The current code uses a single action handler with manual subcommand routing:
```typescript
program
  .command('plan [subcommand] [plan-id]')
  .description('Display or manage a specific plan')
  .action(async (subcommandOrId: string, maybePlanId?: string) => {
    // Manual routing logic...
  });
```

### Target Structure
Replace the current implementation with nested subcommands:

```typescript
// Import the new deletePlan function
import { showPlan, archivePlan, deletePlan } from './plan';

// Create parent plan command for help organization
const planCommand = program
  .command('plan')
  .description('Display and manage plans. Use `plan <id>` as shorthand for `plan show <id>`.');

// Plan show subcommand
planCommand
  .command('show <plan-id>')
  .description('Display plan metadata, progress, and executive summary')
  .action(async (planId: string) => {
    try {
      await logger.initLogger();

      const planIdNum = parseInt(planId, 10);
      if (isNaN(planIdNum)) {
        await logger.error(`Invalid plan ID: ${planId}. Must be a number.`);
        process.exit(1);
      }

      const result = await showPlan(planIdNum);

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

// Plan archive subcommand
planCommand
  .command('archive <plan-id>')
  .description('Move a plan from active to archive directory')
  .action(async (planId: string) => {
    try {
      await logger.initLogger();

      const planIdNum = parseInt(planId, 10);
      if (isNaN(planIdNum)) {
        await logger.error(`Invalid plan ID: ${planId}. Must be a number.`);
        process.exit(1);
      }

      const result = await archivePlan(planIdNum);

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

// Plan delete subcommand
planCommand
  .command('delete <plan-id>')
  .description('Permanently delete a plan and all its tasks')
  .action(async (planId: string) => {
    try {
      await logger.initLogger();

      const planIdNum = parseInt(planId, 10);
      if (isNaN(planIdNum)) {
        await logger.error(`Invalid plan ID: ${planId}. Must be a number.`);
        process.exit(1);
      }

      const result = await deletePlan(planIdNum);

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

// Backward compatibility: plan <id> as shorthand for plan show <id>
planCommand
  .argument('[plan-id]', 'Plan ID to display (shorthand for show subcommand)')
  .action(async (planId?: string) => {
    // Only handle if planId is provided and no subcommand was matched
    if (planId) {
      try {
        await logger.initLogger();

        const planIdNum = parseInt(planId, 10);
        if (isNaN(planIdNum)) {
          await logger.error(`Invalid plan ID: ${planId}. Must be a number.`);
          process.exit(1);
        }

        const result = await showPlan(planIdNum);

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
    }
  });
```

### Implementation Steps

1. **Update imports**
   - Add `deletePlan` to the imports from './plan'

2. **Remove old implementation**
   - Delete the current `program.command('plan [subcommand] [plan-id]')` block (lines 79-137)

3. **Add new nested subcommand structure**
   - Create parent `plan` command
   - Add three subcommands: show, archive, delete
   - Add backward compatibility handler

4. **Test all variations**
   ```bash
   npm run build
   npm start plan --help          # Should list all subcommands
   npm start plan show --help     # Should show help for show
   npm start plan archive --help  # Should show help for archive
   npm start plan delete --help   # Should show help for delete
   npm start plan 37              # Should display plan 37 (shorthand)
   npm start plan show 37         # Should display plan 37
   ```

### Error Handling Pattern
Each subcommand should follow the same error handling pattern:
- Validate plan ID is numeric
- Use try-catch for unexpected errors
- Return appropriate exit codes (0 for success, 1 for error)
- Use logger for all output

### Code Organization
- Place the new code in the same location as the old plan command (after status command, before preAction hook)
- Maintain consistent indentation and formatting with existing code
- Add appropriate spacing between subcommands for readability

</details>
