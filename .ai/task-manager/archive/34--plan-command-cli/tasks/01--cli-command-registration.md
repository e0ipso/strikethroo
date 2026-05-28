---
id: 1
group: "cli-infrastructure"
dependencies: []
status: "completed"
created: "2025-10-16"
skills:
  - typescript
  - commander-js
---
# CLI Command Registration

## Objective
Register the `plan` command in Commander.js with routing logic to handle `show` and `archive` subcommands, supporting shorthand syntax where `plan <id>` defaults to `plan show <id>`.

## Skills Required
- TypeScript for type-safe implementation
- Commander.js for CLI argument parsing and command routing

## Acceptance Criteria
- [ ] `plan` command registered in `src/cli.ts` following existing patterns
- [ ] Accepts optional subcommand parameter (defaults to "show")
- [ ] Accepts required plan-id parameter
- [ ] Routes to appropriate handler based on subcommand
- [ ] Error handling for invalid subcommands
- [ ] Logger initialization follows existing pattern
- [ ] Exit codes handled correctly (0 for success, 1 for errors)

## Technical Requirements
- Follow existing command registration pattern from `status` command
- Use Commander.js `.command()` and `.action()` methods
- Implement subcommand validation (only "show" and "archive" allowed)
- Import handler functions from new plan module (created in task 2)
- Parse plan-id as number and validate it's a valid integer

## Input Dependencies
None - this is the entry point

## Output Artifacts
- Updated `src/cli.ts` with new plan command registration
- Command routing logic that delegates to handler functions

## Implementation Notes

<details>
<summary>Click to expand detailed implementation guidance</summary>

### Command Registration Pattern

Follow the existing pattern from the `status` command in `src/cli.ts`:

```typescript
program
  .command('plan [subcommand] <plan-id>')
  .description('Display or manage a specific plan')
  .action(async (subcommandOrId: string, maybePlanId?: string) => {
    try {
      await logger.initLogger();

      // Handle shorthand: plan <id> = plan show <id>
      let subcommand: string;
      let planId: string;

      if (maybePlanId === undefined) {
        // Called as: plan <id>
        subcommand = 'show';
        planId = subcommandOrId;
      } else {
        // Called as: plan <subcommand> <id>
        subcommand = subcommandOrId;
        planId = maybePlanId;
      }

      // Validate subcommand
      if (subcommand !== 'show' && subcommand !== 'archive') {
        await logger.error(`Invalid subcommand: ${subcommand}. Use 'show' or 'archive'.`);
        process.exit(1);
      }

      // Validate plan ID is a number
      const planIdNum = parseInt(planId, 10);
      if (isNaN(planIdNum)) {
        await logger.error(`Invalid plan ID: ${planId}. Must be a number.`);
        process.exit(1);
      }

      // Route to appropriate handler (import from new plan.ts module)
      const result = subcommand === 'show'
        ? await showPlan(planIdNum)
        : await archivePlan(planIdNum);

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

### Key Implementation Details

1. **Import Statement**: Add at top of `src/cli.ts`:
   ```typescript
   import { showPlan, archivePlan } from './plan';
   ```

2. **Shorthand Handling**: The command signature `[subcommand] <plan-id>` means:
   - `plan 12` → subcommandOrId="12", maybePlanId=undefined
   - `plan show 12` → subcommandOrId="show", maybePlanId="12"

3. **Error Handling**: Follow existing pattern with try/catch and logger

4. **Return Type**: Handler functions should return `{ success: boolean; message?: string }`

</details>
