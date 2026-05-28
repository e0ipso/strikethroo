---
id: 1
group: "utilities"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["typescript", "filesystem"]
---

# Task 001: Create Recursive Directory Copy Utility

## Objective
Create a utility function in `src/utils.ts` that recursively copies an entire directory structure while preserving the folder hierarchy and handling errors gracefully.

## Skills Required
TypeScript implementation and filesystem operations

## Acceptance Criteria
- [ ] Function `copyDirectoryRecursive(srcDir: string, destDir: string)` is implemented
- [ ] Function recursively copies all files and subdirectories
- [ ] Directory structure is preserved in the destination
- [ ] Proper error handling for file system operations
- [ ] Function uses existing utilities like `ensureDir` and `copyTemplate`

Use your internal TODO tool to track these and keep on track.

## Technical Requirements
- Add to `src/utils.ts` alongside existing file utilities
- Use async/await for all file operations
- Leverage existing `ensureDir()` and `copyTemplate()` functions
- Handle both files and directories in the traversal
- Use Node.js fs.promises API for consistency

## Input Dependencies
None - this is a new utility function

## Output Artifacts
- Exported `copyDirectoryRecursive` function available for use by other modules

## Implementation Notes
The function should:
1. Read the source directory contents
2. Create the destination directory if it doesn't exist
3. For each item in source:
   - If it's a file: copy it using existing `copyTemplate` function
   - If it's a directory: recursively call itself
4. Include proper error handling with descriptive FileSystemError exceptions