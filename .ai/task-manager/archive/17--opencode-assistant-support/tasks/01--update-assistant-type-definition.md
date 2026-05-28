---
id: 1
group: "type-system"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["typescript"]
---

# Update Assistant Type Definition

## Objective
Extend the `Assistant` type in `src/types.ts` to include `'opencode'` as a valid assistant option alongside `'claude'` and `'gemini'`.

## Skills Required
- **typescript**: Modify TypeScript type definitions and ensure proper type safety

## Acceptance Criteria
- [ ] `Assistant` type includes `'opencode'` as a valid union member
- [ ] Type definition maintains backward compatibility
- [ ] No TypeScript compilation errors after changes
- [ ] All existing assistant types (`'claude'`, `'gemini'`) remain functional

## Technical Requirements
- Locate the `Assistant` type definition in `src/types.ts`
- Update the type union to include `'opencode'`: `type Assistant = 'claude' | 'gemini' | 'opencode'`
- Ensure the change propagates correctly through TypeScript's type checking

## Input Dependencies
None - this is a foundational change needed before other components can recognize Open Code.

## Output Artifacts
- Updated `src/types.ts` with extended `Assistant` type
- TypeScript compilation passing with new type definition

## Implementation Notes
This is a straightforward type system extension. The existing `Assistant` type is likely defined as a string union type that needs to include the new `'opencode'` option. Verify that no other type definitions or interfaces depend on the specific assistant values and might need corresponding updates.
