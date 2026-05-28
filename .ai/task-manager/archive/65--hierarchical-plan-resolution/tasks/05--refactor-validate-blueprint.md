---
id: 5
group: "Code Cleanup"
dependencies: [1]
status: "pending"
created: "2026-01-08"
skills: ["node-js-scripting", "code-refactoring"]
---

# Task 5: Refactor validate-plan-blueprint.cjs to Use Shared Utilities

## Objective

Refactor `validate-plan-blueprint.cjs` to import and use shared utilities instead of local implementations, reducing code duplication and ensuring consistent behavior across scripts.

## Skills Required

- Node.js scripting (CommonJS modules)
- Code refactoring

## Acceptance Criteria

1. Script imports required functions from `shared-utils.cjs`:
   - `findPlanById`
   - `countTasks`
   - `checkBlueprintExists`
2. Local implementations of extracted functions are removed
3. Public interface unchanged - command-line arguments and output format remain identical
4. Backward compatibility maintained - all existing tests pass without modification
5. Code duplication eliminated while maintaining readability
6. Error handling remains consistent with original implementation

## Technical Requirements

- Use CommonJS require() to import from shared-utils.cjs
- Maintain relative path to shared-utils.cjs
- Keep the script's main logic flow unchanged
- Preserve all error messages and output formatting
- No external dependencies introduced

## Input Dependencies

- Task 1: Enhanced shared-utils.cjs with extracted functions (`findPlanById`, `countTasks`, `checkBlueprintExists`)

## Output Artifacts

- Refactored `/workspace/.ai/task-manager/config/scripts/validate-plan-blueprint.cjs`
- All local utility functions removed
- Imports from shared-utils.cjs
- Identical public interface

## Implementation Notes

- Examine current `validate-plan-blueprint.cjs` to identify functions to be replaced
- Replace function calls with shared utility versions
- Remove duplicate function definitions
- Verify path resolution for require() statement works correctly
- Run existing tests to ensure backward compatibility
- Check that error messages match original behavior
- Ensure code reads clearly even with imports from external utility module
