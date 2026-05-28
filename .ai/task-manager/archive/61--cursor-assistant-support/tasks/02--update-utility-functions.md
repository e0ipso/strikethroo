---
id: 2
group: "utility-updates"
dependencies: [1]
status: "completed"
created: "2025-12-02"
skills:
  - typescript
---
# Update Utility Functions for Cursor Support

## Objective
Update validation and format detection utility functions to recognize and handle the Cursor assistant.

## Skills Required
- TypeScript for updating utility functions

## Acceptance Criteria
- [ ] `parseAssistants()` accepts 'cursor' as valid input
- [ ] `validateAssistants()` recognizes 'cursor' as valid
- [ ] `getTemplateFormat()` returns 'md' for Cursor
- [ ] All existing tests pass
- [ ] TypeScript compilation succeeds

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
Modify three functions in `src/utils.ts`:
1. `parseAssistants()` - Add 'cursor' to validAssistants array
2. `validateAssistants()` - Add 'cursor' to validAssistants array
3. `getTemplateFormat()` - Return 'md' for Cursor (same as Claude, Codex, GitHub, OpenCode)

## Input Dependencies
Requires Task 1 (type system update) to be completed for TypeScript type safety.

## Output Artifacts
Updated `src/utils.ts` with Cursor support in validation and format detection functions.

## Implementation Notes

<details>
<summary>Click to expand detailed implementation instructions</summary>

**Step 1: Update parseAssistants() function**
1. Open `src/utils.ts`
2. Locate the `parseAssistants()` function (around line 18)
3. Find the `validAssistants` array declaration (line 19)
4. Add `'cursor'` to the array in alphabetical order: `['claude', 'codex', 'cursor', 'gemini', 'github', 'opencode']`

**Step 2: Update validateAssistants() function**
1. In the same file, locate the `validateAssistants()` function (around line 50)
2. Find the `validAssistants` array declaration (line 51)
3. Add `'cursor'` to the array in the same alphabetical order: `['claude', 'codex', 'cursor', 'gemini', 'github', 'opencode']`

**Step 3: Update getTemplateFormat() function**
1. Locate the `getTemplateFormat()` function (around line 71)
2. This function already has a switch statement and default case
3. Cursor uses Markdown format like Claude, so no explicit case is needed
4. However, for clarity and consistency, you can add a case:
   ```typescript
   case 'cursor':
     return 'md';
   ```
   Add this case after the `'codex'` case (around line 76)

**Step 4: Verify changes**
1. Run `npm run build` to ensure TypeScript compilation succeeds
2. Run `npm test` to verify existing tests still pass
3. The changes should not break any existing functionality

**Important**: These are simple array and switch statement updates. Do not modify function signatures, add new functions, or change existing logic beyond adding 'cursor' support.
</details>
