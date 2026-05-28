---
id: 1
group: "plan-management"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - typescript
  - filesystem
---
# Implement deletePlan Function

## Objective

Create a new `deletePlan` function in src/plan.ts that safely deletes plan directories from either active or archived locations with user confirmation.

## Skills Required

- **typescript**: Implementation in TypeScript following existing code patterns
- **filesystem**: Directory deletion using fs-extra library

## Acceptance Criteria

- [ ] Function `deletePlan(planId: number, autoConfirm: boolean = false)` is implemented
- [ ] Function locates plans in both plans/ and archive/ directories
- [ ] User confirmation prompt is displayed before deletion (unless autoConfirm is true)
- [ ] Entire plan directory is removed using fs-extra's `remove()` method
- [ ] Success/error messages are displayed using chalk library
- [ ] Function returns `{ success: boolean; message?: string }` result object
- [ ] Error handling covers: plan not found, user cancellation, filesystem errors

## Technical Requirements

- Use existing `findPlanById()` from src/plan-utils.ts to locate the plan
- Use `promptConfirmation()` helper (already exists in src/plan.ts) for user confirmation
- Use `fs.remove()` from fs-extra to delete the directory
- Use chalk for colored console output (yellow for warnings, green for success, red for errors)
- Follow the pattern established by `archivePlan()` function in the same file

## Input Dependencies

None - this is the first task and uses existing utilities.

## Output Artifacts

- New exported function `deletePlan` in src/plan.ts
- Function exported in src/plan.ts module exports

## Implementation Notes

<details>
<summary>Click to expand detailed implementation guidance</summary>

### Function Signature
```typescript
export async function deletePlan(
  planId: number,
  autoConfirm: boolean = false
): Promise<{ success: boolean; message?: string }>
```

### Implementation Steps

1. **Locate the plan**
   ```typescript
   const location = await findPlanById(planId);
   if (!location) {
     return {
       success: false,
       message: `Plan ${planId} not found. Check .ai/task-manager/plans/ and .ai/task-manager/archive/ directories.`,
     };
   }
   ```

2. **Prompt for confirmation** (unless autoConfirm is true)
   ```typescript
   if (!autoConfirm) {
     const planType = location.isArchived ? 'archived' : 'active';
     console.log(
       chalk.yellow(
         `\n⚠  Warning: This will permanently delete ${planType} plan ${planId} and all its tasks.\n`
       )
     );

     const confirmed = await promptConfirmation('Delete plan? (y/n): ');
     if (!confirmed) {
       return { success: false, message: 'Deletion cancelled by user.' };
     }
   }
   ```

3. **Delete the directory**
   ```typescript
   await fs.remove(location.directoryPath);
   ```

4. **Display success message**
   ```typescript
   console.log(
     chalk.green(
       `\n✓ Plan ${planId} successfully deleted.\n`
     )
   );

   return { success: true };
   ```

5. **Wrap in try-catch**
   ```typescript
   try {
     // ... implementation
   } catch (error) {
     const message = error instanceof Error ? error.message : String(error);
     return {
       success: false,
       message: `Failed to delete plan: ${message}`,
     };
   }
   ```

### Import Requirements
Add to existing imports at top of file:
```typescript
// fs-extra should already be imported as `import * as fs from 'fs-extra';`
// chalk should already be imported as `import chalk from 'chalk';`
// promptConfirmation already exists in the file
// findPlanById should already be imported from './plan-utils'
```

### Testing Locally
Before moving to integration tests, manually test:
```bash
npm run build
npm start plan delete <test-plan-id>
```

Test cases:
- Deleting an active plan
- Deleting an archived plan
- Cancelling deletion when prompted
- Attempting to delete non-existent plan

</details>
