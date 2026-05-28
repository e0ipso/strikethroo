---
id: 4
group: "core-logic"
dependencies: []
status: "completed"
created: "2025-09-01"
---

# Task 04: Add Path Resolution Helper to Utils

## Objective
Create a helper function in utils.ts to properly resolve paths relative to a base directory, ensuring cross-platform compatibility.

## Acceptance Criteria
- [x] Path resolution helper function created
- [x] Handles both relative and absolute paths correctly
- [x] Works across Windows and Unix systems
- [x] Integrates with existing utility functions

## Technical Requirements
- Edit `src/utils.ts`
- Create resolvePath helper function
- Use Node.js path module for cross-platform support
- Handle edge cases (null, undefined, empty strings)

## Input Dependencies
None - utility function can be created independently

## Output Artifacts
- Path resolution helper function for use in init command

## Implementation Notes
```typescript
export function resolvePath(baseDir: string | undefined, ...segments: string[]): string {
  const base = baseDir || '.';
  return path.resolve(base, ...segments);
}
```