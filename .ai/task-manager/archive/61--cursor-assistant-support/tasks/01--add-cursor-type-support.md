---
id: 1
group: "type-system"
dependencies: []
status: "completed"
created: "2025-12-02"
skills:
  - typescript
---
# Add Cursor to Assistant Type

## Objective
Extend the TypeScript type system to include 'cursor' as a supported assistant, enabling type-safe handling of Cursor throughout the codebase.

## Skills Required
- TypeScript type definitions and union types

## Acceptance Criteria
- [ ] `Assistant` type in src/types.ts includes 'cursor'
- [ ] TypeScript compilation succeeds without errors
- [ ] Type safety is maintained for cursor throughout the codebase

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
Update the `Assistant` type union in `src/types.ts` to include `'cursor'` alongside existing assistants (claude, codex, gemini, github, opencode).

## Input Dependencies
None - this is the foundational change that other tasks will depend on.

## Output Artifacts
Updated `src/types.ts` with extended `Assistant` type definition.

## Implementation Notes

<details>
<summary>Click to expand detailed implementation instructions</summary>

1. Open `src/types.ts`
2. Locate the `Assistant` type definition (currently line 11)
3. Add `'cursor'` to the union type in alphabetical order after `'codex'` and before `'gemini'`
4. The updated type should be:
   ```typescript
   export type Assistant = 'claude' | 'codex' | 'cursor' | 'gemini' | 'github' | 'opencode';
   ```
5. Save the file
6. Run `npm run build` to verify TypeScript compilation succeeds

**Important**: This is a simple one-line change. Do not add any additional types, interfaces, or modifications beyond adding 'cursor' to the Assistant union type.
</details>
