---
id: 1
group: "type-system"
dependencies: []
status: "completed"
created: 2025-10-31
skills:
  - typescript
---
# Add GitHub Assistant Type and Validation

## Objective
Add 'github' as a valid assistant type in the type system and validation functions to enable GitHub Copilot support in the CLI initialization process.

## Skills Required
- **typescript**: Type definitions and validation logic

## Acceptance Criteria
- [ ] `Assistant` type in `src/types.ts` includes `'github'`
- [ ] `parseAssistants()` validation array includes `'github'`
- [ ] `validateAssistants()` validation array includes `'github'`
- [ ] TypeScript compilation succeeds with no errors
- [ ] No breaking changes to existing assistant types

## Technical Requirements
- Modify `src/types.ts` to extend the `Assistant` union type
- Update `validAssistants` array in `src/utils.ts` at line 19 (parseAssistants function)
- Update `validAssistants` array in `src/utils.ts` at line 51 (validateAssistants function)
- Ensure consistency across all validation points

## Input Dependencies
None - this is a foundational change

## Output Artifacts
- Updated `src/types.ts` with extended Assistant type
- Updated `src/utils.ts` with GitHub in validation arrays

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Update Type Definition
File: `src/types.ts`

Locate the `Assistant` type definition and add `'github'` to the union:

```typescript
export type Assistant = 'claude' | 'gemini' | 'opencode' | 'github';
```

### Step 2: Update parseAssistants Validation
File: `src/utils.ts` (around line 19)

Add `'github'` to the `validAssistants` array in the `parseAssistants()` function:

```typescript
export function parseAssistants(value: string): Assistant[] {
  const validAssistants: Assistant[] = ['claude', 'gemini', 'opencode', 'github'];
  // ... rest of function
}
```

### Step 3: Update validateAssistants Validation
File: `src/utils.ts` (around line 51)

Add `'github'` to the `validAssistants` array in the `validateAssistants()` function:

```typescript
export function validateAssistants(assistants: Assistant[]): void {
  const validAssistants: Assistant[] = ['claude', 'gemini', 'opencode', 'github'];
  // ... rest of function
}
```

### Step 4: Verify TypeScript Compilation
```bash
npm run build
```

Ensure no type errors are introduced.

### Testing
After changes, verify:
- TypeScript compiles without errors
- Existing tests still pass: `npm test`
- The change is minimal and focused on type system only

</details>
