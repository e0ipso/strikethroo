---
id: 2
group: "Core Infrastructure"
dependencies: [1]
status: "pending"
created: "2026-01-08"
skills: ["node-js-scripting"]
---

# Task 2: Create find-root.cjs Script for Deterministic Root Discovery

## Objective

Create a standalone `find-root.cjs` script that command templates can invoke to get the absolute path of the closest task manager root.

## Skills Required

- Node.js scripting (CommonJS modules)

## Acceptance Criteria

1. Script outputs absolute path to nearest `.ai/task-manager` directory
2. Exits with code 0 on success
3. Exits with code 1 if no task manager found
4. Outputs nothing on failure (stderr for error messages only)
5. Uses `findTaskManagerRoot()` from updated `shared-utils.cjs`
6. Handles edge cases (no args, invalid args gracefully)
7. Script is executable and runs directly with `node find-root.cjs`

## Technical Requirements

- Single purpose: find and output root path
- Uses `shared-utils.cjs` for the core logic
- Clear error messages to stderr for debugging
- Proper exit codes for shell script integration
- No external dependencies

## Input Dependencies

- Task 1 must be completed (enhanced shared-utils.cjs with `findTaskManagerRoot()`)

## Output Artifacts

- New `/workspace/.ai/task-manager/config/scripts/find-root.cjs` script
- Script properly exports nothing, operates as executable CLI tool
- Error handling redirects messages to stderr

## Implementation Notes

- Require the updated shared-utils.cjs
- Call `findTaskManagerRoot()` without arguments (uses current CWD)
- Output full path to stdout if found
- Output error message to stderr and exit(1) if not found
- Keep the implementation minimal and focused
- Test manually with nested directory structures
