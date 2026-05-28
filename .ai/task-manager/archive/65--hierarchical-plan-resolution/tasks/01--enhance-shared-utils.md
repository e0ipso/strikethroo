---
id: 1
group: "Core Infrastructure"
dependencies: []
status: "pending"
created: "2026-01-08"
skills: ["node-js-scripting", "file-system-operations"]
---

# Task 1: Enhance shared-utils.cjs with Configurable Root Discovery

## Objective

Update `shared-utils.cjs` to support configurable start paths for hierarchical root discovery and extract common plan-finding logic for reuse across scripts.

## Skills Required

- Node.js scripting (CommonJS modules)
- File system operations and path handling

## Acceptance Criteria

1. `findTaskManagerRoot()` function accepts optional `startPath` parameter (defaults to `process.cwd()`)
2. Function correctly traverses upward from the start path to find `.ai/task-manager`
3. Function returns `null` if no task manager root is found in the ancestry
4. Backward compatibility maintained - existing calls without arguments work identically
5. New functions extracted and exported:
   - `findPlanById(planId, taskManagerRoot)` - Find plan directory matching ID
   - `countTasks(planDir)` - Count task files in a plan
   - `checkBlueprintExists(planFile)` - Check for execution blueprint section
6. All functions are properly documented with JSDoc comments
7. Unit tests pass for all new functionality

## Technical Requirements

- File operations use Node.js `fs` and `path` modules
- No external dependencies introduced
- Functions follow existing code style and patterns
- Circular dependency issues avoided (shared-utils remains utility-focused)

## Input Dependencies

- Access to existing `/workspace/.ai/task-manager/config/scripts/shared-utils.cjs`
- Understanding of current function signatures in `validate-plan-blueprint.cjs` that need extraction

## Output Artifacts

- Updated `/workspace/.ai/task-manager/config/scripts/shared-utils.cjs` with:
  - Enhanced `findTaskManagerRoot(startPath?)` function
  - New `findPlanById(planId, taskManagerRoot)` function
  - New `countTasks(planDir)` function
  - New `checkBlueprintExists(planFile)` function

## Implementation Notes

- Start by examining `validate-plan-blueprint.cjs` to identify functions to extract
- Update `findTaskManagerRoot()` signature to `findTaskManagerRoot(startPath = process.cwd())`
- Maintain backward compatibility - do not change function call patterns for existing callers
- Export all new functions in the module.exports block
- Ensure error handling matches existing patterns (null returns vs throwing exceptions)
