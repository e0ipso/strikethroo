---
id: 2
group: "typescript-backend"
dependencies: [1]
status: "completed"
created: "2025-10-17"
skills: ["typescript"]
---

# Task 02: Update CLI plan show Command to Display approval_method

## Objective

Enhance the `plan show` CLI command to display the `approval_method` metadata field with appropriate formatting for auto, manual, and unset states.

## Skills Required

- `typescript`: TypeScript implementation with conditional display logic

## Acceptance Criteria

1. `plan show` command displays "Approval: auto" when `approval_method === 'auto'`
2. `plan show` command displays "Approval: manual" when `approval_method === 'manual'`
3. `plan show` command displays "Approval: unset" when `approval_method === undefined`
4. Display uses cyan bullet point format matching existing metadata lines
5. Display appears in Metadata section after the Summary line
6. All existing tests pass

## Technical Requirements

### Files to Modify

**src/plan.ts** (line ~100-106 in `showPlan()` function):
- Add new display line in the Metadata section
- Implement conditional logic for display value
- Use existing `chalk` formatting for consistency

### Implementation Pattern

```typescript
// In showPlan() function, after the Summary line
output += `  ${chalk.cyan('●')} Summary: ${planData.summary}\n`;
output += `  ${chalk.cyan('●')} Approval: ${planData.approval_method ?? 'unset'}\n`;  // NEW LINE
```

## Input Dependencies

- Task 01 completed (TypeScript types updated)
- `planData` object includes `approval_method` field
- Existing `chalk` library for terminal formatting

## Output Artifacts

- Updated `src/plan.ts` with approval method display
- Enhanced CLI output showing approval method metadata

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Locate the showPlan Function

1. Open `src/plan.ts`
2. Find the `showPlan()` function (starts around line 82)
3. Locate the Metadata section where metadata is displayed (around line 100-106)

### Step 2: Add Approval Method Display Line

1. Find the line: `output += \`  ${chalk.cyan('●')} Summary: ${planData.summary}\\n\`;`
2. Immediately after this line, add the new approval method line:
   ```typescript
   output += `  ${chalk.cyan('●')} Approval: ${planData.approval_method ?? 'unset'}\n`;
   ```
3. The `??` null coalescing operator handles undefined values elegantly

### Step 3: Verify Formatting Consistency

1. Ensure the new line uses the same indentation (2 spaces)
2. Uses `chalk.cyan('●')` bullet point like other metadata lines
3. Includes newline character `\n` at the end
4. Field name "Approval" follows title case like other fields

### Step 4: Test Display Logic

1. Build the project: `npm run build`
2. Test with a plan that has `approval_method: auto` in frontmatter
3. Test with a plan that has `approval_method: manual` in frontmatter
4. Test with an older plan that has no `approval_method` field (should show "unset")
5. Verify output formatting matches existing metadata lines

### Step 5: Run Tests

1. Run `npm test` to ensure no regressions
2. All existing tests should pass
3. The display change doesn't affect test behavior

</details>
