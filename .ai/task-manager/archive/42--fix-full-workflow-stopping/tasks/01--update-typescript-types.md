---
id: 1
group: "typescript-backend"
dependencies: []
status: "completed"
created: "2025-10-17"
skills: ["typescript"]
---

# Task 01: Update TypeScript Type Definitions for approval_method

## Objective

Add optional `approval_method` field to plan metadata interfaces and update parsing functions to extract this field from plan frontmatter.

## Skills Required

- `typescript`: TypeScript interface design and optional property handling

## Acceptance Criteria

1. `PlanMetadata` interface includes `approval_method?: string` field
2. `parsePlanFile()` extracts `approval_method` from frontmatter data
3. `loadPlanData()` includes `approval_method` in returned object
4. TypeScript compiles without errors
5. All existing tests pass

## Technical Requirements

### Files to Modify

1. **src/status.ts** (line ~22-30):
   - Add `approval_method?: string` to `PlanMetadata` interface

2. **src/status.ts** (line ~68-75):
   - Update `parsePlanFile()` function to extract `approval_method` from `data.approval_method`
   - Add to returned object: `approval_method: data.approval_method`

3. **src/plan-utils.ts** (line ~101-110):
   - Update `loadPlanData()` to include `approval_method: data.approval_method` in returned `PlanData` object

### Implementation Pattern

```typescript
// In PlanMetadata interface
export interface PlanMetadata {
  id: number;
  summary: string;
  created: string;
  approval_method?: string;  // NEW: Optional field
  isArchived: boolean;
  directoryPath: string;
  tasks: TaskMetadata[];
}

// In parsePlanFile()
return {
  id: data.id,
  summary: data.summary,
  created: data.created,
  approval_method: data.approval_method,  // NEW: Extract from frontmatter
  isArchived: planDir.includes('/archive/'),
  directoryPath: planDir,
  tasks: [],
};

// In loadPlanData()
return {
  id: data.id,
  summary: data.summary,
  created: data.created,
  approval_method: data.approval_method,  // NEW: Include in return
  isArchived: location.isArchived,
  directoryPath: location.directoryPath,
  tasks,
  bodyContent,
  executiveSummary,
};
```

## Input Dependencies

- Existing TypeScript codebase (src/status.ts, src/plan-utils.ts)
- gray-matter library for frontmatter parsing (already in use)

## Output Artifacts

- Updated TypeScript interfaces with optional `approval_method` field
- Modified parsing functions that extract and propagate the field
- Compiled JavaScript with no type errors

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Update PlanMetadata Interface (src/status.ts)

1. Open `src/status.ts`
2. Locate the `PlanMetadata` interface (around line 22-30)
3. Add `approval_method?: string;` field after the `created` field
4. Ensure proper TypeScript syntax with optional operator `?`

### Step 2: Update parsePlanFile Function (src/status.ts)

1. In the same file, locate `parsePlanFile()` function (around line 59-85)
2. Find the return statement that constructs the PlanMetadata object
3. Add `approval_method: data.approval_method,` to the returned object
4. Place it after `created: data.created,` for consistency

### Step 3: Update loadPlanData Function (src/plan-utils.ts)

1. Open `src/plan-utils.ts`
2. Locate `loadPlanData()` function (around line 91-111)
3. Find the return statement constructing the PlanData object
4. Add `approval_method: data.approval_method,` to the returned object
5. Place it after `created: data.created,` for consistency

### Step 4: Verify TypeScript Compilation

1. Run `npm run build` to compile TypeScript
2. Verify no type errors related to the new field
3. The optional field should not cause issues due to the `?` operator

### Step 5: Run Tests

1. Run `npm test` to ensure no regressions
2. All existing tests should pass since this is an optional field
3. No test modifications should be needed for this change

</details>
