---
id: 3
group: "Plan Resolution Engine"
dependencies: [1, 2]
status: "pending"
created: "2026-01-08"
skills: ["node-js-scripting", "file-system-operations"]
---

# Task 3: Create resolve-plan.cjs Script with Hierarchical Resolution

## Objective

Create `resolve-plan.cjs` with comprehensive plan resolution supporting both absolute paths and numeric IDs, with XML output format.

## Skills Required

- Node.js scripting (CommonJS modules)
- File system operations and path handling

## Acceptance Criteria

1. Accepts single argument: plan ID (numeric) or absolute path (starts with `/`)
2. Path validation branch:
   - Verifies file exists on disk
   - Parses and validates frontmatter (must have `id` and `created` fields)
   - Derives task manager root from path ancestry
   - Returns XML with plan metadata
3. Hierarchical ID search branch:
   - Finds closest task manager root from CWD
   - Searches `plans/` and `archive/` directories
   - Applies "first match wins" semantics (stops at first match)
   - Reports conflicts if multiple matches in different roots
   - Continues searching in parent task manager roots if not found
4. XML output format matches specification:
   - Success: `<plans><plan task-manager="/abs/path"><id>N</id><file>/path</file></plan></plans>`
   - Error: `<error><message>description</message></error>`
   - Conflict: Multiple `<plan>` elements in `<conflict>` wrapper
5. Exits with code 0 on success, 1 on error
6. Error messages to stderr
7. Comprehensive error handling for all branches

## Technical Requirements

- Uses `shared-utils.cjs` functions: `findTaskManagerRoot()`, `findPlanById()`, `extractIdFromFrontmatter()`
- Simple string-based XML generation (no external XML library)
- Proper path handling with Node.js `path` module
- Frontmatter parsing using existing utility
- Clear separation between path validation and ID search logic

## Input Dependencies

- Task 1: Enhanced shared-utils.cjs with utility functions
- Task 2: find-root.cjs (optional reference, not dependency)

## Output Artifacts

- New `/workspace/.ai/task-manager/config/scripts/resolve-plan.cjs` script
- Implements both path validation and hierarchical ID search
- Proper error and conflict reporting in XML format

## Implementation Notes

- Read plan argument from `process.argv[2]`
- Distinguish between absolute path (starts with `/`) and numeric ID
- Path validation: check file exists, parse frontmatter, find `.ai/task-manager` in ancestry
- ID search: find closest root, search plans/ and archive/, report conflicts, continue up tree
- XML output should be on single line for easy parsing
- Test with deeply nested directory structures
- Test conflict scenarios with multiple task manager roots
- Verify backward compatibility with existing plan resolution expectations
