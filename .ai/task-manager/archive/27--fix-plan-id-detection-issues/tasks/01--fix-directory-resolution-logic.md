---
id: 1
group: "directory-resolution"
dependencies: []
status: "completed"
created: "2025-09-26"
skills:
  - "nodejs"
---

# Fix Directory Resolution Logic

## Objective

Rewrite the `findTaskManagerRoot()` function in `get-next-plan-id.cjs` to correctly locate the `.ai/task-manager` directory based on the assistant's working directory context, resolving failures when multiple task manager directories exist in a repository.

## Skills Required

- **nodejs**: Core Node.js file system operations, path resolution, and directory traversal

## Acceptance Criteria

- [ ] `findTaskManagerRoot()` starts from actual current working directory instead of `process.cwd()`
- [ ] Function traverses only upward through parent directories until filesystem root
- [ ] Function stops at first `.ai/task-manager/plans` directory found in ancestry
- [ ] Function provides clear error messages when no valid task manager directory found
- [ ] Function handles edge cases like permission errors and symlinks gracefully
- [ ] Backward compatibility maintained with existing directory structures

## Technical Requirements

**Target File**: `templates/ai-task-manager/config/scripts/get-next-plan-id.cjs`
**Function to Modify**: `findTaskManagerRoot()` (lines 10-29)
**Core Logic**: Replace `process.cwd()` with proper working directory detection and implement ancestor-only traversal

The function must:
- Use Node.js `path` module for cross-platform path operations
- Use `fs.existsSync()` to check for `.ai/task-manager/plans` directory existence
- Implement upward traversal using `path.dirname()` until root reached
- Return absolute path to `.ai/task-manager` directory when found
- Return `null` and provide descriptive error when no directory found

## Input Dependencies

- Current `get-next-plan-id.cjs` script as starting point
- Understanding of existing directory structure patterns

## Output Artifacts

- Modified `findTaskManagerRoot()` function with correct directory resolution logic
- Function that reliably finds contextually relevant task manager directory
- Clear error handling for cases where no valid directory exists

## Implementation Notes

<details>
<summary>Detailed Implementation Guidelines</summary>

**Core Algorithm Change:**
```javascript
function findTaskManagerRoot() {
  // Start from actual working directory, not process.cwd()
  let currentPath = process.env.PWD || process.cwd();
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    const taskManagerPath = path.join(currentPath, '.ai', 'task-manager', 'plans');
    if (fs.existsSync(taskManagerPath)) {
      return path.join(currentPath, '.ai', 'task-manager');
    }
    currentPath = path.dirname(currentPath);
  }

  // Check root directory as final step
  const rootTaskManager = path.join(root, '.ai', 'task-manager', 'plans');
  if (fs.existsSync(rootTaskManager)) {
    return path.join(root, '.ai', 'task-manager');
  }

  return null;
}
```

**Error Handling Requirements:**
- When returning `null`, ensure calling code provides descriptive error message
- Consider edge cases: symlinks, permission errors, network drives
- Maintain cross-platform compatibility (Windows/Unix path differences)

**Validation Points:**
- Test with multiple `.ai` directories at different repository levels
- Verify function stops at first ancestor directory containing task manager
- Ensure function doesn't search siblings or descendant directories
</details>